import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";
import type { Failure } from "@standards-lab/web-foundation/conformance.js";

const root = join(import.meta.dirname, "../..");

const BACKUPS: Record<string, string> = {
  zen: "seoulbones",
  github: "tomorrow",
  catppuccin: "ayu",
  everforest: "nightfox",
};

const BACKUP_RULES: Record<string, string[]> = {
  tomorrow: ["registered"],
  seoulbones: ["registered"],
  nightfox: ["registered"],
  ayu: ["surfaces", "registered"],
};

const SCHEMES = ["light", "dark"] as const;
type Scheme = (typeof SCHEMES)[number];

type Tokens = Record<string, string>;

function declared(path: string): Record<Scheme, Tokens> {
  const values: Record<Scheme, Tokens> = { light: {}, dark: {} };
  const css = readFileSync(join(root, path), "utf8");
  for (const [, token, light, dark] of css.matchAll(
    /(--[a-z0-9-]+): light-dark\((#[0-9a-f]{6}), (#[0-9a-f]{6})\)/g,
  )) {
    values.light[token] = light;
    values.dark[token] = dark;
  }
  assert.equal(Object.keys(values.light).length, 16, `${path} declares sixteen tokens`);
  return values;
}

interface Shown {
  palette: string;
  scheme: string;
  role: string;
  theme: string;
  swatches: Tokens;
  samples: { text: string; surface: string; color: string; background: string }[];
  borders: Tokens;
}

const READ = `(() => {
  const hex = (color) =>
    "#" + color.match(/\\d+(\\.\\d+)?/g).slice(0, 3).map((c) => Number(c).toString(16).padStart(2, "0")).join("");
  return [...document.querySelectorAll(".sheet")].map((sheet) => ({
    palette: sheet.dataset.palette,
    scheme: sheet.dataset.scheme,
    role: sheet.dataset.role,
    theme: sheet.closest("section[data-theme]").dataset.theme,
    swatches: Object.fromEntries(
      [...sheet.querySelectorAll("[data-token]")].map((el) => [el.dataset.token, hex(getComputedStyle(el).backgroundColor)]),
    ),
    samples: [...sheet.querySelectorAll("[data-text]")].map((el) => ({
      text: el.dataset.text,
      surface: el.dataset.surface,
      color: hex(getComputedStyle(el).color),
      background: hex(getComputedStyle(el).backgroundColor),
    })),
    borders: Object.fromEntries(
      [...sheet.querySelectorAll("[data-border]")].map((el) => [el.dataset.border, hex(getComputedStyle(el).borderTopColor)]),
    ),
  }));
})()`;

let server: Server;
let browser: Browser;
let page: Page;
let registered: string[];
let shown: Shown[];

before(async () => {
  server = await serve({ root });
  browser = await launch();
  page = await browser.open(`${server.origin}/demo/specimen.html`);
  registered = await page.evaluate(
    `globalThis[Symbol.for("web-foundation.registry")]?.color ?? []`,
  );
  shown = await page.evaluate(READ);
});
after(async () => {
  await page?.close();
  await browser?.close();
  await server?.stop();
});

describe("the color specimen", () => {
  test("every registered color profile has a sheet and its backup's, in light and dark", () => {
    assert.deepEqual(registered, Object.keys(BACKUPS));
    const sheets = shown.map(
      ({ theme, palette, role, scheme }) => `${theme} ${role} ${palette} ${scheme}`,
    );
    const expected = registered.flatMap((name) =>
      SCHEMES.flatMap((scheme) => [
        `${name} theme ${name} ${scheme}`,
        `${name} backup ${BACKUPS[name]} ${scheme}`,
      ]),
    );
    assert.deepEqual(sheets, expected);
  });

  test("each sheet shows its stylesheet's values: swatches, text on each surface, borders", () => {
    for (const sheet of shown) {
      const path =
        sheet.role === "theme"
          ? `src/profiles/color/${sheet.palette}.css`
          : `demo/backups/${sheet.palette}.css`;
      const tokens = declared(path)[sheet.scheme as Scheme];
      const where = `${sheet.palette} in ${sheet.scheme}`;
      assert.deepEqual(sheet.swatches, tokens, `${where}: swatches`);
      assert.equal(sheet.samples.length, 33, `${where}: eleven text tokens on three surfaces`);
      for (const { text, surface, color, background } of sheet.samples) {
        assert.equal(color, tokens[text], `${where}: ${text} on ${surface}`);
        assert.equal(background, tokens[surface], `${where}: ${surface} under ${text}`);
      }
      assert.deepEqual(
        sheet.borders,
        { "--border": tokens["--border"], "--border-2": tokens["--border-2"] },
        `${where}: borders`,
      );
    }
  });

  test("the backups are demo sheets: unregistered, and absent from the build", () => {
    const backups = Object.values(BACKUPS);
    assert.deepEqual(
      registered.filter((name) => backups.includes(name)),
      [],
    );
    const built = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? built(join(dir, entry.name)) : [join(dir, entry.name)],
      );
    for (const file of built(join(root, "dist"))) {
      const text = readFileSync(file, "utf8");
      for (const name of backups) {
        assert.ok(!text.includes(`"${name}"`), `${file} names the backup ${name}`);
      }
    }
  });

  test("each backup's conformance, as check() reports it", async () => {
    const results: Record<string, Failure[]> =
      await page.evaluate(`import("/dist/conformance.js").then(async ({ check }) => {
      const results = {};
      for (const name of ${JSON.stringify(Object.values(BACKUPS))}) results[name] = await check("color", name);
      return results;
    })`);
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(results).map(([name, failures]) => [name, failures.map(({ rule }) => rule)]),
      ),
      BACKUP_RULES,
      JSON.stringify(results, null, 2),
    );
  });
});
