# web-foundation context

web-foundation is the bottom layer of the web client stack: native CSS and ES modules with no
dependencies, released by tag, that every page and every layer above builds on. It holds the
baseline sheets, the swappable color, space, and type profiles, and the behavior every page shares,
so a page built on it looks and behaves like the rest of the effort without a framework. It is the
root of the v1.client.stack goal.

It is a package under the `@standards-lab` scope, starting at v0.1.0 and released by a plain
`vX.Y.Z` tag. Its goals live in the coordinator's roadmap (`standards-lab/roadmap/index.toml`,
v1.client.stack), and its strategy is `standards-lab/context/web-client.md`.

## Release

README.md's "Release" section gives the steps and what the workflow verifies.

## Provenance

The package is seeded by copy from spike-html-apps-foundation at 07ba39a, and spike-html-design
v0.7.0 stays its frozen visual reference, except for the color profiles' values, which follow their
upstream themes (STANDARDS.md, "Design"). The spikes are archived and never a dependency. Each
copied file that takes comments names its source in a provenance line. The JSON files take no
comment, so their provenance is here:

- `package.json` is adapted from spike-html-apps-foundation (07ba39a): package.json. It is renamed
  `@standards-lab/web-foundation` at 0.1.0, takes `@standards-lab/web-tooling` at v0.1.0 as its
  tooling devDependency in place of the spike's tooling, and pins typescript-eslint at 8.73.0.
- `.prettierrc.json` is from spike-html-apps-foundation (07ba39a): .prettierrc.json.
- `pnpm-lock.yaml` is generated, not copied.

## Capability map

- **Baseline** (built): [baseline.css](../src/baseline.css), [baseline/](../src/baseline/).
- **Color roles** (built): [baseline/tokens/color.css](../src/baseline/tokens/color.css).
- **Profiles** (built): [registry.ts](../src/registry.ts), [profiles/](../src/profiles/).
- **Entries** (built): [page.css](../src/page.css), [register.ts](../src/register.ts),
  [page-full.css](../src/page-full.css), [register-full.ts](../src/register-full.ts).
- **Tool sheets and DOM helpers** (built): [meta.css](../src/meta.css),
  [structure.css](../src/structure.css), [utilities.css](../src/utilities.css),
  [dom.ts](../src/dom.ts).
- **Opt-in sheets** (built): [glyph-button.css](../src/glyph-button.css),
  [dialog.css](../src/dialog.css), [layout.css](../src/layout.css), [motion.css](../src/motion.css).
- **Keys** (built): [keys.ts](../src/keys.ts), [keys-grammar.ts](../src/keys-grammar.ts).
- **Theme preferences** (built): [preferences.ts](../src/preferences.ts).
- **Conformance** (built): [conformance.ts](../src/conformance.ts).
- **Specimen** (built): [specimen.html](../demo/specimen.html), [backups/](../demo/backups/).
- **Formatters** (built): [format.ts](../src/format.ts).

## Why the CSS is built as it is

[docs/css.md](../docs/css.md) gives the reasoning.
