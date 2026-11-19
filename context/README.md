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
pack and whose one parent is main's merge commit, and then dispatches `release.yml` with the tag.
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

- **Baseline**: the tokens, reset, and elements sheets. The tokens include the control, focus,
  and tint tokens on every `data-space` scope, and the elements sheet adds rules for disabled
  fields, bar tracks and fills (an indeterminate bar's segment among them), and the one-line
  select's size.
- **Color roles**: five hooks, `--color-primary`, `--color-accent`, `--color-success`,
  `--color-warning`, and `--color-danger`, which no profile or rule declares, each read with its
  hue as the fallback. Roles live only in the hooks; the hues carry none.
- **Profiles**: the registry of the profiles a page can apply, and the built-in profiles, each a
  sheet with its registration module: four color themes, light and dark, each from its upstream at
  a pin (Zen, the default, GitHub, Catppuccin, and Everforest), regular and compact space,
  and mono and sans type.
- **Entries**: `page.css` with `register.ts`, the defaults alone, and `page-full.css` with
  `register-full.ts`, every built-in profile.
- **Tool sheets and DOM helpers**: the meta, structure, and utilities sheets (buttons, the field
  stack, scroll and table classes, and the utility classes components restate), and the helpers
  to define an element once, emit an event, and require an element.
- **Opt-in sheets**: `glyph-button.css` (the glyph button and its hint popover), `dialog.css` (the
  dialog header and the wide and fit widths), `layout.css` (the application and reading page
  types), and `motion.css` (durations and the pulse and ring loops behind reduced motion), each
  linked after the entry, in the layers the entries name after the utilities: glyph, dialog,
  layout, motion.
- **Keys**: the binding grammar, and the keys family's shortcuts and sequences with the reader's
  settings and `bindings()`, which a help lists. The help itself is web-components'
  `sl-shortcuts`.
- **Theme preferences**: the stored preferences module, applied before first paint and on every
  other tab's save. The settings UI is web-components' `sl-settings`.
- **Conformance**: the profile conformance check, each facet's rules in `RULES`. The `contrast`
  rule holds `--fg` on `--bg` to WCAG's 4.5:1 in light and dark.
- **Specimen**: `demo/specimen.html` shows each color theme, light and dark, beside its backup:
  Zen beside Seoulbones, GitHub beside Tomorrow, Catppuccin beside Ayu, and Everforest beside
  Nightfox. The backups' sheets, in `demo/backups/`, are demo-only: the package and the registry
  hold none.
- **Formatters**: the Intl formatters for bytes, dates, date-times, relative time, and durations,
  and the JSON formatters, `formatJson` and `tryFormatJson`, moved from web-components.

## Why the CSS is built as it is

- **No rule declares a role hook**, not even a `:where(:root)` fallback. An inherited `var()`
  resolves at the root, so a root value would carry the root's palette into every `data-palette`
  scope. The contract is the read pattern, `var(--color-danger, var(--red))`, and
  `test/browser/hooks.test.ts` fails if a hook gains a root value.
- **The opt-in sheets are linked after the entry.** Each layers itself and imports nothing, and
  both entries' layer statement names their layers last, in the order glyph, dialog, layout,
  motion. A sheet linked later still sorts into its named place, and a page's own later layer
  wins over all of them. `layout.css` lays out `body` alone, so no shadow root adopts it.
- **A one-line select is sized to `--control-block-size`**, a size rule in a layer that otherwise
  sets paint only: Chromium forces a select's `line-height` to `normal`, which no paint rule
  reaches, so the select stood a pixel off the field and button beside it. STANDARDS.md lists it
  among the Design exceptions.
- **Bar tracks paint through Chromium's `::-webkit-progress-bar`, `::-webkit-progress-value`, and
  `::-webkit-meter-bar`**, without `appearance`. Setting a progress bar's background drops its
  native fill, so the sheet paints the fill too, and an indeterminate bar, which then has no fill
  element, paints its segment as a one-color gradient on the track. The meter keeps its native
  region fill.
- **Tests read bar paint from screenshot pixels.** Chromium reports no computed style for a bar's
  track, so `test/browser/controls.test.ts` captures the element and decodes the PNG on a canvas
  in the page.
