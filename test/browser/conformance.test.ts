// Adapted from spike-html-apps-foundation (07ba39a): test/browser/conformance.test.ts, importing the tooling and the package by name.
// Adapted from spike-html-design (fe75220): test/conformance.test.js, in TypeScript.

import assert from "node:assert/strict";
import { join } from "node:path";
import { after, afterEach, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";
import type { Failure } from "@standards-lab/web-foundation/conformance.js";

const root = join(import.meta.dirname, "../..");

const CONFORMANCE = "/dist/conformance.js";

type Names = Record<string, string[]>;
type Results = Record<string, Record<string, Failure[]>>;

const BUILT_IN: Names = {
  color: ["zen", "github", "catppuccin", "everforest"],
  space: ["regular", "compact"],
  type: ["mono", "sans"],
};

const BROKEN: Record<string, Record<string, string>> = {
  color: {
    missing: "tokens",
    spacing: "color-only",
    unlayered: "layer",
    specific: "specificity",
    unpainted: "paints",
    surfaces: "surfaces",
    contrast: "contrast",
    unregistered: "registered",
  },
  space: {
    missing: "tokens",
    coloring: "space-only",
    unlayered: "layer",
    specific: "specificity",
    flat: "scale",
    unregistered: "registered",
  },
  type: {
    missing: "tokens",
    spacing: "type-only",
    unlayered: "layer",
    specific: "specificity",
    descending: "scale",
    unfamilied: "scale",
    unregistered: "registered",
  },
};

let server: Server;
let other: Server;
let browser: Browser;
const pages: Page[] = [];
const fixture = (name: string) => `${server.origin}/test/fixtures/${name}`;

before(async () => {
  server = await serve({ root });
  other = await serve({ root });
  browser = await launch();
});
afterEach(async () => {
  for (const page of pages.splice(0)) await page.close();
});
after(async () => {
  await browser?.close();
  await server?.stop();
  await other?.stop();
});

async function open(url: string): Promise<Page> {
  const page = await browser.open(url);
  pages.push(page);
  return page;
}

const checked = (page: Page, names: Names): Promise<Results> =>
  page.evaluate(`import(${JSON.stringify(CONFORMANCE)}).then(async ({ check }) => {
    const results = {};
    for (const [facet, list] of Object.entries(${JSON.stringify(names)})) {
      results[facet] = {};
      for (const name of list) results[facet][name] = await check(facet, name);
    }
    return results;
  })`);

const conforming = (names: Names) =>
  Object.fromEntries(
    Object.entries(names).map(([facet, list]) => [
      facet,
      Object.fromEntries(list.map((name) => [name, []])),
    ]),
  );

const rules = (results: Results) =>
  Object.fromEntries(
    Object.entries(results).map(([facet, byName]) => [
      facet,
      Object.fromEntries(
        Object.entries(byName).map(([name, failures]) => [name, failures.map(({ rule }) => rule)]),
      ),
    ]),
  );

describe("conformance", () => {
  for (const scheme of ["light", "dark"]) {
    test(`the built-in profiles conform on the full entry, with the system in ${scheme}`, async () => {
      const page = await open(fixture("conformance.html"));
      await page.cdp("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-color-scheme", value: scheme }],
      });
      assert.deepEqual(await checked(page, BUILT_IN), conforming(BUILT_IN));
    });
  }

  test("the built-in profiles conform with the entry's sheets from another origin", async () => {
    const page = await open(`${fixture("conformance-cross-origin.html")}?sheets=${other.origin}`);
    assert.deepEqual(
      await page.evaluate(`[document.styleSheets.length, [...document.styleSheets].every((sheet) => {
        try { return sheet.cssRules && false; } catch { return true; }
      })]`),
      [1, true],
      "the entry's one sheet hides its rules, served from another origin without CORS",
    );
    assert.deepEqual(await checked(page, BUILT_IN), conforming(BUILT_IN));
  });

  test("each fixture profile fails the one rule it breaks, by name", async () => {
    const page = await open(fixture("conformance.html"));
    const names = Object.fromEntries(
      Object.entries(BROKEN).map(([facet, byName]) => [facet, Object.keys(byName)]),
    );
    const results = await checked(page, names);
    const expected = Object.fromEntries(
      Object.entries(BROKEN).map(([facet, byName]) => [
        facet,
        Object.fromEntries(Object.entries(byName).map(([name, rule]) => [name, [rule]])),
      ]),
    );
    assert.deepEqual(rules(results), expected);
    for (const [facet, byName] of Object.entries(results)) {
      for (const [name, failures] of Object.entries(byName)) {
        assert.ok(failures[0].message.startsWith(`${name}: `), `${facet} ${name}`);
      }
    }
  });

  test("every rule the module exports has a fixture that breaks it", async () => {
    const page = await open(fixture("conformance.html"));
    const RULES: Record<string, string[]> = await page.evaluate(
      `import(${JSON.stringify(CONFORMANCE)}).then(({ RULES }) => RULES)`,
    );
    assert.deepEqual(Object.keys(RULES), Object.keys(BROKEN));
    for (const [facet, byName] of Object.entries(BROKEN)) {
      assert.deepEqual([...new Set(Object.values(byName))].sort(), [...RULES[facet]].sort(), facet);
    }
  });

  test("names what broke, and an unknown name fails tokens and registered alone", async () => {
    const page = await open(fixture("conformance.html"));
    const results = await checked(page, {
      color: ["missing", "absent"],
      space: ["missing", "flat", "absent"],
      type: ["missing", "descending", "unfamilied", "absent"],
    });
    const messages = (facet: string, name: string) =>
      results[facet][name].map(({ message }) => message);
    assert.deepEqual(messages("color", "missing"), [
      "missing: sets no color in a scheme for --magenta (light, dark)",
    ]);
    assert.deepEqual(messages("space", "missing"), ["missing: sets no length for --radius-base"]);
    assert.deepEqual(messages("space", "flat"), [
      "flat: --space-3xs to --space-3xl compute to 0px, 0px, 0px, 0px, 0px, 0px, 0px, 0px, 0px, which do not strictly ascend",
    ]);
    assert.deepEqual(messages("type", "missing"), ["missing: sets no value for --leading-code"]);
    assert.match(
      messages("type", "descending")[0],
      /^descending: --text-xs to --text-4xl compute to (\d+(\.\d+)?px, ){7}\d+(\.\d+)?px, which do not strictly ascend$/,
    );
    assert.deepEqual(messages("type", "unfamilied"), [
      "unfamilied: --font-code resolve to no font family",
    ]);
    for (const facet of ["color", "space", "type"]) {
      assert.deepEqual(
        results[facet].absent.map(({ rule }) => rule),
        ["tokens", "registered"],
        facet,
      );
    }
  });

  test("contrast compares --fg on --bg unrounded in each scheme, and names the scheme and ratio", async () => {
    const page = await open(fixture("conformance.html"));
    await page.evaluate(`import("/dist/registry.js").then(({ register }) => {
      const profile = (name, fg) => \`:where([data-palette="\${name}"]) {
        --bg: light-dark(#ffffff, #100f0f); --bg-1: light-dark(#f2f0e5, #1c1b1a);
        --bg-2: light-dark(#e6e4d9, #282726); --border: light-dark(#dad8ce, #343331);
        --border-2: light-dark(#cecdc3, #403e3c); --fg: light-dark(\${fg}, #e6e4d9);
        --fg-2: light-dark(#575653, #b7b5ac); --fg-3: light-dark(#878580, #6f6e69);
        --red: light-dark(#af3029, #d14d41); --orange: light-dark(#bc5215, #da702c);
        --yellow: light-dark(#ad8301, #d0a215); --green: light-dark(#408739, #61a25a);
        --cyan: light-dark(#24837b, #3aa99f); --blue: light-dark(#205ea6, #4385be);
        --purple: light-dark(#5e409d, #8b7ec8); --magenta: light-dark(#a02f6f, #ce5d97);
      }\`;
      document.head.append(Object.assign(document.createElement("style"), {
        textContent: \`@layer foundation.tokens.color {
          \${profile("under", "#6c7b67")} \${profile("at", "#797488")}
        }\`,
      }));
      register("color", "under");
      register("color", "at");
    })`);
    const results = await checked(page, { color: ["under", "at", "contrast"] });
    assert.deepEqual(results.color.under, [
      { rule: "contrast", message: "under: --fg on --bg is under 4.5:1: 4.49:1 in light" },
    ]);
    assert.deepEqual(results.color.at, []);
    assert.deepEqual(results.color.contrast, [
      { rule: "contrast", message: "contrast: --fg on --bg is under 4.5:1: 3.74:1 in dark" },
    ]);
  });

  test("a scope painted from other tokens by a consumer's rule fails paints", async () => {
    const page = await open(fixture("conformance.html"));
    await page.evaluate(`document.head.append(Object.assign(document.createElement("style"), {
      textContent: '[data-palette="github"] { background-color: var(--red); }',
    }))`);
    const results = await checked(page, { color: ["zen", "github"] });
    assert.deepEqual(rules(results), { color: { zen: [], github: ["paints"] } });
  });

  test("freezes the rules, and rejects an unknown facet or an empty name", async () => {
    const page = await open(fixture("conformance.html"));
    assert.deepEqual(
      await page.evaluate(`import(${JSON.stringify(CONFORMANCE)}).then(async ({ check, RULES }) => {
        const rejected = (call) => call.then(() => null, (error) => [error.name, error.message]);
        return [
          Object.isFrozen(RULES) && Object.values(RULES).every(Object.isFrozen),
          await rejected(check("scheme", "dark")),
          await rejected(check("space", "")),
          await rejected(check("type")),
        ];
      })`),
      [
        true,
        ["TypeError", "conformance: unknown facet scheme; expected one of color, space, type"],
        ["TypeError", "conformance: a space profile's name must be a non-empty string"],
        ["TypeError", "conformance: a type profile's name must be a non-empty string"],
      ],
    );
  });

  test("leaves the page as it found it, and loads nothing", async () => {
    const page = await open(fixture("conformance.html"));
    const state = `[document.querySelectorAll("*").length, document.styleSheets.length,
      performance.getEntriesByType("resource").length]`;
    const before = await page.evaluate(state);
    await checked(page, { color: ["zen"], space: ["regular"], type: ["mono"] });
    const [elements, sheets, resources] = await page.evaluate(state);
    assert.deepEqual(
      [elements, sheets, resources],
      [before[0], before[1], before[2] + 1],
      "the module itself is the one resource the check adds",
    );
  });
});
