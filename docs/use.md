# Use

The package is `@standards-lab/web-foundation`. A page links one page entry and imports the
modules by their `.js` subpaths. The lean entry, `page.css`, carries the default profiles, and
`register.js` registers them. `<base>` is where the package's `dist/` is served from, such as
`node_modules/@standards-lab/web-foundation/dist`:

```html
<link rel="stylesheet" href="<base>/page.css" />
<script type="module" blocking="render" src="<base>/register.js"></script>
<script type="module" blocking="render" src="<base>/preferences.js"></script>
<script type="module">
  import { register } from "@standards-lab/web-foundation/keys.js";
</script>
```

- `./*.css`: the stylesheets, each self-layered so a shadow root adopts it alone: the page
  entries `page.css` and `page-full.css`, `baseline.css`, the tool sheets (`meta.css`,
  `structure.css`, and `utilities.css`), and the opt-in `glyph-button.css`, `dialog.css`,
  `layout.css` and `motion.css`, which neither entry imports.
- `./profiles/<facet>/<name>.{css,js}`: the built-in profiles, each a unit of a sheet and a
  registration module. Color has `zen` (the default), `github`, `catppuccin`, and
  `everforest`; space has `regular` (the default) and `compact`; type has `mono` (the default)
  and `sans`. A page adds a unit by linking its sheet after `page.css` and importing its module
  beside `register.js`. `page-full.css` and `register-full.js` import every unit, in place of
  `page.css` and `register.js`.
- `./*.js`: the modules, with their `.d.ts`: `dom.js`, `registry.js`, `keys.js`,
  `keys-grammar.js`, `register.js`, `register-full.js`, `preferences.js`, `conformance.js`, and
  `format.js`.
- `./preferences.js`: applies the reader's stored theme choice to the root before first paint and
  applies each save another tab makes. `read()`, `apply(choice, el)`, and `save(choice)` are a
  settings UI's to call. A page loads it with `blocking="render"` after its registration modules.
- `./keys.js`: the page's keyboard shortcuts. An element with `data-keys` is clicked or focused by
  its keys, and `register(keys, label, handler)` binds a handler and returns its removal.
  `bindings(dialog)` lists the bindings active were the dialog closed, for a page's own help;
  `settings()` and `changeSettings(change)` read and store the reader's settings, the off switch
  for character keys and the wait between presses, one of `WAITS`.
- `./conformance.js`: `check(facet, name)` reads a registered profile's computed values and
  resolves to a failure, a rule from `RULES` and a message, for each rule the profile breaks; an
  empty list conforms.
- `./format.js`: the Intl formatters, `formatBytes`, `formatDate`, `formatDateTime`,
  `formatRelative`, and `formatDuration`, each taking an optional locale and options; and the JSON
  formatters. `formatJson(text)` re-indents valid JSON from its own tokens, two spaces a level,
  each token as written: keys keep their order and duplicates, numbers their literals, strings
  their escapes. A container that would open deeper than `JSON_MAX_DEPTH` (64) is kept as
  written, so the output stays linear in the text at any depth. It doesn't check the text, so
  `tryFormatJson(text)` is the one to call on text from outside: `{ ok: true, text }`, formatted,
  when `JSON.parse` accepts it (or unchanged when the formatting would pass the longest string),
  and `{ ok: false, reason }`, the parser's message, when it doesn't. Neither touches the DOM.
- `./css`: the ambient `*.css` declaration for CSS module scripts,
  `import sheet from "./x.css" with { type: "css" }`, for a project's `types`.

Colors carry roles through five hooks, custom properties that no profile declares, each read
with a hue of the palette as its fallback:

- `--color-primary`, by default `--blue`: what you can act on. Links, the focus outline, the
  caret, selected text, the hover border of fields, neutral buttons and `meta.css`'s `.button`,
  and `accent-color`, which tints checkboxes, radios, and ranges, follow it.
- `--color-accent`, by default `--magenta`: what is current, active, or in progress. Native
  `progress`'s fill, and an indeterminate bar's segment, follow it.
- `--color-success` (`--green`), `--color-warning` (`--orange`), and `--color-danger` (`--red`):
  what went well, what needs care, and what fails or destroys. No baseline rule reads them yet.

A page sets a hook on any element, in its own layer, and that subtree alone follows:
`.danger-zone { --color-primary: var(--color-danger, var(--red)); }`. A page or component that
reads a hook writes its fallback where it reads it, `var(--color-success, var(--green))`, so an
unset hook resolves to the hue in the element's own palette and scheme. The hues themselves carry
no role. `accent-color`, the CSS property, follows `--color-primary` on every element except
`progress`, where it follows `--color-accent`.

Five tokens size and space a component against the controls and the focus outline, declared on
the root and every `data-space` scope: `--control-edge` (a control's block padding and border,
both sides), `--control-block-size` (`1lh` plus the edge: a one-line field, select or button's
height, read where the line is the interface's), `--focus-offset` (2px, the focus outline's
offset), `--focus-reach` (the outline's width plus its offset), and `--tint` (12%, a hook's
surface strength: `color-mix(in srgb, var(--color-accent, var(--magenta)) var(--tint),
transparent)`).

The elements sheet keeps spike-html-design v0.7.0's look for native elements but for these rules
(STANDARDS.md, "Design", gives each reason):

- A disabled text field, select, or textarea takes the `--border` boundary, the `--bg-1` surface,
  and `--fg-2` text, and shows no hover change.
- `progress` and `meter` paint their track on `--bg-2` in both schemes. `progress` paints its
  fill in `--color-accent`, and an indeterminate `progress` paints a `--color-accent` segment, two
  fifths of the track wide, that sweeps across under `prefers-reduced-motion: no-preference` and
  stands in the middle under `reduce`. A meter's fill keeps the native color of its value's region.
- A one-line `select` is `--control-block-size` tall, the height of a field or button beside it.
- Only a modal dialog's `::backdrop` is veiled.

`utilities.css`, which both entries import and a shadow root adopts alone, adds to the scroll and
table classes the patterns components restate:

- `.list-bare`: a list of items, with no markers, no indent, and no step between items.
- `.text-nowrap` keeps a value on one line; `.text-numeric` also gives its digits one width.
- `.text-break`: an unbroken value, an id or a path, that moves to the next line whole and breaks
  inside only when it alone is wider than the line.
- `.text-truncate`: one line, cut with an ellipsis, on a block or a flex or grid item.
- `.scroll-frame`, inside a host that is a flex column (`display: flex; flex-direction:
  column`): as tall as its content, scrolling inside once the host is held shorter, filling a host
  held taller, and as wide as its content in a shrink-to-fit parent, never wider than the parent.
- `.alternatives`: a cell as wide as its widest child, each stacked in one place; a child marked
  `aria-hidden="true"` keeps its space but isn't shown.
- `.head-row` around `.head-name` and `.head-end`: the name grows to its own width, the label sits
  at the line's end, and wraps under the name only when the two don't fit.
- `.text-quiet-s` and `.text-quiet-xs`: `--text-s` or `--text-xs`, in `--fg-2`.
- `.status-line`, on one `<p role="status">` rendered in every state: the quiet type, a line tall
  when blank.
- `.visually-hidden`: a label kept for assistive technology that takes no space.

`motion.css` is opt-in: a page links it after its entry, and a shadow root adopts it. Its layer,
`foundation.motion`, is named in both entries' layer statement, after the utilities. It declares
`--duration-s` (120ms) and `--duration-m` (200ms) on the root and on an adopting host, and the
keyframes `pulse` and `ring`; `.motion-pulse` and `.motion-ring` run them only under
`prefers-reduced-motion: no-preference`, and under `reduce` nothing animates.

`glyph-button.css` and `dialog.css` are opt-in too: a page links them after its entry, and a
component adopts them into its shadow root after `baseline/reset.css` and `baseline/elements.css`.
Their layers, `foundation.glyph` and `foundation.dialog`, are named in both entries' layer
statement after the utilities, before `foundation.motion`.

- `.glyph-button`, on a native `<button>`: its glyph, an svg 1em a side, and an optional key hint,
  a `kbd`, in one centered row, on the native button's border, surface, hover and focus ring. The
  glyph alone is at least 24x24 CSS px in every profile. Name it by `aria-label`.
- `.glyph-hint`, on a `popover="hint"` element the button's `interestfor` names, holding the
  button's name: shown below the button on hover and keyboard focus, above it where the viewport's
  foot would cut it, in the page's colors reversed; Escape dismisses it, and no script runs. Mark
  it `aria-hidden="true"`, and give the button `aria-description=""`, so the name is read once.
- `.dialog-header`, a dialog's first child: its heading at the inline start and a Close glyph
  button (`commandfor` the dialog, `command="close"`) at the end, `--space-m` above the content. A
  heading with `tabindex="-1"` that takes focus as the dialog opens draws no outline.
- `.dialog-wide` is the viewport less `--space-s` each side, up to 56rem; `.dialog-fit` is as wide
  as its content, up to the same cap.

Close and Escape close a dialog opened by `command="show-modal"` with no script.

`layout.css` is the page layout, opt-in as well: a page links it after its entry and chooses a
page type by its body's class; a page with neither lays itself out. Its layer, `foundation.layout`,
is named in both entries' layer statement after `foundation.dialog`, before `foundation.motion`.
No script measures anything.

- `body.page-app`, an application page: one screen, the header row over `main`, at least the
  dynamic viewport tall, `main` taking every row the header leaves. `--page-gutter` (by default
  `--space-m`, set on the body) spaces the inline sides and the block end. `main` is a grid with
  the named column lines `content`, at most 80ch and centered, where every child sits, and `full`,
  the whole width between the gutters, where a page places a child itself (`grid-column: full`).
  Its rows pack at the top; a page whose workspace takes the rest sets `grid-template-rows: auto
  1fr` on `main`.
- `body.page-prose`, a reading page: `main` an 80ch column centered inside the gutters, its
  sections `--space-xl` apart, with `--space-2xl` below it.
- In both, `body > header` is a row: the page's name or nav at the inline start and a
  `.header-actions` group of glyph buttons at the inline end. Where the group doesn't fit beside
  the name, as at 200% text in a 390px viewport, it takes a line of its own and its buttons wrap,
  so the page never scrolls sideways.

A package outside the foundation adds a profile as a built-in unit does: a sheet that declares
its facet's tokens in one `:where([data-<attribute>="<name>"])` block inside that facet's layer,
`foundation.tokens.<facet>`, and a registration module that calls `register(facet, name)` from
`registry.js`. The page links the sheet after its entry and imports the module, and the registry's
`profiles(facet)` then lists the profile. The profile must pass `check(facet, name)`.

## Storage and global keys

Every page on an origin shares what the foundation stores, under these `localStorage` keys:

- `web-foundation.preferences`: the reader's theme choice, `preferences.js`'s exported `KEY`.
- `web-foundation.keys`: the reader's keys settings, the off switch for character keys and the
  wait between the presses of a sequence.

Every copy of a module on a page shares its state through a `Symbol.for` key on `globalThis`:
`web-foundation.registry`, the registered profiles; `web-foundation.keys`, the bindings; and
`web-foundation.keys.modals`, the modals focus has entered.
