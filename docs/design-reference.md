# The baseline and its design reference

The baseline, `src/baseline/` and the default profiles in `src/profiles/`, is a port of
spike-html-design v0.7.0, commit fe75220, the frozen visual reference that
[STANDARDS.md](../STANDARDS.md)'s "Design" section names along with its deliberate exceptions.

## The port

| File here | spike-html-design's |
| --- | --- |
| `src/baseline/tokens/color.css` | `layers/tokens/color.css` |
| `src/baseline/tokens/space.css` | `layers/tokens/space.css` |
| `src/baseline/tokens/type.css` | `layers/tokens/type.css` |
| `src/baseline/reset.css` | `layers/reset.css` |
| `src/baseline/elements.css` | `layers/elements.css` |
| `src/profiles/space/regular.css`, `compact.css` | `layers/tokens/space/regular.css`, `compact.css` |
| `src/profiles/type/mono.css`, `sans.css` | `layers/tokens/type/mono.css`, `sans.css` |
| `src/page-full.css` | `full.css` |

The rules are upstream's, but for these differences:

- Each file wraps its rules in its own layer block, `foundation.*` where upstream has
  `spike-html-design.*`, and imports nothing; the entries import it. A constructed sheet or a CSS
  module script loads no `@import`, so only an entry, which a page links, writes one.
- `baseline.css` fixes the layer order in two statements rather than upstream's one, so no
  formatter joins or breaks the list its own way.
- In `elements.css`, the rule for a block after a block is written `& + &`, nested under the
  blocks' `:where()`, rather than upstream's two `:where()` lists joined by `+`: the same elements
  at the same zero specificity, on lines Prettier, Biome and oxfmt all leave as they are.
- The color hooks take the foundation's role names, `--color-primary` and `--color-accent`, where
  upstream has one hook named for interaction. The focus outline's offset reads the space facet's
  `--focus-offset`, 2px as upstream writes it.
- The space facet adds the control, focus and tint tokens; the color facet names this package's
  default profile; each profile's header says how a page takes its unit.
- Five rules in `elements.css` are the foundation's own, five of STANDARDS.md's six design
  exceptions: progress's accent, the modal-only backdrop, the disabled field, the progress and
  meter track, and the one-line select's block size.

The port is this repository's own code: Prettier formats it, no test holds its text to upstream,
and the browser tier holds what the space and type profiles compute to upstream's values.

## The reset

The reset was weighed against Josh Comeau's custom CSS reset, Andy Bell's modern reset, and
modern-normalize under the feature policy, Baseline newly available plus non-Baseline features
as progressive enhancement, and keeps only what a page on the baseline needs. A test holds the
layout properties it changes to an explicit list.

- `text-size-adjust: 100%`, not `none`, so a reader's own text zoom still applies; it is not
  Baseline, and Safari reads only the prefixed name.
- `dialog` and `[popover]` keep chromium's auto margins, which center them in the viewport.
- Left out on purpose: `-webkit-font-smoothing` (macOS only, non-standard, and the platform's
  rendering is the reader's); `isolation` on an app root (the root element is already a stacking
  context); `interpolate-size` (it serves only motion); `text-wrap` (a type property, which the
  elements layer sets).

## The elements layer

- **Paint only.** A test holds every element's layout properties to chromium's defaults. The one
  size, a one-line select's `--control-block-size`, is there because chromium locks a select's
  `line-height` to `normal`, which no paint reaches, so the select would stand a pixel off a
  field or button beside it; its `1lh` still reads the interface leading.
- **Hooks read per element.** `caret-color` and `accent-color` inherit as a resolved color, so
  set once on the body they would keep the page's palette inside a scope and ignore a hook set
  below the body; every element sets its own. Progress takes `--color-accent` by a later rule at
  the same zero specificity.
- **Whitespace by proximity.** The reset zeroes every margin and the elements layer spaces the
  flow from there: items in a list or group `--space-3xs` apart, blocks `--space-s` apart, and a
  heading far from what came before it, by its level, and `--space-2xs` from what it names.
  Adjacent margins collapse, so a heading right after another sits its own level's space below
  it. A container's first heading takes no top margin, naming headings and heading groups rather
  than every element so dialog and `[popover]` keep their centering auto margins. The space
  between sections, `--space-xl` to `--space-2xl`, is the consumer's layout.
- **Headings** are told apart by size alone, h1 at `--text-3xl` down to h6 at `--text-s`;
  `--text-4xl` is left for text larger than a heading. `text-wrap-style` (balance on headings,
  pretty on paragraphs) leaves `text-wrap-mode`, which is layout, native; pretty is not Baseline,
  so a browser without it wraps as before.
- **Neutral marks.** A quotation's edge is the control boundary's step, `--border-2`, since the
  primary color marks only what can be acted on. Edits stay neutral, as a hue would imply a
  meaning the baseline leaves to the page. Selected text and `mark` are translucent mixes, so
  the text keeps its own color in either scheme.
- **Inline code** inside a link inherits the link's color, so the link's underline runs under it.
- **Tables** collapse their borders into one grid; `border-collapse` is a border property, not
  layout.
- **Disabled fields** sit on `--bg-1` with `--fg-2` text, so a disabled value still reads apart
  from the placeholder's `--fg-3`.
- **Progress and meter** paint their track on `--bg-2`: chromium's native dark track is its own
  gray, and its fallback once a page styles the bar is near white. The rules paint through
  chromium's `::-webkit-progress-bar`, `::-webkit-progress-value`, and `::-webkit-meter-bar`,
  without `appearance`. A progress bar drops its native look when its background is set, so its
  fill is painted too. An indeterminate bar then
  has no fill element, so its track paints a segment two fifths wide as a one-color gradient;
  under reduced motion it stands still at the middle, and otherwise it sweeps from -67% to 167%,
  a segment's width outside either edge. A meter keeps chromium's region-colored fill.
- **The backdrop** is veiled for a modal dialog alone: a popover's stays transparent, so a hint
  shown on hover or inside an open dialog leaves the page as it is, and a fullscreen element's
  stays black.

## The tokens

- The space and type facets each keep their own copy of the fluid expansion, `--space-fluid` and
  `--type-fluid`, so the facets stay independent.
- A custom property inherits with its `var()` already substituted where it was declared, so the
  space steps and derived radii are declared again on every `data-space` scope, and a type scope
  re-sets its font and leading from the tokens it now holds.
- A data-scheme scope works because the tokens hold `light-dark()` unresolved: a custom
  property's value resolves where a property reads it, against that element's `color-scheme`.
- Line widths stay in px: a hairline should not grow with the display.

## The browser tier's copy

`test/fixtures/v0.7.0/` holds spike-html-design v0.7.0's own sheets, its rules unchanged, as the
browser tier's reference. They keep upstream's formatting, which is Biome's, so `.prettierignore`
leaves them out of Prettier's check.
