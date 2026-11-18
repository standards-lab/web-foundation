<!-- Adapted from web-tooling (1ff49e4): CHANGELOG.md, for @standards-lab/web-foundation, with none
of spike-html-apps-foundation's versions. -->

# Changelog

All notable changes to `@standards-lab/web-foundation` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/standards-lab/web-foundation/releases/tag/v0.1.0
