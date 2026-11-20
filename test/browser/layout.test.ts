// The page-layout sheet the foundation adds, from the package's dist/, on
// test/fixtures/layout.html: the full page entry, glyph-button.css and layout.css linked after it,
// and the case from support/layout.js, measured under each page type at 1280px and at 390px with
// the reader's text at 200%. The application page fills the dynamic viewport exactly, the header
// over main, main taking the rest, a gutter of --page-gutter at the inline sides and the block
// end; main's children sit on its content lines, at most 80ch and centered, and a child the page
// places on full spans main between the gutters. The reading page is an 80ch column centered in
// the gutters, its sections --space-xl apart and --space-2xl below it. In both the header's
// actions sit at its inline end, and at 390px and 200% text they wrap rather than scroll the page
// sideways. Where a phone's bars make the small viewport shorter, through the protocol, the
// application page is the dynamic viewport tall. The geometry holds in every space and type
// profile; dropping any one declaration of the sheet changes it in one of the three states; a
// page's own later layer wins. The sheet lays out
// the body, so no shadow root adopts it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

/** The repository root, which the server serves. */
const root = join(import.meta.dirname, "../..");
const fixture = "/test/fixtures/layout.html";

/** The browser's default text sizes, the standard and the monospace, in px; doubled, a reader's
 * 200% text. */
const TEXT = { standard: 16, fixed: 13 };

const SPACES = ["regular", "compact"];
const TYPES = ["mono", "sans"];

/** A box in the viewport, in px. */
interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
/** support/layout.js's page(): one page type's geometry. */
interface Laid {
  viewport: { width: number; height: number };
  scroll: { width: number; height: number };
  body: Box;
  header: Box;
  title: Box;
  actions: Box;
  buttons: Box[];
  main: Box;
  heading: Box;
  lede: Box;
  sections: Box[];
  full: Box;
}
/** support/layout.js's measure(). */
interface Measured {
  tokens: {
    m: number;
    s: number;
    "2xs": number;
    xl: number;
    "2xl": number;
    ch80: number;
    dvh: number;
  };
  "page-app": Laid;
  "page-prose": Laid;
}
/** One declaration support/layout.js's drops() dropped. */
interface Drop {
  selector: string;
  declaration: string;
  differs: boolean;
}

/** The in-page module, imported as m. */
const WITH_MODULE = (body: string) =>
  `import("/test/browser/support/layout.js").then(async (m) => ${body})`;

/** Lays the page out at the width, its height the tooling's 720, with the reader's text at the
 * scale of the browser's default sizes. */
async function view(page: Page, width: number, scale: number) {
  await page.cdp("Emulation.setDeviceMetricsOverride", {
    width,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.cdp("Page.setFontSizes", {
    fontSizes: { standard: TEXT.standard * scale, fixed: TEXT.fixed * scale },
  });
}
const wide = (page: Page) => view(page, 1280, 1);
/** How much shorter the small viewport is than the large one, as a phone's retracting bars make
 * it, set through the protocol; 0, the desktop's, by default. */
const bars = (page: Page, difference: number) =>
  page.cdp("Emulation.setSmallViewportHeightDifferenceOverride", { difference });
/** The difference the bars case sets, in px. */
const BARS = 100;
const narrow = (page: Page) => view(page, 390, 2);

const center = (box: Box) => (box.top + box.bottom) / 2;

/** Asserts the box spans exactly main's content lines: as wide as main up to 80ch, centered. */
function onContent(laid: Laid, box: Box, ch80: number, name: string) {
  const width = Math.min(ch80, laid.main.right - laid.main.left);
  assert.equal(box.right - box.left, width, `${name} isn't the content's width`);
  assert.equal(box.left - laid.main.left, laid.main.right - box.right, `${name} isn't centered`);
}

/** Asserts the header's row: the name at the inline start and the actions at the end, in the
 * gutters, every line of buttons ending at the actions' end, none past it. */
function headerRow(laid: Laid, gutter: number) {
  const end = laid.viewport.width - gutter;
  assert.deepEqual([laid.header.left, laid.header.right], [gutter, end], "the header's gutters");
  assert.equal(laid.title.left, gutter, "the name isn't at the inline start");
  assert.equal(laid.actions.right, end, "the actions aren't at the inline end");
  const lines = new Map<number, number>();
  for (const button of laid.buttons) {
    assert.ok(button.left >= gutter && button.right <= end, "a button is out of the gutters");
    lines.set(center(button), Math.max(lines.get(center(button)) ?? 0, button.right));
  }
  for (const right of lines.values()) assert.equal(right, end, "a line doesn't keep the end");
  return lines.size;
}

describe("foundation page layout", () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  /** The case at 1280px, and at 390px with 200% text. */
  let atWide: Measured;
  let atNarrow: Measured;
  /** The case at 1280px, its small viewport BARS shorter than its dynamic one. */
  let atBars: Measured;

  const measure = (): Promise<Measured> => page.evaluate(WITH_MODULE(`m.measure()`));

  before(async () => {
    server = await serve({ root });
    browser = await launch();
    page = await browser.open(`${server.origin}${fixture}`);
    await page.evaluate(WITH_MODULE(`m.fill()`));
    await narrow(page);
    atNarrow = await measure();
    await wide(page);
    await bars(page, BARS);
    atBars = await measure();
    await bars(page, 0);
    atWide = await measure();
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  test("the sheet is one block in its own layer, and imports nothing", () => {
    const text = readFileSync(join(root, "dist/layout.css"), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    assert.doesNotMatch(text, /@import/);
    assert.deepEqual(
      [...text.matchAll(/@layer\s+([^{;]+)/g)].map((m) => m[1].trim()),
      ["foundation.layout"],
    );
  });

  test("the application page fills the dynamic viewport exactly: the header, then main to a gutter above the foot", () => {
    const { tokens } = atWide;
    const app = atWide["page-app"];
    assert.equal(tokens.dvh, app.viewport.height);
    assert.deepEqual(app.scroll, app.viewport, "the page scrolls");
    assert.deepEqual([app.body.top, app.body.bottom], [0, app.viewport.height]);
    assert.equal(app.header.top, 0);
    assert.equal(app.main.top, app.header.bottom, "main doesn't start under the header");
    assert.equal(app.main.bottom, app.viewport.height - tokens.m, "main doesn't take the rest");
    assert.equal(app.heading.top, app.main.top, "main's rows don't pack at the top");
  });

  test("where the small viewport is shorter, the application page is the dynamic viewport tall", () => {
    const { tokens } = atBars;
    const app = atBars["page-app"];
    assert.equal(tokens.dvh, app.viewport.height + BARS, "the emulated bars took no effect");
    assert.equal(app.body.bottom, tokens.dvh, "the body isn't 100dvh tall");
    assert.equal(app.main.bottom, tokens.dvh - tokens.m, "main doesn't take the rest");
  });

  for (const [at, measured] of [
    ["1280px", () => atWide],
    ["390px with 200% text", () => atNarrow],
  ] as const) {
    test(`at ${at}, the application page's gutters are --page-gutter, --space-m, at the inline sides`, () => {
      const { tokens, "page-app": app } = measured();
      assert.deepEqual([app.main.left, app.viewport.width - app.main.right], [tokens.m, tokens.m]);
      assert.deepEqual(app.scroll.width, app.viewport.width, "the page scrolls sideways");
    });

    test(`at ${at}, main's children sit on its content lines, at most 80ch and centered; full spans main`, () => {
      const { tokens, "page-app": app } = measured();
      for (const [name, box] of [
        ["the heading", app.heading],
        ["the lede", app.lede],
        ...app.sections.map((section, i) => [`section ${i + 1}`, section] as const),
      ] as const) {
        onContent(app, box, tokens.ch80, name);
      }
      assert.deepEqual([app.full.left, app.full.right], [app.main.left, app.main.right]);
    });

    test(`at ${at}, the reading page is an 80ch column centered in the gutters`, () => {
      const { tokens, "page-prose": prose } = measured();
      const width = Math.min(tokens.ch80, prose.viewport.width - 2 * tokens.m);
      assert.equal(prose.main.right - prose.main.left, width);
      assert.equal(prose.main.left, prose.viewport.width - prose.main.right, "not centered");
      assert.deepEqual(prose.scroll.width, prose.viewport.width, "the page scrolls sideways");
      for (const box of [prose.heading, prose.lede, prose.full, ...prose.sections]) {
        assert.deepEqual([box.left, box.right], [prose.main.left, prose.main.right]);
      }
    });

    test(`at ${at}, the reading page's sections are --space-xl apart, with --space-2xl below main`, () => {
      const { tokens, "page-prose": prose } = measured();
      const [one, two] = prose.sections;
      assert.equal(one.top - prose.lede.bottom, tokens.xl);
      assert.equal(two.top - one.bottom, tokens.xl);
      assert.equal(prose.main.bottom - prose.full.bottom, tokens["2xl"]);
    });
  }

  test("at 1280px, each page's header is one row: the name at the start, the actions at the end, centers aligned", () => {
    const { tokens } = atWide;
    for (const type of ["page-app", "page-prose"] as const) {
      const laid = atWide[type];
      assert.equal(headerRow(laid, tokens.m), 1, `${type}: the buttons wrap`);
      assert.equal(center(laid.actions), center(laid.title), `${type}: the centers differ`);
      assert.deepEqual(
        [laid.title.top - laid.header.top, laid.header.bottom - laid.title.bottom].map(
          (space) => space >= tokens.s,
        ),
        [true, true],
        `${type}: the row has less than --space-s above or below`,
      );
    }
  });

  test("at 390px with 200% text, each page's actions take a line of their own and wrap, and nothing scrolls sideways", () => {
    const { tokens } = atNarrow;
    for (const type of ["page-app", "page-prose"] as const) {
      const laid = atNarrow[type];
      assert.equal(laid.scroll.width, laid.viewport.width, `${type}: the page scrolls sideways`);
      assert.ok(headerRow(laid, tokens.m) > 1, `${type}: the actions don't wrap`);
      assert.equal(laid.actions.top - laid.title.bottom, tokens["2xs"], `${type}: the row gap`);
    }
  });

  for (const space of SPACES) {
    for (const type of TYPES) {
      test(`${space} ${type}: the gutters are that profile's --space-m, the content 80ch, the screen filled`, async () => {
        await page.evaluate(`(() => {
          document.documentElement.dataset.space = "${space}";
          document.documentElement.dataset.type = "${type}";
        })()`);
        const { tokens, "page-app": app, "page-prose": prose } = await measure();
        await page.evaluate(`(() => {
          delete document.documentElement.dataset.space;
          delete document.documentElement.dataset.type;
        })()`);
        assert.deepEqual([app.main.left, prose.header.left], [tokens.m, tokens.m]);
        assert.equal(app.main.bottom, app.viewport.height - tokens.m);
        onContent(app, app.lede, tokens.ch80, "the lede");
        assert.equal(prose.main.right - prose.main.left, tokens.ch80);
      });
    }
  }

  test("every declaration of the sheet, dropped, changes the layout at 1280px, at 390px with 200% text, or with bars", async () => {
    await narrow(page);
    const narrowDrops: Drop[] = await page.evaluate(
      WITH_MODULE(`m.drops(${JSON.stringify(atNarrow)})`),
    );
    await wide(page);
    await bars(page, BARS);
    const barsDrops: Drop[] = await page.evaluate(
      WITH_MODULE(`m.drops(${JSON.stringify(atBars)})`),
    );
    await bars(page, 0);
    const wideDrops: Drop[] = await page.evaluate(
      WITH_MODULE(`m.drops(${JSON.stringify(atWide)})`),
    );
    assert.ok(wideDrops.length > 0, "no declaration tried");
    const missed = wideDrops
      .filter(({ differs }, i) => !differs && !narrowDrops[i].differs && !barsDrops[i].differs)
      .map(({ selector, declaration }) => `${selector} { ${declaration} }`);
    assert.deepEqual(missed, []);
  });

  test("a page's own later layer wins: its --page-gutter spaces the gutters", async () => {
    const { tokens, "page-app": app } = await page.evaluate(
      WITH_MODULE(`(() => {
        document.body.classList.add("app-gutter");
        const out = m.measure();
        document.body.classList.remove("app-gutter");
        return out;
      })()`),
    );
    assert.deepEqual(
      [app.main.left, app.viewport.height - app.main.bottom],
      [tokens.xl, tokens.xl],
    );
  });
});
