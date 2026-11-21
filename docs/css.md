# Why the CSS is built as it is

This page covers the entries, the tool and opt-in sheets, and the color profiles.
[design-reference.md](design-reference.md) gives the reasoning for the baseline's tokens, reset,
and elements layer.

- **No rule declares a role hook**, not even a `:where(:root)` fallback. An inherited `var()`
  resolves at the root, so a root value would carry the root's palette into every `data-palette`
  scope. The contract is the read pattern, `var(--color-danger, var(--red))`, and
  `test/browser/hooks.test.ts` fails if a hook gains a root value.
- **The opt-in sheets are linked after the entry.** Each layers itself and imports nothing, and
  both entries' layer statement names their layers last, in the order glyph, dialog, layout,
  motion. A sheet linked later still sorts into its named place, and a page's own later layer
  wins over all of them. `layout.css` lays out `body` alone, so no shadow root adopts it.
- **The page entries' layer order** puts meta before structure and utilities, so a `.button` that
  is also `.scroll-y` or `.field` computes as in v0.7.0.
- **The application page is `100dvh` tall at least**, not the reset's `100svh`, the smallest
  viewport's, which would leave a strip below main whenever the browser's bars retract. Its
  column is the grid's implicit one, unlike its source's `minmax(0, 1fr)`: main's tracks' least
  sizes are zero, so nothing in main widens it, and the header's widest item never reaches the
  viewport's width. Main's side tracks shrink to nothing below 80ch, as the content track does
  below its width, so no line holds main wider than the viewport.
- **A prose page's section takes the space between sections** as its top margin, since the
  elements layer gives its opening heading none as the container's first child.
- **A dialog's widths cap at the viewport less `--space-s` each side**, measured as `100%` since a
  modal dialog's containing block is the viewport. The cap replaces chromium's own, the viewport
  less about 1em each side, which would hold a wide dialog narrower than its gutters on a phone;
  `.dialog-fit` keeps the dialog's own `fit-content` width. A dialog's heading takes focus as it
  opens, by its autofocus and `tabindex="-1"`, so Close's hint doesn't show; Tab never reaches the
  heading, so it draws no focus outline.
- **A glyph button's block padding is a quarter, and its inline padding a half,** of the text
  button's `--space-s`, which would spend a glyph's width on padding either side.
- **The hint popover keeps its own placement.** Under `position-area` its own `inset: 0` and auto
  margins place it as its source's `inset: auto` and `margin: 0` did, so the source's three
  declarations are left out.
- **`.scroll-x` reserves no gutter**: `scrollbar-gutter` only reserves a vertical scrollbar's
  space. `.scroll-frame`'s one column is `minmax(0, 1fr)`, zero under a min-content constraint and
  its content's widest line under a max-content one.
- **`.field-grow` sizes by `field-sizing: content`**, Baseline newly available; without it the
  control keeps its native size.
- **The color profiles fill what their upstream themes lack.** GitHub's `--bg-2` is the opaque
  color that `neutral.muted`, translucent upstream (`rgba(175, 184, 193, 0.2)` light,
  `rgba(110, 118, 129, 0.4)` dark), produces over `canvas.default`, as the surfaces rule reads a
  surface's luminance. GitHub has no functional cyan, so `--cyan` is its terminal's. Zen's
  upstream has six hues of its own, so wood fills both `--orange` and `--yellow` and blossom both
  `--purple` and `--magenta`. Everforest's purple is a pink-magenta that fills the terminal's
  magenta slot.
