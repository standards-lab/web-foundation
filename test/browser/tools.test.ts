// Adapted from spike-html-apps-foundation (07ba39a): test/browser/tools.test.ts, importing the tooling and the package by name.
// Adapted from spike-html-packages-foundation (5dd8a58): test/browser/tools.test.js, in TypeScript.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";
import type { Facet } from "@standards-lab/web-foundation/registry.js";
import { concerns, differences } from "./support/computed-styles.js";
import { ADDED_UTILITIES } from "./support/utilities.js";

type Reading = Record<string, Record<string, string>>;
interface Drop {
  sheet: string;
  selector: string;
  declaration: string;
  differs: number;
}
interface Switch {
  value: string;
  attribute: string | null;
  token: string;
  scheme: string;
}
interface Adopted {
  imports: number;
  rules: string[];
  [property: string]: number | string | string[];
}
interface Profile {
  facet: Facet;
  name: string;
}

const root = join(import.meta.dirname, "../..");

const reference = "/test/fixtures/v0.7.0/baseline.css";
const entry = "/dist/page.css";
const fullReference = "/test/fixtures/v0.7.0/full.css";
const fullEntry = "/dist/page-full.css";
const sheet = (concern: string) => `/dist/${concern}.css`;

const LAYER_ORDER = [
  "foundation.tokens.color",
  "foundation.tokens.space",
  "foundation.tokens.type",
  "foundation.reset",
  "foundation.elements",
  "foundation.meta",
  "foundation.structure",
  "foundation.utilities",
  "foundation.glyph",
  "foundation.dialog",
  "foundation.layout",
  "foundation.motion",
];

const FACETS: Facet[] = ["color", "space", "type"];
const PROFILES: Record<Facet, Record<string, Record<string, string>>> = {
  color: { zen: { "--bg": "light-dark(#eeeeee, #191919)" } },
  space: { regular: { "--radius-base": "0.375rem" } },
  type: {
    mono: {
      "--font-heading":
        'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',
    },
  },
};
const TOKENS = FACETS.flatMap((facet) =>
  Object.values(PROFILES[facet]).flatMap((tokens) => Object.keys(tokens)),
);

const ATTRIBUTES: Record<Facet, string> = {
  color: "data-palette",
  space: "data-space",
  type: "data-type",
};
const LEAN: Record<Facet, string[]> = { color: ["zen"], space: ["regular"], type: ["mono"] };
const FULL: Record<Facet, string[]> = {
  color: ["zen", "github", "catppuccin", "everforest"],
  space: ["regular", "compact"],
  type: ["mono", "sans"],
};
const SCHEMES = ["light", "dark"];
const FULL_PROFILES: Profile[] = FACETS.flatMap((facet) =>
  FULL[facet].map((name) => ({ facet, name })),
);
const ADDED = FULL_PROFILES.filter(({ facet, name }) => !LEAN[facet].includes(name));
const UPSTREAM_HELD = FULL_PROFILES.filter(({ facet }) => facet !== "color");
const COLORS = FULL_PROFILES.filter(({ facet }) => facet === "color");

const ZEN: Record<string, [string, string]> = {
  "--bg": ["#eeeeee", "#191919"],
  "--bg-1": ["#e5e5e5", "#222222"],
  "--bg-2": ["#d7d7d7", "#2c2c2c"],
  "--border": ["#cfcfcf", "#303030"],
  "--border-2": ["#989898", "#616161"],
  "--fg": ["#353535", "#bbbbbb"],
  "--fg-2": ["#5c5c5c", "#8e8e8e"],
  "--fg-3": ["#8b8b8b", "#686868"],
  "--red": ["#a8334c", "#de6e7c"],
  "--orange": ["#944927", "#b77e64"],
  "--yellow": ["#944927", "#b77e64"],
  "--green": ["#4f6c31", "#819b69"],
  "--cyan": ["#3b8992", "#66a5ad"],
  "--blue": ["#286486", "#6099c0"],
  "--purple": ["#88507d", "#b279a7"],
  "--magenta": ["#88507d", "#b279a7"],
};
const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

const source = (path: string) =>
  readFileSync(join(root, path), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function classes(css: string): string[] {
  const names = [...css.matchAll(/(?<![\w-])\.(-?[A-Za-z_][\w-]*)/g)].map((match) => match[1]);
  return [...new Set(names)].sort();
}

async function forceHover(page: Page) {
  await page.cdp("DOM.enable");
  await page.cdp("CSS.enable");
  const { root: tree } = await page.cdp("DOM.getDocument");
  const { nodeIds }: { nodeIds: number[] } = await page.cdp("DOM.querySelectorAll", {
    nodeId: tree.nodeId,
    selector: "body, body *",
  });
  const hover = (nodeId: number) =>
    page.cdp("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["hover"] });
  await Promise.all(nodeIds.map(hover));
}

const declared = (css: string) =>
  [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))].sort();

const UPSTREAM_DEFAULTS = Object.fromEntries(
  FACETS.map((facet) => {
    const match = source(reference).match(new RegExp(`\\./layers/tokens/${facet}/[\\w-]+\\.css`));
    assert.ok(match, `v0.7.0's lean entry imports no ${facet} profile`);
    return [facet, source(`/test/fixtures/v0.7.0/${match[0].slice(2)}`)];
  }),
) as Record<Facet, string>;

const SENTINELS = Object.fromEntries(
  FACETS.map((facet) => [facet, declared(UPSTREAM_DEFAULTS[facet])]),
);

const PIN = (UPSTREAM_DEFAULTS.color.match(/--[\w-]+\s*:[^;]+;/g) ?? []).join(" ");

const setup = ({ facet, name }: Profile, scheme: string, scoped: boolean) => ({
  attribute: ATTRIBUTES[facet],
  name,
  scheme,
  sentinels: scoped ? SENTINELS[facet] : undefined,
});

const head = (lines: string[]) => lines.slice(0, 40).join("\n") + (lines.length > 40 ? "\n…" : "");

describe("foundation tools", () => {
  let server: Server;
  let browser: Browser;

  async function toolsPage(sheets: string, pinned = false): Promise<Page> {
    const page = await browser.open(`${server.origin}/demo/tools.html`);
    await page.evaluate(`import("/test/browser/support/computed-styles.js")
      .then((m) => (window.m = m).useSheets(${JSON.stringify(sheets)}))`);
    if (pinned) await page.evaluate(`m.pin(${JSON.stringify(PIN)})`);
    return page;
  }

  async function snapshot(sheets: string): Promise<{ rest: Reading; hover: Reading }> {
    const page = await toolsPage(sheets, true);
    const rest = await page.evaluate("m.reading()");
    await forceHover(page);
    const hover = await page.evaluate("m.reading()");
    await page.close();
    return { rest, hover };
  }

  async function scoped(sheets: string, options: object, pinned = true): Promise<Reading> {
    const page = await toolsPage(sheets, pinned);
    await page.evaluate(`m.scope(${JSON.stringify(options)})`);
    const rest = await page.evaluate("m.reading()");
    await page.close();
    return rest;
  }

  let upstream: { rest: Reading; hover: Reading };
  const defaults: Record<string, Reading> = {};
  before(async () => {
    server = await serve({ root });
    browser = await launch();
    upstream = await snapshot(reference);
    for (const scheme of SCHEMES) defaults[scheme] = await scoped(reference, { scheme });
  });
  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  const upstreamClasses = classes(source("/test/fixtures/v0.7.0/layers/tools.css"));

  test("the sheets hold v0.7.0's tool classes and the added utilities, no fewer and no more", () => {
    assert.ok(upstreamClasses.length > 0, "v0.7.0's tools layer names no class");
    assert.deepEqual(
      classes(concerns.map((c) => source(sheet(c))).join("\n")),
      [...upstreamClasses, ...ADDED_UTILITIES].sort(),
    );
  });

  test("the demo page carries every tool class", () => {
    const html = readFileSync(join(root, "demo/tools.html"), "utf8");
    const carried = [...html.matchAll(/\sclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    assert.deepEqual(
      upstreamClasses.filter((name) => !carried.includes(name)),
      [],
    );
  });

  for (const path of [entry, fullEntry]) {
    test(`${path} states the whole layer order in one statement, first`, async () => {
      const page = await toolsPage(path);
      const statements = await page.evaluate(`(() => {
        const sheet = [...document.styleSheets].find(({ href }) => href.endsWith("${path}"));
        const rules = [...sheet.cssRules];
        return rules
          .filter((rule) => rule instanceof CSSLayerStatementRule)
          .map((rule) => ({ index: rules.indexOf(rule), names: [...rule.nameList] }));
      })()`);
      await page.close();
      assert.deepEqual(statements, [{ index: 0, names: LAYER_ORDER }]);
    });
  }

  const registrations: [string, string, Record<Facet, string[]>][] = [
    [entry, "/dist/register.js", LEAN],
    [fullEntry, "/dist/register-full.js", FULL],
  ];
  for (const [path, module, expected] of registrations) {
    test(`${path} with ${module} registers exactly the profiles it defines`, async () => {
      const page = await toolsPage(path);
      const { registered, defined } = await page.evaluate(`import("${module}")
        .then(() => import("/dist/registry.js"))
        .then(({ FACETS, profiles }) => ({
          registered: Object.fromEntries(FACETS.map((facet) => [facet, profiles(facet)])),
          defined: m.defined(),
        }))`);
      await page.close();
      assert.deepEqual(defined, expected);
      assert.deepEqual(registered, expected);
    });
  }

  for (const { facet, name } of FULL_PROFILES) {
    const module = `/dist/profiles/${facet}/${name}.js`;
    test(`${module} registers ${name} under ${facet} alone and loads no CSS`, async () => {
      const page = await toolsPage(entry);
      const sheets = `performance.getEntriesByType("resource")
        .filter(({ name }) => name.endsWith(".css")).length`;
      const { registered, before, after } = await page.evaluate(`(async () => {
        const before = ${sheets};
        await import("${module}");
        const { FACETS, profiles } = await import("/dist/registry.js");
        return {
          registered: Object.fromEntries(FACETS.map((facet) => [facet, profiles(facet)])),
          before,
          after: ${sheets},
        };
      })()`);
      await page.close();
      assert.deepEqual(registered, { color: [], space: [], type: [], [facet]: [name] });
      assert.equal(after, before, "the module fetched a stylesheet");
    });
  }

  test("with no profile attribute, the page entry applies DEFAULTS' profiles", async () => {
    const page = await toolsPage(entry);
    const read = `import("/dist/registry.js").then(({ DEFAULTS }) => {
      const style = getComputedStyle(document.documentElement);
      const token = (name) => style.getPropertyValue(name).trim().replace(/\\s+/g, " ");
      return {
        attributes: document.querySelectorAll("[data-palette], [data-space], [data-type]").length,
        defaults: DEFAULTS,
        tokens: Object.fromEntries(${JSON.stringify(TOKENS)}.map((name) => [name, token(name)])),
      };
    })`;
    const {
      attributes,
      defaults,
      tokens,
    }: { attributes: number; defaults: Record<Facet, string>; tokens: Record<string, string> } =
      await page.evaluate(read);
    await page.close();
    assert.equal(attributes, 0);
    assert.deepEqual(
      tokens,
      Object.assign({}, ...FACETS.map((facet) => PROFILES[facet][defaults[facet]])),
    );
  });

  for (const [i, scheme] of SCHEMES.entries()) {
    test(`with no profile attribute, the page entry resolves zen's swatches, ${scheme}`, async () => {
      const page = await toolsPage(entry);
      const resolved: Record<string, string> = await page.evaluate(`(() => {
        document.documentElement.setAttribute("data-scheme", "${scheme}");
        const probe = document.body.appendChild(document.createElement("i"));
        const out = {};
        for (const token of ${JSON.stringify(Object.keys(ZEN))}) {
          probe.style.color = "var(" + token + ")";
          out[token] = getComputedStyle(probe).color;
        }
        probe.remove();
        return out;
      })()`);
      await page.close();
      const expected = Object.entries(ZEN).map(([token, pair]) => [token, rgb(pair[i])]);
      assert.deepEqual(resolved, Object.fromEntries(expected));
    });
  }

  test("every tool class computes as v0.7.0's, at rest and hovered", async () => {
    assert.notEqual(differences(upstream.rest, upstream.hover).length, 0, "hover changed nothing");
    const ours = await snapshot(entry);
    const lines = (["rest", "hover"] as const).flatMap((state) =>
      differences(upstream[state], ours[state]).map((line) => `${state} ${line}`),
    );
    assert.deepEqual(lines, [], head(lines));
  });

  for (const scheme of SCHEMES) {
    test(`the page entry computes as v0.7.0's lean entry, ${scheme}`, async () => {
      const lines = differences(defaults[scheme], await scoped(entry, { scheme }));
      assert.deepEqual(lines, [], head(lines));
    });
  }

  test("the forced scheme changes the reading", () => {
    assert.notEqual(differences(defaults.light, defaults.dark).length, 0, "light and dark agree");
  });

  for (const profile of UPSTREAM_HELD) {
    for (const scheme of SCHEMES) {
      test(`${ATTRIBUTES[profile.facet]}="${profile.name}" computes as v0.7.0's, ${scheme}`, async () => {
        const found: string[] = [];
        for (const scope of [false, true]) {
          const options = setup(profile, scheme, scope);
          const ours = await scoped(fullEntry, options);
          const theirs = await scoped(fullReference, options);
          const where = scope ? "scoped" : "root";
          if (!scope && ADDED.includes(profile)) {
            const changed = differences(defaults[scheme], theirs).length;
            assert.notEqual(changed, 0, `${profile.name} changed nothing on the root`);
          }
          found.push(...differences(theirs, ours).map((line) => `${where} ${line}`));
        }
        assert.deepEqual(found, [], head(found));
      });
    }
  }

  for (const profile of [...ADDED.filter((added) => UPSTREAM_HELD.includes(added)), ...COLORS]) {
    const file = `/profiles/${profile.facet}/${profile.name}.css`;
    const held = UPSTREAM_HELD.includes(profile);
    test(`dropping any one declaration of ${profile.name}.css fails the comparison`, async () => {
      const options = setup(profile, "light", true);
      const theirs = await scoped(held ? fullReference : fullEntry, options, held);
      const page = await toolsPage(fullEntry, held);
      await page.evaluate(`m.scope(${JSON.stringify(options)})`);
      const tried: Drop[] = await page.evaluate(`m.drops(${JSON.stringify(theirs)}, ["${file}"])`);
      await page.close();
      const written = source(`/dist${file}`).match(/^\s*-*[a-z][\w-]*\s*:[^;{]*;/gm);
      assert.ok(written, `${file} writes no declaration`);
      assert.equal(tried.length, written.length, "every declaration written is tried");
      const missed = tried
        .filter(({ differs }) => differs === 0)
        .map(({ selector, declaration }) => `${selector} { ${declaration} }`);
      assert.deepEqual(missed, [], `dropped unnoticed:\n${head(missed)}`);
    });
  }

  test("dropping any one declaration of the three sheets fails the comparison", async () => {
    const page = await toolsPage(entry, true);
    const rest: Drop[] = await page.evaluate(`m.drops(${JSON.stringify(upstream.rest)})`);
    await forceHover(page);
    const hover: Drop[] = await page.evaluate(`m.drops(${JSON.stringify(upstream.hover)})`);
    await page.close();
    const written = concerns
      .map((c) => source(sheet(c)))
      .join("\n")
      .match(/^\s*-*[a-z][\w-]*\s*:[^;{]*;/gm);
    assert.ok(written, "the three sheets write no declaration");
    assert.equal(rest.length, written.length, "every declaration written is tried");
    const added = new RegExp(`\\.(${ADDED_UTILITIES.join("|")})(?![\\w-])`);
    const missed = rest
      .filter((drop, i) => drop.differs + hover[i].differs === 0 && !added.test(drop.selector))
      .map(({ sheet, selector, declaration }) => `${sheet}: ${selector} { ${declaration} }`);
    assert.deepEqual(missed, [], `dropped unnoticed:\n${head(missed)}`);
  });

  test("demo/profiles.html switches the tools page through every profile and scheme", async () => {
    const page = await browser.open(`${server.origin}/demo/profiles.html`);
    const seen: Record<string, Switch[]> = await page.evaluate(`(async () => {
      const frame = document.querySelector("iframe");
      const ready = () => frame.contentDocument?.documentElement.hasAttribute("data-palette");
      while (!ready()) await new Promise((resolve) => setTimeout(resolve, 10));
      const root = frame.contentDocument.documentElement;
      const tokens = { "data-palette": "--bg", "data-space": "--radius-base", "data-type": "--font-heading" };
      const out = {};
      for (const select of document.querySelectorAll("select")) {
        out[select.name] = [];
        for (const { value } of select.options) {
          select.value = value;
          select.dispatchEvent(new Event("change"));
          const style = frame.contentWindow.getComputedStyle(root);
          out[select.name].push({
            value,
            attribute: root.getAttribute(select.name),
            token: tokens[select.name] && style.getPropertyValue(tokens[select.name]).trim(),
            scheme: style.colorScheme,
          });
        }
        select.selectedIndex = 0;
        select.dispatchEvent(new Event("change"));
      }
      return out;
    })()`);
    await page.close();
    const facets: Record<string, Facet> = {
      "data-palette": "color",
      "data-space": "space",
      "data-type": "type",
    };
    for (const [attribute, facet] of Object.entries(facets)) {
      const options = seen[attribute];
      assert.deepEqual(
        options.map(({ value, attribute: set }) => [value, set]),
        FULL[facet].map((name) => [name, name]),
        attribute,
      );
      assert.equal(new Set(options.map(({ token }) => token)).size, options.length, attribute);
    }
    assert.deepEqual(
      seen["data-scheme"].map(({ value, attribute, scheme }) => [value, attribute, scheme]),
      [
        ["", null, "light dark"],
        ["light", "light", "light"],
        ["dark", "dark", "dark"],
      ],
    );
  });

  test("each sheet is self-layered and @import-free, and a shadow root adopts it alone", async () => {
    const page = await browser.open(`${server.origin}/demo/tools.html`);
    const adopted: Record<string, Adopted> =
      await page.evaluate(`import("/test/browser/support/computed-styles.js")
      .then((m) => m.adopt("/dist"))`);
    await page.close();
    for (const concern of concerns) {
      assert.equal(adopted[concern].imports, 0, `${concern}.css holds an @import`);
      assert.deepEqual(adopted[concern].rules, [`@layer foundation.${concern}`], concern);
    }
    assert.equal(adopted.meta.display, "inline-block");
    assert.notEqual(adopted.meta["padding-left"], "0px");
    assert.equal(adopted.structure.display, "grid");
    assert.notEqual(adopted.structure["row-gap"], "normal");
    assert.equal(adopted.utilities["overflow-y"], "auto");
    assert.notEqual(adopted.utilities["padding-right"], "0px");
  });
});
