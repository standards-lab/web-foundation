import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { launch, until } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

import { SHEETS } from "./support/dialogs.js";

const root = join(import.meta.dirname, "../..");
const fixture = "/test/fixtures/dialogs.html";

const TARGET = 24;
const CAP = 56 * 16;
const NARROWEST = 320;

const PALETTES = ["zen", "github", "catppuccin", "everforest"];
const SCHEMES = ["light", "dark"];
const SPACES = ["regular", "compact"];
const TYPES = ["mono", "sans"];

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
interface Row {
  display: string;
  align: string;
  gap: string;
  padding: string[];
  size: { width: number; height: number };
  fontSize: string;
  glyph: Box;
  key: Box | null;
  centers: number;
  surface: string;
}
interface Hint {
  box: Box;
  below: boolean;
  above: boolean;
  overlaps: boolean;
  gap: number;
  padding: string[];
  border: string;
  right: number;
  fill: string;
  color: string;
  font: string[];
  lines: number;
}
interface Dialog {
  width: number;
  content: number;
  viewport: number;
  header: Box;
  heading: Box;
  close: Box;
  centers: number;
  below: number;
  margins: string[];
  focus: string | null;
  outline: [boolean, string];
  display: string;
}
interface Measured {
  tokens: {
    "3xs": string;
    "2xs": string;
    m: string;
    s: string;
    fg: string;
    bg: string;
    font: string[];
  };
  help: Row;
  settings: Row;
  copy: Row;
  plain: string;
  helpHint: Hint;
  footHint: Hint;
  endHint: Hint & { viewport: number };
  dialogs: Record<"help" | "settings" | "long", Dialog>;
}
interface Drop {
  sheet: string;
  selector: string;
  declaration: string;
  differs: boolean;
}

const WITH_MODULE = (body: string) =>
  `import("/test/browser/support/dialogs.js").then(async (m) => ${body})`;

const FILL = WITH_MODULE(`{ document.querySelector("#light").innerHTML = m.MARKUP; }`);

const width = (page: Page, inline: number) =>
  page.cdp("Emulation.setDeviceMetricsOverride", {
    width: inline,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false,
  });

const center = (page: Page, element: string): Promise<{ x: number; y: number }> =>
  page.evaluate(`(() => {
    const { left, top, width, height } = (${element}).getBoundingClientRect();
    return { x: left + width / 2, y: top + height / 2 };
  })()`);

const hover = async (page: Page, element: string) =>
  page.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", ...(await center(page, element)) });

const pointAway = (page: Page) =>
  page.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });

async function click(page: Page, element: string) {
  const at = await center(page, element);
  await page.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", ...at });
  for (const type of ["mousePressed", "mouseReleased"]) {
    await page.cdp("Input.dispatchMouseEvent", { type, ...at, button: "left", clickCount: 1 });
  }
}

async function press(page: Page, key: "Tab" | "Enter" | "Escape") {
  const keyCode = { Tab: 9, Enter: 13, Escape: 27 }[key];
  const event = { key, code: key, windowsVirtualKeyCode: keyCode };
  const text = key === "Enter" ? { text: "\r" } : {};
  await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...event, ...text });
  await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...event });
}

const button = (part: string) => `document.querySelector('#light [data-part="${part}"]')`;
const hintOpen = (part: string) => `${button(part)}.interestForElement.matches(":popover-open")`;
const hintPlace = (part: string) => `(() => {
  const b = ${button(part)}.getBoundingClientRect();
  const h = ${button(part)}.interestForElement.getBoundingClientRect();
  return { below: h.top >= b.bottom, above: h.bottom <= b.top, overlaps: h.left < b.right && h.right > b.left };
})()`;
const dialogOpen = (id: string) => `document.querySelector("#light #${id}").open`;

describe("foundation glyph button and dialogs", () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  let live: Page;
  let light: Measured;
  let shadow: Measured;

  const measureBoth = (): Promise<{ light: Measured; shadow: Measured }> =>
    page.evaluate(
      WITH_MODULE(`({
        light: m.measure(document),
        shadow: m.measure(document.querySelector("#shadow-host").shadowRoot),
      })`),
    );

  before(async () => {
    server = await serve({ root });
    browser = await launch();
    page = await browser.open(`${server.origin}${fixture}`);
    await page.evaluate(FILL);
    await page.evaluate(WITH_MODULE(`m.shadow("/dist").then(() => undefined)`));
    ({ light, shadow } = await measureBoth());
    live = await browser.open(`${server.origin}${fixture}`);
    await live.evaluate(FILL);
  });

  const fresh = async () => {
    await live.goto(`${server.origin}${fixture}`);
    await live.evaluate(FILL);
  };
  after(async () => {
    await live?.close();
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  test("a shadow root that adopts the sheets alone lays out every case as the page does", () => {
    assert.deepEqual(shadow, light);
  });

  test("each sheet is one block in its own layer, and imports nothing", () => {
    for (const [sheet, layer] of [
      ["glyph-button.css", "foundation.glyph"],
      ["dialog.css", "foundation.dialog"],
    ]) {
      const text = readFileSync(join(root, "dist", sheet), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      assert.doesNotMatch(text, /@import/, `${sheet} imports`);
      assert.deepEqual(
        [...text.matchAll(/@layer\s+([^{;]+)/g)].map((m) => m[1].trim()),
        [layer],
        `${sheet}'s layers`,
      );
    }
  });

  test(".glyph-button lays out its glyph and key hint as one centered row", () => {
    const { tokens } = light;
    for (const name of ["help", "settings", "copy"] as const) {
      const row = light[name];
      assert.equal(row.display, "inline-flex", `${name}: a row`);
      assert.equal(row.align, "center", `${name}: centered`);
      assert.deepEqual(row.padding, [tokens["3xs"], tokens["3xs"], tokens["2xs"], tokens["2xs"]]);
      assert.equal(row.gap, tokens["3xs"], `${name}: --space-3xs between the glyph and its hint`);
      assert.deepEqual(
        [`${row.glyph.width}px`, `${row.glyph.height}px`],
        [row.fontSize, row.fontSize],
      );
    }
    for (const name of ["help", "settings"] as const) {
      const { glyph, key, centers } = light[name];
      assert.ok(key !== null && key.left >= glyph.left + glyph.width, `${name}: the hint follows`);
      assert.equal(key.top < glyph.top + glyph.height && glyph.top < key.top + key.height, true);
      assert.equal(centers, 0, `${name}: the glyph and its hint share a center`);
    }
  });

  test(".glyph-button keeps the native button's border, radius, surface and color", () => {
    for (const name of ["help", "settings", "copy"] as const) {
      assert.equal(light[name].surface, light.plain, name);
    }
  });

  for (const space of SPACES) {
    for (const type of TYPES) {
      test(`${space} ${type} on the narrowest display: the glyph alone is at least ${TARGET}x${TARGET}`, async () => {
        await width(page, NARROWEST);
        const size: { width: number; height: number } = await page.evaluate(`(() => {
          const root = document.documentElement;
          root.dataset.space = "${space}";
          root.dataset.type = "${type}";
          const { width, height } = ${button("copy")}.getBoundingClientRect();
          delete root.dataset.space;
          delete root.dataset.type;
          return { width, height };
        })()`);
        await width(page, 1280);
        assert.ok(
          size.width >= TARGET && size.height >= TARGET,
          `${size.width}x${size.height} is under ${TARGET}x${TARGET}`,
        );
      });
    }
  }

  test(".glyph-hint sits below its button, centered on it, inside the viewport at its end", () => {
    const { helpHint, endHint, tokens } = light;
    assert.deepEqual([helpHint.below, helpHint.overlaps], [true, true]);
    assert.equal(`${helpHint.gap}px`, tokens["3xs"]);
    assert.equal(
      helpHint.box.left + helpHint.box.width / 2,
      light.help.size.width / 2,
      "the hint isn't centered on its button",
    );
    assert.deepEqual([endHint.below, endHint.overlaps], [true, true]);
    assert.ok(endHint.right <= endHint.viewport, "the hint at the end runs past the viewport");
    assert.equal(endHint.lines, 1);
  });

  test(".glyph-hint flips above its button where the viewport's foot would cut it", () => {
    const { footHint, tokens } = light;
    assert.deepEqual([footHint.above, footHint.overlaps], [true, true]);
    assert.equal(`${footHint.gap}px`, tokens["3xs"]);
  });

  test(".glyph-hint is the small interface type, unbordered, with --space-3xs and --space-2xs inside", () => {
    const { helpHint, tokens } = light;
    assert.deepEqual(helpHint.font, tokens.font);
    assert.equal(helpHint.border, "none");
    assert.deepEqual(helpHint.padding, [tokens["3xs"], tokens["2xs"]]);
  });

  for (const palette of PALETTES) {
    for (const scheme of SCHEMES) {
      test(`${palette} ${scheme}: .glyph-hint paints reversed, --fg its fill and --bg its text`, async () => {
        const read: Record<string, string> = await page.evaluate(`(() => {
          const root = document.documentElement;
          root.dataset.palette = "${palette}";
          root.dataset.scheme = "${scheme}";
          const hint = getComputedStyle(${button("help")}.interestForElement);
          const probe = getComputedStyle(document.querySelector('#light [data-part="probe"]'));
          const out = { fill: hint.backgroundColor, color: hint.color, fg: probe.color, bg: probe.backgroundColor };
          delete root.dataset.palette;
          delete root.dataset.scheme;
          return out;
        })()`);
        assert.deepEqual({ fill: read.fill, color: read.color }, { fill: read.fg, color: read.bg });
        assert.notEqual(read.fill, read.color);
      });
    }
  }

  test("the hint shows on hover, and hides once the pointer leaves", async () => {
    await hover(live, button("help"));
    await until(live, hintOpen("help"));
    assert.deepEqual(await live.evaluate(hintPlace("help")), {
      below: true,
      above: false,
      overlaps: true,
    });
    await pointAway(live);
    await until(live, `!${hintOpen("help")}`);
  });

  test("hovered at the viewport's foot, the hint shows above its button", async () => {
    await hover(live, button("foot"));
    await until(live, hintOpen("foot"));
    assert.deepEqual(await live.evaluate(hintPlace("foot")), {
      below: false,
      above: true,
      overlaps: true,
    });
    await pointAway(live);
    await until(live, `!${hintOpen("foot")}`);
  });

  test("the hint shows on keyboard focus, and Escape dismisses it without opening anything", async () => {
    await fresh();
    await press(live, "Tab");
    assert.equal(await live.evaluate(`document.activeElement.dataset.part`), "help");
    await until(live, hintOpen("help"));
    assert.equal((await live.evaluate(hintPlace("help"))).below, true);
    await press(live, "Escape");
    await until(live, `!${hintOpen("help")}`);
    assert.equal(await live.evaluate(dialogOpen("help")), false);
    assert.equal(await live.evaluate(`document.activeElement.dataset.part`), "help");
  });

  test(".dialog-header: the heading at the inline start, Close at the end, centers aligned, --space-m below", () => {
    for (const name of ["help", "settings", "long"] as const) {
      const d = light.dialogs[name];
      assert.equal(d.display, "flex");
      assert.equal(d.heading.left, 0, `${name}: the heading isn't at the start`);
      assert.equal(d.close.left + d.close.width, d.header.width, `${name}: Close isn't at the end`);
      assert.equal(d.centers, 0, `${name}: the heading and Close don't share a center`);
      assert.equal(`${d.below}px`, light.tokens.m, `${name}: not --space-m below the row`);
      assert.deepEqual(d.margins, ["0px", "0px"], `${name}: the heading keeps a margin`);
    }
  });

  test(".dialog-header wraps a long heading, keeping Close's width and --space-s beside it", () => {
    const { long, settings } = light.dialogs;
    assert.ok(long.heading.height > settings.heading.height, "the long heading didn't wrap");
    assert.equal(long.close.width, settings.close.width, "Close shrank");
    assert.equal(`${long.close.left - long.heading.width}px`, light.tokens.s);
  });

  test("a heading script focuses as its dialog opens draws no outline, where Close would", () => {
    const { help, settings } = light.dialogs;
    assert.deepEqual([help.focus, help.outline], ["heading", [true, "none"]]);
    assert.deepEqual([settings.focus, settings.outline], ["settings-close", [true, "solid"]]);
  });

  test("opened from the keyboard, the heading is focused, focus-visible, and outlined not at all", async () => {
    await fresh();
    await press(live, "Tab");
    await press(live, "Enter");
    await until(live, dialogOpen("help"));
    const focused = await live.evaluate(`(() => {
      const element = document.activeElement;
      return [element.dataset.part, element.matches(":focus-visible"), getComputedStyle(element).outlineStyle];
    })()`);
    assert.deepEqual(focused, ["heading", true, "none"]);
    await press(live, "Escape");
    await until(live, `!${dialogOpen("help")}`);
  });

  for (const inline of [390, 1280]) {
    test(`at ${inline}px, .dialog-wide fills the cap, .dialog-fit hugs its content up to it, and no dialog is wider than the viewport`, async () => {
      await width(page, inline);
      const both = await measureBoth();
      await width(page, 1280);
      assert.deepEqual(both.shadow.dialogs, both.light.dialogs);
      const { dialogs, tokens } = both.light;
      const cap = Math.min(inline - 2 * parseFloat(tokens.s), CAP);
      for (const [name, d] of Object.entries(dialogs)) {
        assert.equal(d.viewport, inline);
        assert.ok(d.width <= inline, `${name}: ${d.width}px is wider than the viewport`);
      }
      const near = (a: number, b: number) => Math.abs(a - b) < 1 / 64;
      assert.ok(
        near(dialogs.settings.width, cap),
        `the wide dialog, ${dialogs.settings.width}px, isn't the cap`,
      );
      assert.ok(
        near(dialogs.long.width, cap),
        `the fitted dialog, ${dialogs.long.width}px, isn't the cap`,
      );
      assert.ok(dialogs.long.content > dialogs.long.header.width, "the long line fits");
      const help = dialogs.help;
      if (inline === 1280) {
        assert.ok(help.width < cap, "the fitted dialog isn't narrower than the cap");
        assert.equal(
          help.header.width,
          help.heading.width + parseFloat(tokens.s) + help.close.width,
          "the fitted dialog isn't as wide as its content",
        );
      } else {
        assert.ok(help.width <= cap, "the fitted dialog is past its cap");
      }
    });
  }

  test("Close and Escape close a dialog, its opener opens it, and no script listens", async () => {
    assert.equal(await live.evaluate(`document.scripts.length`), 0);
    const targets = [
      "window",
      "document",
      ...["help", "settings", "help-close", "settings-close"].map(button),
      ...["help", "settings"].map((id) => `document.querySelector("#light #${id}")`),
    ];
    for (const target of targets) {
      const { result } = await live.cdp("Runtime.evaluate", { expression: target });
      const { listeners } = await live.cdp("DOMDebugger.getEventListeners", {
        objectId: result.objectId,
      });
      assert.deepEqual(listeners, [], `${target} has a listener`);
    }
    await click(live, button("help"));
    await until(live, dialogOpen("help"));
    await click(live, button("help-close"));
    await until(live, `!${dialogOpen("help")}`);
    await click(live, button("settings"));
    await until(live, dialogOpen("settings"));
    await press(live, "Escape");
    await until(live, `!${dialogOpen("settings")}`);
  });

  test("every declaration of the two sheets, dropped, changes a case", async () => {
    const tried: Drop[] = await page.evaluate(WITH_MODULE(`m.drops(${JSON.stringify(light)})`));
    assert.deepEqual(
      SHEETS.filter((sheet) => !tried.some((drop) => drop.sheet === sheet)),
      [],
      "a sheet has no declaration tried",
    );
    const missed = tried
      .filter(({ differs }) => !differs)
      .map(({ selector, declaration }) => `${selector} { ${declaration} }`);
    assert.deepEqual(missed, []);
  });

  test("a page's own later layer wins over both sheets", async () => {
    const read = await page.evaluate(`(() => {
      const tight = getComputedStyle(document.querySelector('[data-part="tight"]'));
      const flush = getComputedStyle(document.querySelector('[data-part="flush"]'));
      return [tight.paddingTop, tight.paddingLeft, flush.marginBlockEnd];
    })()`);
    assert.deepEqual(read, ["0px", "0px", "0px"]);
  });
});
