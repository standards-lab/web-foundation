import assert from "node:assert/strict";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

const root = join(import.meta.dirname, "../..");

const PALETTES = ["zen", "github", "catppuccin", "everforest"];
const SCHEMES = ["light", "dark"];
const SPACES = ["regular", "compact"];
const TYPES = ["mono", "sans"];
const WIDTHS = [360, 1280];
const ACCENT_SET = [153, 51, 102];

const SNAP = 2 / 64;

type RGB = [number, number, number];

interface Control {
  token: number;
  rendered: number;
}

interface Probe {
  edge: string;
  blockSize: string;
  offset: string;
  reach: string;
  tint: string;
}

interface Paint {
  border: string;
  background: string;
  color: string;
}

const ATTRIBUTES = (attributes: Record<string, string | null>) => `(() => {
  for (const [name, value] of Object.entries(${JSON.stringify(attributes)})) {
    if (value === null) document.documentElement.removeAttribute(name);
    else document.documentElement.setAttribute(name, value);
  }
})()`;

const TOKEN_COLOR = (token: string) => `(() => {
  const probe = document.body.appendChild(document.createElement("i"));
  probe.style.color = "var(${token})";
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
})()`;

const channels = (color: string): RGB => {
  const match = color.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
  assert.ok(match, `not an opaque rgb() color: ${color}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const luminance = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

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

const motion = (page: Page, value: "reduce" | "no-preference" | null) =>
  page.cdp("Emulation.setEmulatedMedia", {
    features: value === null ? [] : [{ name: "prefers-reduced-motion", value }],
  });

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
          const controls: Record<string, Control> = await page.evaluate(`(() => {
            const out = {};
            for (const control of document.querySelectorAll("#controls > *")) {
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
