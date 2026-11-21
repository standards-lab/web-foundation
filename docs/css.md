# Why the CSS is built as it is

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
