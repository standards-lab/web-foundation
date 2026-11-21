import assert from "node:assert/strict";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

import { ADDED_UTILITIES } from "./support/utilities.js";

const root = join(import.meta.dirname, "../..");

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
interface Type {
  size: string;
  color: string;
}
interface Wrapping {
  fragments: number;
  overflows: boolean;
  digits: string;
}
interface Break extends Box {
  fragments: number;
  lines: number;
  line: number;
  lineWidth: number;
}
interface Frame {
  host: Box;
  frame: Box;
  content: Box;
  scrollsDown: boolean;
  scrollsAcross: boolean;
  limit: number;
  line: number;
}
interface Head {
  row: Box;
  name: Box;
  end: Box;
  nameText: number;
}
interface Hidden {
  after: Box;
  height: number;
  scrollsAcross: boolean;
  label?: Box;
  labelLines?: number;
  hitLabel?: string;
}
interface Measured {
  list: { indent: number; step: number; marker: string; blockStep: number };
  nowrap: Wrapping;
  numeric: Wrapping;
  "break-short": Break;
  "break-long": Break;
  truncate: { lines: number; overflows: boolean; past: boolean; ending: string };
  "frame-auto": Frame;
  "frame-held": Frame;
  "frame-tall": Frame;
  "frame-short": Frame;
  "frame-long": Frame;
  alternatives: {
    cell: Box;
    shown: Box;
    hidden: Box;
    shownText: number;
    hiddenText: number;
    hit: string;
  };
  "head-short": Head;
  "head-wide": Head;
  "head-basis": Head;
  "head-narrow": Head;
  "head-unbroken": Head;
  quiet: { s: Type; xs: Type; probeS: Type; probeXs: Type };
  status: { blank: number; filled: number; size: string; color: string };
  hidden: Hidden;
  hiddenControl: Hidden;
}
interface Drop {
  selector: string;
  declaration: string;
  differs: boolean;
}
interface AXNode {
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
}

const WITH_MODULE = (body: string) =>
  `import("/test/browser/support/utilities.js").then(async (m) => ${body})`;

const ANIMATIONS = (selector: string) => `(() => {
  const host = document.querySelector("#shadow-host");
  const elements = [document, host.shadowRoot].flatMap((root) => [...root.querySelectorAll("${selector}")]);
  return elements.map((element) => {
    const running = element.getAnimations().filter((a) => a.playState === "running");
    const [first] = running;
    if (first) first.currentTime = first.effect.getComputedTiming().duration / 2;
    const opacity = Number(getComputedStyle(element).opacity);
    return { names: running.map((a) => a.animationName), midOpacity: opacity };
  });
})()`;

describe("foundation utilities and motion", () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  let light: Measured;
  let shadow: Measured;

  before(async () => {
    server = await serve({ root });
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/utilities.html`);
    ({ light, shadow } = await page.evaluate(
      WITH_MODULE(`({ light: m.measure(m.light()), shadow: m.measure(await m.shadow("/dist")) })`),
    ));
    await page.evaluate(`document.querySelector("#shadow-host").shadowRoot
      .append(document.querySelector("#motion").cloneNode(true))`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  const motion = (value: "reduce" | "no-preference") =>
    page.cdp("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value }],
    });

  test("a shadow root that adopts the sheets alone lays out every case as the page does", () => {
    assert.deepEqual(shadow, light);
  });

  test(".list-bare: no indent, no marker, no step between items, the list's own step kept", () => {
    assert.deepEqual(
      { indent: light.list.indent, step: light.list.step, marker: light.list.marker },
      { indent: 0, step: 0, marker: "none" },
    );
    assert.ok(light.list.blockStep > 0, "the list lost its step from the block before it");
  });

  test(".text-nowrap and .text-numeric keep a value on one line past a narrow box", () => {
    for (const name of ["nowrap", "numeric"] as const) {
      assert.equal(light[name].fragments, 1, `${name} broke`);
      assert.ok(light[name].overflows, `${name} fit its box, so it shows nothing`);
    }
    assert.equal(light.numeric.digits, "tabular-nums");
    assert.equal(light.nowrap.digits, "normal");
  });

  test(".text-break moves to the next line whole, and breaks inside only when wider than the line", () => {
    const short = light["break-short"];
    assert.ok(short.width < short.lineWidth, "the short value is no narrower than the line");
    assert.deepEqual(
      { fragments: short.fragments, left: short.left, top: short.top, lines: short.lines },
      { fragments: 1, left: 0, top: short.line, lines: 1 },
    );
    const long = light["break-long"];
    assert.equal(long.fragments, 1);
    assert.equal(long.top, long.line, "the long value didn't move to the next line");
    assert.ok(long.width <= long.lineWidth, "the long value runs past the line");
    assert.ok(long.lines > 1, "the long value didn't break");
  });

  test(".text-truncate holds one line, clips the rest, and ends in an ellipsis", () => {
    assert.deepEqual(light.truncate, {
      lines: 1,
      overflows: true,
      past: false,
      ending: "ellipsis",
    });
  });

  test(".scroll-frame is as tall as its content, scrolls when held shorter, fills when held taller", () => {
    const { "frame-auto": auto, "frame-held": held, "frame-tall": tall } = light;
    assert.equal(auto.frame.height, auto.content.height);
    assert.equal(auto.content.height, 4 * auto.line);
    assert.equal(auto.scrollsDown, false);
    assert.equal(held.frame.height, held.host.height);
    assert.ok(held.frame.height < held.content.height, "the held frame isn't shorter");
    assert.equal(held.scrollsDown, true);
    assert.equal(tall.frame.height, tall.host.height);
    assert.ok(tall.frame.height > tall.content.height, "the tall frame isn't taller");
    assert.equal(tall.content.height, 4 * tall.line, "the content stretched");
  });

  test(".scroll-frame is as wide as its content in a shrink-to-fit parent, and never wider", () => {
    const { "frame-short": short, "frame-long": long } = light;
    assert.equal(short.frame.width, short.content.width);
    assert.ok(short.frame.width < short.limit, "the short line filled the box");
    assert.equal(short.scrollsAcross, false);
    assert.equal(long.frame.width, long.limit);
    assert.equal(long.scrollsAcross, true);
  });

  test(".alternatives is as wide as its widest alternative, and the hidden one isn't shown", () => {
    const { cell, shown, hidden, shownText, hiddenText, hit } = light.alternatives;
    assert.ok(hiddenText > shownText, "the hidden alternative isn't the widest");
    assert.equal(cell.width, hiddenText);
    assert.deepEqual([shown.left, shown.top], [hidden.left, hidden.top]);
    assert.notEqual(hit, "hidden");
  });

  test(".head-row keeps the label on the name's line at its end while the two fit", () => {
    for (const name of ["head-short", "head-wide", "head-basis"] as const) {
      const { row, name: text, end } = light[name];
      assert.ok(end.top < text.top + text.height, `${name}: the label wrapped`);
      assert.equal(end.left + end.width, row.width, `${name}: the label isn't at the end`);
    }
    assert.equal(light["head-short"].name.width, light["head-short"].nameText);
    assert.equal(light["head-wide"].name.width, light["head-wide"].nameText);
    const basis = light["head-basis"];
    assert.ok(basis.name.width < basis.nameText, "the long name didn't shrink");
  });

  test(".head-row wraps the label under the name, at the line's end, only when the two don't fit", () => {
    for (const name of ["head-narrow", "head-unbroken"] as const) {
      const { row, name: text, end } = light[name];
      assert.ok(end.top >= text.top + text.height, `${name}: the label didn't wrap`);
      assert.equal(end.left + end.width, row.width, `${name}: the label isn't at the end`);
      assert.ok(text.width <= row.width, `${name}: the name runs past the row`);
    }
  });

  test(".text-quiet-s and .text-quiet-xs set --text-s and --text-xs in --fg-2", () => {
    const { s, xs, probeS, probeXs } = light.quiet;
    assert.deepEqual(s, probeS);
    assert.deepEqual(xs, probeXs);
    assert.notEqual(s.size, xs.size);
  });

  test(".status-line is the quiet type, a line tall when blank", () => {
    const { blank, filled, size, color } = light.status;
    assert.ok(blank > 0, "the blank status line takes no space");
    assert.equal(blank, filled);
    assert.deepEqual({ size, color }, light.quiet.probeS);
  });

  test(".visually-hidden takes no space, shows nothing, and keeps one line", () => {
    const { label, labelLines, hitLabel, ...placed } = light.hidden;
    assert.deepEqual(placed, light.hiddenControl);
    assert.deepEqual([label?.width, label?.height], [1, 1]);
    assert.equal(labelLines, 1);
    assert.notEqual(hitLabel, "label");
  });

  test("the hidden label stays in the accessibility tree, and the hidden alternative leaves it", async () => {
    await page.cdp("Accessibility.enable");
    const { nodes }: { nodes: AXNode[] } = await page.cdp("Accessibility.getFullAXTree");
    const named = (text: string) =>
      nodes.filter(
        (node) => !node.ignored && node.role?.value === "StaticText" && node.name?.value === text,
      ).length;
    assert.equal(named("a hidden label of several words"), 2);
    assert.equal(named("Stop generating"), 0);
    assert.equal(named("Send"), 2);
  });

  test("every declaration of the added classes, dropped, changes a case", async () => {
    const tried: Drop[] = await page.evaluate(WITH_MODULE(`m.drops(${JSON.stringify(light)})`));
    const covered = ADDED_UTILITIES.filter((name) =>
      tried.some(({ selector }) => new RegExp(`\\.${name}(?![\\w-])`).test(selector)),
    );
    assert.deepEqual(covered, ADDED_UTILITIES, "a class has no declaration tried");
    const missed = tried
      .filter(({ differs }) => !differs)
      .map(({ selector, declaration }) => `${selector} { ${declaration} }`);
    assert.deepEqual(missed, []);
  });

  test("the durations are declared on the root and on the adopting host", async () => {
    const read = `[document.documentElement, document.querySelector("#shadow-host")].map((element) => {
      const style = getComputedStyle(element);
      return [style.getPropertyValue("--duration-s"), style.getPropertyValue("--duration-m")];
    })`;
    assert.deepEqual(await page.evaluate(read), [
      ["120ms", "200ms"],
      ["120ms", "200ms"],
    ]);
  });

  test("under no-preference, .motion-pulse pulses and .motion-ring rings, in the page and the shadow root", async () => {
    await motion("no-preference");
    for (const [selector, name] of [
      [".motion-pulse:not(.app-still)", "pulse"],
      [".motion-ring", "ring"],
    ]) {
      const read: { names: string[]; midOpacity: number }[] = await page.evaluate(
        ANIMATIONS(selector),
      );
      assert.equal(read.length, 2, `${selector}: one in the page and one in the shadow root`);
      for (const { names, midOpacity } of read) {
        assert.deepEqual(names, [name]);
        assert.ok(midOpacity < 1, `${selector} doesn't fade midway`);
      }
    }
  });

  test("under reduce, nothing animates", async () => {
    await motion("reduce");
    const running = await page.evaluate(`(() => {
      const host = document.querySelector("#shadow-host");
      return [document, host.shadowRoot]
        .flatMap((root) => [...root.querySelectorAll(".motion-pulse, .motion-ring")])
        .flatMap((element) => element.getAnimations()).length;
    })()`);
    assert.equal(running, 0);
    assert.equal(await page.evaluate(`document.getAnimations().length`), 0);
    await motion("no-preference");
  });

  test("a page's own later layer wins over the utilities and the motion sheet", async () => {
    await motion("no-preference");
    const read = await page.evaluate(`(() => {
      const still = document.querySelector('[data-part="still"]');
      const wraps = document.querySelector('[data-part="wraps"]');
      return { still: still.getAnimations().length, wraps: wraps.getClientRects().length };
    })()`);
    assert.equal(read.still, 0, "the page's animation: none lost");
    assert.ok(read.wraps > 1, "the page's white-space lost");
  });
});
