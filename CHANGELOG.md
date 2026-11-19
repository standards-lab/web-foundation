<!-- Adapted from web-tooling (1ff49e4): CHANGELOG.md, for @standards-lab/web-foundation, with none
of spike-html-apps-foundation's versions. -->

# Changelog

All notable changes to `@standards-lab/web-foundation` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-11-19

This minor release breaks a page that uses the theme menu, the keys help, preferences' menu state,
`Listed`'s `run`, or either color hook. Settings and Help move to web-components, and the color
hooks take the five role names. No alias or shim maps a removed or renamed name.

### Breaking

- `<sl-theme-menu>`, `theme-menu.js`, `theme-menu.css`, and `preferences.js`' `ThemeMenu` export
  are removed, with the `foundation.theme-menu` layer in both entries' layer statement: use
  web-components' `sl-settings`, from web-components v0.2.0, or a page's own settings that call
  `preferences.js`' `read()`, `apply()`, and `save()`.
- `preferences.js`' `setOpen` and `isOpen` are removed, with no replacement: `preferences.js` now
  applies every save another tab makes.
- `keys-help.js` is removed, and `keys.js` no longer fills a dialog's `[data-keys-list]` element
  as it opens: use web-components' `sl-shortcuts`, from web-components v0.2.0, or a page's own help listing
  `bindings()`. A
  dialog holding `[data-keys-list]` opens as the page wrote it, and no module loads.
- `Listed`, the binding `bindings()` lists, loses `run`, with no replacement: a help lists the
  bindings as text.
- `--interaction-color` is renamed `--color-primary`.
- `--accent-color` is renamed `--color-accent`.

The storage and `Symbol.for` keys are unchanged, so a reader's stored theme and keys settings carry
over.

### Added

- Three more role hooks, which no profile declares: `--color-success` (falling back to `--green`),
  `--color-warning` (`--orange`), and `--color-danger` (`--red`), beside `--color-primary`
  (`--blue`) and `--color-accent` (`--magenta`). A hook set on a subtree recolors that subtree
  alone; a reader writes the fallback where it reads one, `var(--color-danger, var(--red))`.
- Tokens on the root and every `data-space` scope: `--control-edge`, `--control-block-size`,
  `--focus-offset` (2px, which the focus outline reads), `--focus-reach`, and `--tint` (12%).
- Element rules: a disabled text field, select, or textarea takes the `--border` boundary, the
  `--bg-1` surface and `--fg-2` text, with no hover change; `progress` and `meter` paint their
  track on `--bg-2` in both schemes; a one-line `select` is `--control-block-size` tall.
- Utility classes in `utilities.css`: `.list-bare`, `.text-nowrap`, `.text-numeric`,
  `.text-break`, `.text-truncate`, `.scroll-frame`, `.alternatives`, `.head-row` with
  `.head-name` and `.head-end`, `.text-quiet-s`, `.text-quiet-xs`, `.status-line`, and
  `.visually-hidden`.
- Four opt-in sheets, which a page links after its entry and neither entry imports, each in a
  layer both entries' layer statement names after the utilities, in the order glyph, dialog,
  layout, motion:
  - `glyph-button.css`: `.glyph-button`, a glyph and an optional key hint in a native button, and
    `.glyph-hint`, its `popover="hint"` name, shown on hover and keyboard focus with no script.
  - `dialog.css`: `.dialog-header`, a dialog's heading and Close button, and the widths
    `.dialog-wide` and `.dialog-fit`, capped at 56rem.
  - `layout.css`: the page types `body.page-app`, an application page of one screen, and
    `body.page-prose`, a reading column, each with a `body > header` row and its
    `.header-actions`.
  - `motion.css`: `--duration-s` and `--duration-m`, the keyframes `pulse` and `ring`, and
    `.motion-pulse` and `.motion-ring`, which run only under `prefers-reduced-motion:
    no-preference`.
- `format.js`' `formatJson(text)`, from web-components' `json.js`: valid JSON re-indented two
  spaces a level from its own tokens, each as written, with containers past `JSON_MAX_DEPTH` (64)
  kept as written; `tryFormatJson(text)`, which gives `{ ok: true, text }` for text `JSON.parse`
  accepts and `{ ok: false, reason }` for text it refuses; and their type, `FormattedJson`.
- Demo pages: `hooks.html`'s five roles, `utilities.html`, `dialogs.html`, `app.html`,
  `prose.html`, and `format.html`'s JSON samples, each captured by `mise run screenshots`.

### Changed

- Everything that followed `--interaction-color` follows `--color-primary`: links, the focus
  outline, the caret, the selection, the hover border of fields, neutral buttons and `.button`,
  and `accent-color`. `progress` follows `--color-accent`, its fill included.
- `preferences.js` applies every save another tab makes, where it skipped one while the theme menu
  was open.
- The theme and unit demo pages switch the choice with plain selects, and the keys demo page lists
  `bindings()` as text.

## [0.3.0] - 2026-11-18

This minor release breaks a page that relies on the default palette or names `zenwritten`: the
color profile `zenwritten` is now `zen`, and it is the default.

### Changed

- The Zenwritten color profile is renamed `zen`: its sheet and registration module are
  `profiles/color/zen.css` and `profiles/color/zen.js`, and `data-palette="zen"` applies it. Its
  values are unchanged. A reader's stored `zenwritten` choice now applies the default, `zen`, and
  stays in storage; no alias maps the old name.
- The default color profile is now Zen: it applies with no attribute, and `page.css` and
  `register.js` carry it alone. GitHub moves to `page-full.css` and `register-full.js`, and to a
  unit a page links after `page.css`.
- The full entry, its registration module, and the theme menu order the color profiles zen,
  github, catppuccin, everforest.

## [0.2.0] - 2026-11-18

This minor release breaks a page that relies on the default palette or names a removed profile:
the default color profile is now GitHub, and `flexoki` and `primer` are gone.

### Added

- The conformance rule `contrast`: a color profile's `--fg` on its `--bg` reaches 4.5:1 in light
  and in dark.
- The specimen demo page, `demo/specimen.html`, which shows each color theme beside its backup.
  The backups' sheets live in `demo/backups/`, outside the package.

### Changed

- The built-in color profiles are four themes, each taking its values from its upstream at a pin:
  GitHub, the new default; Zenwritten; Everforest, its medium contrast; and Catppuccin, latte in
  light and mocha in dark, with `--bg` now its base.

### Removed

- The `flexoki` and `primer` color profiles. A reader's stored `flexoki` or `primer` choice
  applies the default, `github`.

## [0.1.0] - 2026-11-18

### Added

- The foundation package, seeded by copy from spike-html-apps-foundation v0.3.1 (07ba39a), with
  spike-html-design v0.7.0 as its frozen visual reference. It has no runtime dependency; its
  sources are CSS and TypeScript, which tsc builds into `dist/`, each module's `.js` with its
  `.d.ts`, the sheets beside them.
- The baseline: the tokens, reset, and elements sheets in `baseline.css`, each self-layered so a
  shadow root adopts it alone. Two color hooks, `--interaction-color` and `--accent-color`, which
  no profile declares, fall back to `--blue` and `--magenta`.
- The profiles: `registry.js`, the registry of the profiles a page can apply, and the built-in
  profiles, each a sheet with its registration module: four color profiles, light and dark
  (Flexoki, the default, Primer, Catppuccin, and Everforest), regular and compact space, and mono
  and sans type.
- The page entries: `page.css` with `register.js`, the defaults alone, and `page-full.css` with
  `register-full.js`, every built-in profile.
- The tool sheets, `meta.css`, `structure.css`, and `utilities.css` (buttons, the field stack, and
  scroll and table classes), and `dom.js`, the helpers to define an element once, emit an event,
  and require an element.
- The keys family: `keys-grammar.js`, the binding grammar; `keys.js`, the page's shortcuts and
  sequences with the reader's settings; and `keys-help.js`, the keyboard help dialog.
- The theme preferences: `preferences.js`, the reader's stored choice applied before first paint,
  whose `<sl-theme-menu>` loads `theme-menu.js`, the theme menu, on its first open.
- `conformance.js`: `check(facet, name)` reads a registered profile's computed values against each
  facet's rules in `RULES`.
- `format.js`: the Intl formatters for bytes, dates, date-times, relative time, and durations.
- The keys every page on an origin shares: the `localStorage` keys `web-foundation.preferences`
  and `web-foundation.keys`, and the `Symbol.for` keys `web-foundation.registry`,
  `web-foundation.keys`, and `web-foundation.keys.modals` on `globalThis`.
- The browser tier on `@standards-lab/web-tooling` v0.1.0, its driver, server, and screenshot
  command, in a pinned chrome-headless-shell.
- Releases by tag: each `v<version>` tag marks a pack commit whose tree is the pack, the build
  included, and whose one parent is main's merge commit; its GitHub release carries the tarball.

[0.4.0]: https://github.com/standards-lab/web-foundation/releases/tag/v0.4.0
[0.3.0]: https://github.com/standards-lab/web-foundation/releases/tag/v0.3.0
[0.2.0]: https://github.com/standards-lab/web-foundation/releases/tag/v0.2.0
[0.1.0]: https://github.com/standards-lab/web-foundation/releases/tag/v0.1.0
