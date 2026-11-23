# web-foundation context

web-foundation is the bottom layer of the web client stack: native CSS and ES modules with no
dependencies, released by tag, that every page and every layer above builds on. It holds the
baseline sheets, the swappable color, space, and type profiles, and the behavior every page shares,
so a page built on it looks and behaves like the rest of the effort without a framework. It is the
root of the v1.client.stack goal.

It is a package under the `@standards-lab` scope, released by a plain `vX.Y.Z` tag. Its goals live
in the coordinator's roadmap (`standards-lab/roadmap/index.toml`, v1.client.stack), and its
strategy is `standards-lab/context/web-client.md`.

## Release

README.md's "Release" section gives the steps and what the workflow verifies.

## Provenance

spike-html-design v0.7.0 stays the package's frozen visual reference, except for the color
profiles' values, which follow their upstream themes (STANDARDS.md, "Design"). The package's
lineage is in the workspace's [references catalog](https://github.com/standards-lab/org/blob/main/references.md).

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

## Where the design reasoning lives

[docs/design-reference.md](../docs/design-reference.md) gives the baseline's port of
spike-html-design and the reasoning behind its rules, [docs/css.md](../docs/css.md) the reasoning
behind the other sheets, and [docs/modules.md](../docs/modules.md) the reasoning behind the
modules.
