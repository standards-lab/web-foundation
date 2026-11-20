// The space facet's control, focus and tint tokens, and the elements rules the foundation adds to
// spike-html-design v0.7.0, from the package's dist/, on test/fixtures/controls.html under the
// full page entry. A one-line text field, select and button each stand --control-block-size tall
// in every space and type profile, at the widest display and the narrowest; the tokens resolve on
// a data-space scope as on a root of the scope's profile; the focus outline's offset reads
// --focus-offset, and --focus-reach is its width plus that offset. A disabled field, select and
// text area take --border, --bg-1 and --fg-2, and hovered keep them. A progress bar's and a
// meter's track paints --bg-2 in every palette and scheme, never near white in dark, and the
// progress bar's fill paints --color-accent. An indeterminate progress bar shows a segment in
// --color-accent over that track, which sweeps under prefers-reduced-motion: no-preference and
// stands still at the track's middle under reduce. The paint is read from a screenshot's pixels,
// which the page decodes on a canvas: chromium reports no computed style for a bar's track.

import assert from "node:assert/strict";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

/** The repository root, which the server serves. */
const root = join(import.meta.dirname, "../..");

const PALETTES = ["zen", "github", "catppuccin", "everforest"];
const SCHEMES = ["light", "dark"];
const SPACES = ["regular", "compact"];
const TYPES = ["mono", "sans"];
/** The narrowest display the fluid scales distinguish, and the page's own, the widest. */
const WIDTHS = [360, 1280];
/** The color the fixture's app layer gives --color-accent on the accented bar's subtree. */
const ACCENT_SET = [153, 51, 102];

/**
 * A layout length's tolerance: chromium snaps each padding to 1/64 px on its own, so a control's
 * two paddings and the token's one sum can part by up to two of those units.
 */
const SNAP = 2 / 64;

type RGB = [number, number, number];

/** The control block size a control's 1lh gives the token, and the control's rendered height. */
interface Control {
  token: number;
  rendered: number;
}

/** What a probe reads of the tokens where it stands. */
interface Probe {
  edge: string;
  blockSize: string;
  offset: string;
  reach: string;
  tint: string;
}

/** A disabled control's paint. */
interface Paint {
  border: string;
  background: string;
  color: string;
}

/** Sets the root's attributes, each removed when null. */
const ATTRIBUTES = (attributes: Record<string, string | null>) => `(() => {
  for (const [name, value] of Object.entries(${JSON.stringify(attributes)})) {
    if (value === null) document.documentElement.removeAttribute(name);
    else document.documentElement.setAttribute(name, value);
  }
})()`;

/** A token as a color, resolved at the root, as rgb(). */
const TOKEN_COLOR = (token: string) => `(() => {
  const probe = document.body.appendChild(document.createElement("i"));
  probe.style.color = "var(${token})";
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
})()`;

/** An rgb() color's three channels. */
const channels = (color: string): RGB => {
  const match = color.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
  assert.ok(match, `not an opaque rgb() color: ${color}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

/** Relative luminance, 0 to 1, by WCAG's weights on the channels as given. */
const luminance = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Forces the pseudo-classes on every element the selector matches, through the protocol. */
async function force(page: Page, selector: string, forcedPseudoClasses: string[]) {
  await page.cdp("DOM.enable");
  await page.cdp("CSS.enable");
  const { root: tree } = await page.cdp("DOM.getDocument");
  const { nodeIds }: { nodeIds: number[] } = await page.cdp("DOM.querySelectorAll", {
    nodeId: tree.nodeId,
    selector,
  });
  assert.ok(nodeIds.length > 0, `nothing matches ${selector}`);
  await Promise.all(
    nodeIds.map((nodeId) => page.cdp("CSS.forcePseudoState", { nodeId, forcedPseudoClasses })),
  );
}

/**
 * The painted color of one pixel of the element, at the fraction of its inline size along its
 * middle line, from a screenshot the page decodes on a canvas.
 */
async function pixel(page: Page, selector: string, along: number): Promise<RGB> {
  const box: { x: number; y: number; width: number; height: number } = await page.evaluate(`(() => {
    const { x, y, width, height } = document.querySelector(${JSON.stringify(selector)})
      .getBoundingClientRect();
    return { x, y, width, height };
  })()`);
  const clip = {
    x: Math.floor(box.x + box.width * along),
    y: Math.floor(box.y + box.height / 2),
    width: 1,
    height: 1,
    scale: 1,
  };
  const { data }: { data: string } = await page.cdp("Page.captureScreenshot", {
    format: "png",
    clip,
  });
  return page.evaluate(`(async () => {
    const image = new Image();
    image.src = "data:image/png;base64,${data}";
    await image.decode();
    const context = new OffscreenCanvas(1, 1).getContext("2d");
    context.drawImage(image, 0, 0);
    return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  })()`);
}

/** A screenshot of the element's middle line, its whole inline size, as base64 PNG. */
async function line(page: Page, selector: string): Promise<string> {
  const box: { x: number; y: number; width: number; height: number } = await page.evaluate(`(() => {
    const { x, y, width, height } = document.querySelector(${JSON.stringify(selector)})
      .getBoundingClientRect();
    return { x, y, width, height };
  })()`);
  const { data }: { data: string } = await page.cdp("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: Math.floor(box.y + box.height / 2),
      width: box.width,
      height: 1,
      scale: 1,
    },
  });
  return data;
}

/** Emulates prefers-reduced-motion, or clears the emulation when null. */
const motion = (page: Page, value: "reduce" | "no-preference" | null) =>
  page.cdp("Emulation.setEmulatedMedia", {
    features: value === null ? [] : [{ name: "prefers-reduced-motion", value }],
  });

/** Waits the given milliseconds in the page. */
const wait = (page: Page, ms: number) =>
  page.evaluate(`new Promise((resolve) => setTimeout(resolve, ${ms}))`);

describe("foundation control tokens and element rules", () => {
  let server: Server;
  let browser: Browser;
  let page: Page;

  before(async () => {
    server = await serve({ root });
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/controls.html`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  /** Sets the page's width, its height the tooling's 720. */
  const width = (inline: number) =>
    page.cdp("Emulation.setDeviceMetricsOverride", {
      width: inline,
      height: 720,
      deviceScaleFactor: 1,
      mobile: false,
    });

  for (const space of SPACES) {
    for (const type of TYPES) {
      for (const inline of WIDTHS) {
        test(`${space} ${type} at ${inline}px: a field, a select and a button stand --control-block-size tall`, async () => {
          await width(inline);
          await page.evaluate(ATTRIBUTES({ "data-space": space, "data-type": type }));
          // The token read on each control, through its own 1lh, beside its rendered height.
          const controls: Record<string, Control> = await page.evaluate(`(() => {
            const out = {};
            for (const control of document.querySelectorAll("#controls > *")) {
              // Read before the token's minimum is set, which would hold the control to it.
              const rendered = control.getBoundingClientRect().height;
              control.style.minBlockSize = "var(--control-block-size)";
              out[control.localName] = {
                token: parseFloat(getComputedStyle(control).minHeight),
                rendered,
              };
              control.style.minBlockSize = "";
            }
            return out;
          })()`);
          await width(1280);
          assert.deepEqual(Object.keys(controls), ["input", "select", "button"]);
          const token = controls.input.token;
          for (const [name, { token: read, rendered }] of Object.entries(controls)) {
            assert.equal(read, token, `${name} reads another token`);
            assert.ok(
              Math.abs(rendered - token) <= SNAP,
              `${name} is ${rendered}px tall, the token ${token}px`,
            );
          }
        });
      }
    }
  }

  // Each space profile on the root and the other on the scope: the scope's probe must read what
  // the root's reads with the scope's profile on the root, so no token keeps the root's values.
  for (const [index, space] of SPACES.entries()) {
    const scoped = SPACES[(index + 1) % SPACES.length];
    test(`a data-space="${scoped}" scope under ${space} reads its own profile's tokens`, async () => {
      const read = `(() => {
        const out = {};
        for (const probe of [document.querySelector("#probe"), document.querySelector("#scope .probe")]) {
          probe.style.cssText = "display: block; padding-block: var(--control-edge) var(--focus-reach);"
            + " min-block-size: var(--control-block-size); outline-offset: var(--focus-offset);"
            + " color: color-mix(in srgb, rgb(0, 0, 255) var(--tint), transparent);";
          const style = getComputedStyle(probe);
          out[probe.id ? "root" : "scope"] = {
            edge: style.paddingTop,
            blockSize: style.minHeight,
            offset: style.outlineOffset,
            reach: style.paddingBottom,
            tint: style.color,
          };
          probe.style.cssText = "";
        }
        return out;
      })()`;
      await page.evaluate(ATTRIBUTES({ "data-space": scoped, "data-type": null }));
      const alone: Record<string, Probe> = await page.evaluate(read);
      await page.evaluate(ATTRIBUTES({ "data-space": space }));
      await page.evaluate(`document.querySelector("#scope").dataset.space = "${scoped}"`);
      const nested: Record<string, Probe> = await page.evaluate(read);
      assert.notEqual(nested.root.edge, alone.root.edge, `${space} and ${scoped} share an edge`);
      assert.deepEqual(nested.scope, alone.root);
      assert.equal(alone.root.offset, "2px");
      assert.equal(alone.root.tint, "color(srgb 0 0 1 / 0.12)");
    });
  }

  for (const space of SPACES) {
    test(`${space}: the focus outline's offset reads --focus-offset, and --focus-reach is its reach`, async () => {
      // The offset is set on a data-space scope, where the reach is declared again and reads it.
      await page.evaluate(ATTRIBUTES({ "data-space": space, "data-type": null }));
      await page.evaluate(`document.querySelector("#focus .offset").dataset.space = "${space}"`);
      await force(page, "#focus input", ["focus-visible"]);
      const focused: { offset: string; reach: number; outline: number }[] =
        await page.evaluate(`[...document.querySelectorAll("#focus input")].map((field) => {
          const style = getComputedStyle(field);
          field.style.paddingTop = "var(--focus-reach)";
          const reach = parseFloat(getComputedStyle(field).paddingTop);
          field.style.paddingTop = "";
          return {
            offset: style.outlineOffset,
            reach,
            outline: parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset),
          };
        })`);
      await force(page, "#focus input", []);
      assert.deepEqual(
        focused.map(({ offset }) => offset),
        ["2px", "5px"],
      );
      for (const { reach, outline } of focused) assert.equal(reach, outline);
    });
  }

  for (const palette of PALETTES) {
    for (const scheme of SCHEMES) {
      test(`${palette} ${scheme}: a disabled field, select and text area read as disabled, and hover changes none`, async () => {
        await page.evaluate(ATTRIBUTES({ "data-palette": palette, "data-scheme": scheme }));
        const read = `[...document.querySelectorAll("#disabled > *")].map((control) => {
          const style = getComputedStyle(control);
          return {
            border: style.borderTopColor,
            background: style.backgroundColor,
            color: style.color,
          };
        })`;
        const rest: Paint[] = await page.evaluate(read);
        await force(page, "#disabled > *", ["hover"]);
        const hovered: Paint[] = await page.evaluate(read);
        await force(page, "#disabled > *", []);
        const expected: Paint = {
          border: await page.evaluate(TOKEN_COLOR("--border")),
          background: await page.evaluate(TOKEN_COLOR("--bg-1")),
          color: await page.evaluate(TOKEN_COLOR("--fg-2")),
        };
        // The enabled field, last, is the control: its hover border moves, so the hover took.
        const enabled = rest.pop();
        const enabledHovered = hovered.pop();
        assert.notEqual(enabledHovered?.border, enabled?.border, "the forced hover took nothing");
        assert.notEqual(enabled?.border, expected.border, "an enabled field shares the boundary");
        assert.deepEqual(rest, [expected, expected, expected]);
        assert.deepEqual(hovered, rest);
      });
    }
  }

  for (const palette of PALETTES) {
    for (const scheme of SCHEMES) {
      test(`${palette} ${scheme}: progress and meter tracks paint --bg-2, progress fills in --color-accent`, async () => {
        await page.evaluate(ATTRIBUTES({ "data-palette": palette, "data-scheme": scheme }));
        await page.evaluate(
          `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
        );
        const track = channels(await page.evaluate(TOKEN_COLOR("--bg-2")));
        const accent = channels(await page.evaluate(TOKEN_COLOR("--color-accent, var(--magenta)")));
        // Progress is at 40%, the optimum meter at 80%, the low one at 50%.
        const painted = {
          progressTrack: await pixel(page, "#progress", 0.7),
          optimumTrack: await pixel(page, "#optimum", 0.9),
          lowTrack: await pixel(page, "#low", 0.75),
        };
        assert.deepEqual(painted, {
          progressTrack: track,
          optimumTrack: track,
          lowTrack: track,
        });
        if (scheme === "dark") {
          assert.ok(luminance(track) < 0.3, `the dark track ${track} is near white`);
        }
        assert.deepEqual(await pixel(page, "#progress", 0.2), accent, "progress's fill");
        assert.deepEqual(await pixel(page, "#accented", 0.2), ACCENT_SET, "the hook's fill");
        assert.notDeepEqual(await pixel(page, "#optimum", 0.4), track, "the meter shows no fill");
      });

      test(`${palette} ${scheme}: an indeterminate progress bar shows --color-accent over a --bg-2 track`, async () => {
        await page.evaluate(ATTRIBUTES({ "data-palette": palette, "data-scheme": scheme }));
        // Under reduce the segment stands still at the middle, two fifths of the track wide.
        await motion(page, "reduce");
        try {
          await page.evaluate(
            `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
          );
          const track = channels(await page.evaluate(TOKEN_COLOR("--bg-2")));
          const accent = channels(
            await page.evaluate(TOKEN_COLOR("--color-accent, var(--magenta)")),
          );
          assert.deepEqual(
            {
              start: await pixel(page, "#indeterminate", 0.1),
              middle: await pixel(page, "#indeterminate", 0.5),
              end: await pixel(page, "#indeterminate", 0.9),
            },
            { start: track, middle: accent, end: track },
          );
          if (scheme === "dark") {
            assert.ok(luminance(track) < 0.3, `the dark track ${track} is near white`);
          }
          assert.deepEqual(
            await pixel(page, "#accented-indeterminate", 0.5),
            ACCENT_SET,
            "the hook's segment",
          );
        } finally {
          await motion(page, null);
        }
      });
    }
  }

  for (const [preference, moves] of [
    ["no-preference", true],
    ["reduce", false],
  ] as const) {
    test(`under prefers-reduced-motion: ${preference}, an indeterminate progress bar ${moves ? "moves" : "stands still"}`, async () => {
      await page.evaluate(ATTRIBUTES({ "data-palette": null, "data-scheme": null }));
      await motion(page, preference);
      try {
        // Two frames 300ms apart, a fraction of the sweep: a moving segment can't stand at the
        // same place in both.
        const first = await line(page, "#indeterminate");
        await wait(page, 300);
        const second = await line(page, "#indeterminate");
        if (moves) assert.notEqual(second, first, "the segment stood still");
        else assert.equal(second, first, "the segment moved");
      } finally {
        await motion(page, null);
      }
    });
  }
});
