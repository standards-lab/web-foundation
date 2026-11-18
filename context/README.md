# web-foundation context

web-foundation is the bottom layer of the web client stack: native CSS and ES modules with no
dependencies, released by tag, that every page and every layer above builds on. It holds the
baseline sheets, the swappable color, space, and type profiles, and the behavior every page shares,
so a page built on it looks and behaves like the rest of the effort without a framework. It is the
root of the v1.client.stack goal.

It is a package under the `@standards-lab` scope, starting at v0.1.0 and released by a plain
`vX.Y.Z` tag. Its goals live in the coordinator's roadmap (`standards-lab/context/roadmap.toml`,
v1.client.stack), and its strategy is `standards-lab/context/web-client.md`.

## Release

A person cuts each release by hand: an annotated `vX.Y.Z` tag on a pack commit, whose tree is the
pack and whose one parent is main's merge commit. `release.yml`, dispatched by hand with the pushed
tag (a tag push reads its workflows from the tagged tree, which holds only the pack), verifies the
tag, runs the check, holds the tag's tree to a fresh pack, and publishes the GitHub release.
README.md's "Release" section gives the commands.

## Provenance

The package is seeded by copy from spike-html-apps-foundation at 07ba39a, and spike-html-design
v0.7.0 stays its frozen visual reference. The spikes are archived and never a dependency. Each
copied file that takes comments names its source in a provenance line. The JSON files take no
comment, so their provenance is here:

- `package.json` is adapted from spike-html-apps-foundation (07ba39a): package.json. It is renamed
  `@standards-lab/web-foundation` at 0.1.0, takes `@standards-lab/web-tooling` at v0.1.0 as its
  tooling devDependency in place of the spike's tooling, and pins typescript-eslint at 8.73.0.
- `.prettierrc.json` is from spike-html-apps-foundation (07ba39a): .prettierrc.json.
- `pnpm-lock.yaml` is generated, not copied.

## Capability map

- **Baseline**: the tokens, reset, and elements sheets.
- **Profiles**: the registry of the profiles a page can apply, and the built-in profiles, each a
  sheet with its registration module: four color profiles, light and dark (Flexoki, the default,
  Primer, Catppuccin, and Everforest), regular and compact space, and mono and sans type.
- **Entries**: `page.css` with `register.ts`, the defaults alone, and `page-full.css` with
  `register-full.ts`, every built-in profile.
- **Tool sheets and DOM helpers**: the meta, structure, and utilities sheets (buttons, the field
  stack, and scroll and table classes), and the helpers to define an element once, emit an event,
  and require an element.
- **Keys**: the binding grammar, the keys family's shortcuts and sequences with the reader's
  settings, and the keyboard help dialog.
- **Theme preferences**: the stored preferences module, applied before first paint, and the theme
  menu.
- **Conformance**: the profile conformance check, each facet's rules in `RULES`. It has no
  contrast rule: a contrast rule, at WCAG's 4.5:1, is the `palettes` task's.
- **Formatters**: the Intl formatters for bytes, dates, date-times, relative time, and durations.
