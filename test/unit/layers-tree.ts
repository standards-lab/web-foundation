// The layer's import cases as one file tree in the repository's shape: a file per forbidden import
// and form, each with the rules that catch it, and the imports the layer may make in the same
// layout.
// Adapted from spike-html-apps-foundation (07ba39a): test/unit/layers-tree.ts, its comment on the app reworded for this package.
// Adapted from spike-html-packages-foundation (5dd8a58): test/unit/layers-tree.js, renamed, in TypeScript.
// See docs/testing.md.

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const root = join(import.meta.dirname, "../..");

/** The package's manifest as it stands, which the tree carries. */
export const manifest: { name: string; devDependencies: Record<string, string> } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
const foundation = manifest.name;

const siblings = ["components", "sdk"].map((layer) => foundation.replace(/foundation$/, layer));
const app = foundation.replace(/-foundation$/, "");

/** The layer table's rule. */
export const table = "boundaries/dependencies";
/** The rule against a package the manifest doesn't declare. */
export const extraneous = "import-x/no-extraneous-dependencies";
/** The rule against a declared package reached by a relative path. */
export const relativePackages = "import-x/no-relative-packages";
/** The rule that admits a .css import only as a static CSS module script. */
export const cssModule = "no-restricted-syntax";
/** The rules the lint flags the tree with, no-unresolved among them, which no case may draw. */
export const watched = [table, extraneous, relativePackages, cssModule, "import-x/no-unresolved"];

function forms(base: string, specifier: string): Record<string, string> {
  return {
    [`${base}.ts`]: `import "${specifier}";`,
    [`${base}-type.ts`]: `import type { X } from "${specifier}";`,
    [`${base}-export.ts`]: `export * from "${specifier}";`,
    [`${base}-dynamic.ts`]: `await import("${specifier}");`,
  };
}

/** A forbidden import's file: its source and the rules that flag it. */
export interface Case {
  source: string;
  rules: string[];
}

function by(rules: string[], files: Record<string, string>): Record<string, Case> {
  return Object.fromEntries(
    Object.entries(files).map(([path, source]) => [path, { source, rules: [...rules].sort() }]),
  );
}

const undeclaredPackages = by([table, extraneous], {
  "src/lit.ts": `import { html } from "lit";`,
  ...forms("src/forms/lit", "lit"),
  ...forms("src/forms/components", `${siblings[0]}/status-badge.js`),
  ...forms("src/forms/sdk", `${siblings[1]}/client.js`),
  "src/app.ts": `import { define } from "${app}/main.js";`,
  ...forms("src/forms/typescript", "typescript"),
});

const ownName = by([table], forms("src/forms/self-name", `${foundation}/dom.js`));

const relativeIntoNodeModules = by([table, relativePackages], {
  "src/lit-path.ts": `import "../node_modules/lit/index.js";`,
});

const declarationValueImports = by([table], {
  "src/format-value.ts": `import { formatBytes } from "./format.js";`,
  "src/format-side-effect.ts": `import "./format.js";`,
  "src/format-inline-type.ts": `import { type BytesOptions } from "./format.js";`,
  "src/format-export.ts": `export { formatBytes } from "./format.js";`,
  "src/format-export-all.ts": `export * from "./format.js";`,
  "src/format-dynamic.ts": `await import("./format.js");`,
  "src/nested/format-value.ts": `import { formatBytes } from "../format.js";`,
});

const nonModuleCss = by([cssModule], {
  "src/css-side-effect.ts": `import "./x.css";`,
  "src/css-default.ts": `import sheet from "./x.css";`,
  "src/css-json.ts": `import sheet from "./x.css" with { type: "json" };`,
  "src/css-export.ts": `export { default } from "./x.css";`,
  "src/css-export-all.ts": `export * from "./x.css";`,
  "src/css-dynamic.ts": `await import("./x.css");`,
  "src/css-dynamic-json.ts": `await import("./x.css", { with: { type: "json" } });`,
  "src/css-dynamic-module.ts": `await import("./x.css", { with: { type: "css" } });`,
  "src/css-dynamic-quoted.ts": `await import("./x.css", { "with": { "type": "css" } });`,
  "src/css-dynamic-template.ts": "await import(`./x.css`, { with: { type: 'css' } });",
  "src/css-dynamic-computed.ts": "const name = 'x'; await import(`./${name}.css`);",
});

/** Each forbidden import's file, named for what it imports, with the rules that flag it. */
export const violations = {
  ...undeclaredPackages,
  ...ownName,
  ...relativeIntoNodeModules,
  ...declarationValueImports,
  ...nonModuleCss,
};

/** `cases`, each path to its source alone. */
export const sources = (cases: Record<string, Case>): Record<string, string> =>
  Object.fromEntries(Object.entries(cases).map(([path, { source }]) => [path, source]));

/** Every import the layer may make, in each form, each file's path to its source. */
export const allowed: Record<string, string> = {
  "src/dom.ts": `export { x } from "./events.ts";`,
  "src/nested/own.ts": `import type { X } from "../dom.ts";\nawait import("../dom.ts");`,
  "src/nested/index.ts": `import "..";\nexport * from "./";`,
  "src/dotted.ts": `import "./..x/y.ts";\nimport "./.well-known/a.ts";`,
  "src/format-type.ts": `import type { formatBytes } from "./format.js";`,
  "src/format-export-type.ts": `export type { BytesOptions } from "./format.js";`,
  "src/format-typeof.ts": `import type { formatBytes } from "./format.js";\nexport type F = typeof formatBytes;`,
  "src/css-module.ts": `import sheet from "./x.css" with { type: "css" };`,
  "src/css-quoted.ts": `import sheet from "./x.css" with { "type": "css" };`,
  "src/css-export-module.ts": `export { default } from "./x.css" with { type: "css" };`,
};

const targets = {
  "src/events.ts": "export const x = 1;",
  "src/index.ts": "export {};",
  "src/..x/y.ts": "export {};",
  "src/.well-known/a.ts": "export {};",
  "src/format.d.ts": [
    "export type BytesOptions = Omit<Intl.NumberFormatOptions, 'style' | 'unit'>;",
    "export declare function formatBytes(bytes: number): string;",
  ].join("\n"),
  "src/x.css": ".x {}",
  "dist/dom.js": "export {};",
  "dist/dom.d.ts": "export interface X {}",
};

const externals = ["lit", ...siblings, app, "typescript"];
const stub = (name: string): Record<string, string> => ({
  "package.json": JSON.stringify({
    name,
    type: "module",
    exports: {
      ".": { types: "./index.d.ts", default: "./index.js" },
      "./*": { types: "./index.d.ts", default: "./index.js" },
    },
  }),
  "index.js": "export const html = () => {};\nexport const define = () => {};",
  "index.d.ts": [
    "export declare const html: () => void;",
    "export declare const define: () => void;",
    "export interface X {}",
  ].join("\n"),
});

/** Writes `files` under `dir` with what their imports resolve to; returns its src/ code files. */
export function writeTree(dir: string, files: Record<string, string>): string[] {
  const written: Record<string, string> = {
    ...files,
    ...targets,
    "package.json": JSON.stringify(manifest),
  };
  for (const name of externals) {
    for (const [path, source] of Object.entries(stub(name))) {
      written[join("node_modules", name, path)] = source;
    }
  }
  for (const [path, source] of Object.entries(written)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), `${source}\n`);
  }
  const self = join(dir, "node_modules", foundation);
  mkdirSync(dirname(self), { recursive: true });
  symlinkSync(relative(dirname(self), dir), self);
  return Object.keys(written).filter((path) => path.startsWith("src/") && /\.(js|ts)$/.test(path));
}

/** A file of ESLint's JSON report, with the fields the cases read. */
export interface LintResult {
  filePath: string;
  messages: { ruleId: string | null; fatal?: boolean }[];
}

/** ESLint's JSON report, under the repository's config, on the tree under `dir`'s src/. */
export function lint(dir: string): LintResult[] {
  const eslint = join(root, "node_modules", ".bin", "eslint");
  const run = spawnSync(eslint, ["-c", join(root, "eslint.config.js"), "-f", "json", "src"], {
    cwd: dir,
    encoding: "utf8",
  });
  if (run.error) throw new Error(`eslint didn't run: ${run.error}`);
  if (run.status !== 0 && run.status !== 1) {
    throw new Error(`eslint exited ${run.status}: ${run.stderr}`);
  }
  return JSON.parse(run.stdout);
}
