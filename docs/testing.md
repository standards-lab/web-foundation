# Testing

Why the tests measure as they do, where a test's name and its assertions don't say.
[use.md](use.md) documents what the sheets and modules promise, and [css.md](css.md) and
[modules.md](modules.md) why they are built as they are; the tests name the behavior each holds to.

## The tiers

- The unit tier runs under Node on the sources, the lint, and a pack of the build.
  `format.test.ts` imports the formatters as a consumer does, through the package's `./format.js`
  export, which resolves to the `dist/` that `mise run build` writes; every case pins its locale,
  en-US, and a date's time zone, UTC. `release.test.ts` checks a `pnpm pack` of that `dist/`, as it
  stands and in scratch copies with one fault each.
- The browser tier runs on `dist/` in the pinned chrome-headless-shell, on the pages under
  `test/fixtures/` and the demo pages under `demo/`. Each in-page half in `test/browser/support/`
  returns plain JSON for `evaluate()`, and its constants are read on Node too. Keys are pressed as
  real keys through the DevTools Protocol, and `:hover` and `:focus-visible` are forced through it,
  so a reading takes the page as it is.
- `declarations.test.ts` runs the check's own tsc, mise's TypeScript-Go pin, not the typescript
  package in `node_modules`. `tsconfig.json` leaves `skipLibCheck` off: with it on, tsc would skip
  every `.d.ts`, and the runtime-code errors with them. Every error tsc reports must fall in the
  scratch tree, so a config tsc can't read fails rather than passing the cases that expect none.

## Against v0.7.0

- `tools.test.ts` compares every element of `demo/tools.html` with spike-html-design v0.7.0's
  sheets in `test/fixtures/v0.7.0/`, at rest and hovered, and drops each declaration in turn to
  show it matters. What the foundation adds to v0.7.0 no comparison reads: `computed-styles.js`
  leaves out the five tokens the space facet adds and the `#elements` section of the tools page,
  which `controls.test.ts` holds, and the added utility classes, which `utilities.test.ts` holds.
- A one-line select's block size, which the elements layer sets to the control block size, moves
  the lines around it; `useSheets()` returns every select to its own size by an unlayered adopted
  sheet, on both sides of a comparison alike.
- The color profiles are the package's own, not v0.7.0's. Every comparison with v0.7.0 pins the
  color tokens on both pages to v0.7.0's default's values, by an unlayered adopted sheet that beats
  every layer, so it holds which token each declaration reads and never a palette's values. zen
  resolves to its own swatches, the upstream values its sheet credits.
- A scoped reading puts the profile's attribute on the body and sets every token of the facet on
  the root to a sentinel no profile holds, so the body shows only what its profile declares. Each
  added space and type profile's declarations, and each color profile's, are dropped one at a time
  on that scope; every drop must show. A space or type profile is read against v0.7.0, pinned; a
  color profile against its own reading, unpinned.
- v0.7.0's lean reading in each scheme is one an added profile must differ from, so a profile that
  applied nothing can't pass. A custom property keeps its source's whitespace, which is formatting,
  so a reading collapses it.
- The registry must hold no profile whose sheet the page didn't load: each entry's registration
  module lists exactly the profiles its sheets define, and each built-in unit's module, imported
  alone, registers its one name and fetches no stylesheet.

## Layout cases

- The layout, dialog, and utilities cases set every length as a style attribute, so the markup lays
  out the same on either side of a shadow boundary. A shadow root adopts the baseline's reset and
  elements sheets, whose selectors stop at the boundary, and the sheets under test; it inherits the
  tokens. `layout.css` lays out the body, so no shadow root adopts it.
- Every case drops each declaration of its sheet in turn and requires the measure to change, so no
  declaration is untested. Layout lengths land on 1/64 px; chromium snaps each padding to 1/64 px
  on its own, so a control's two paddings and the token can part by two of those units.
- The glyphs are inline svgs, 1em a side, as the icons layer draws them.
- The layout probe is fixed, so it takes no grid track and no part of the page's scroll size. The
  bars case sets the small viewport shorter than the dynamic one through the protocol, as a phone's
  retracting bars do.
- The control height case reads each control's rendered height before setting the token as its
  minimum, which would hold the control to it. A scope's probe must read what the root's reads with
  the scope's profile on the root, so no token keeps the root's values.
- A progress bar's or meter's track has no computed style in chromium, so its paint is read from a
  screenshot's pixels, decoded on a canvas: progress at 40%, the optimum meter at 80%, the low one
  at 50%. Under reduced motion the indeterminate segment stands still at the middle, two fifths of
  the track wide; two frames 300ms apart, a fraction of the sweep, tell a moving one.
- In the truncation case, a point past the box's end on its line hits no text, since a clipped
  overflow paints none there. The alternatives case hits inside the hidden alternative's box, past
  the shown one's text.

## Color

- The backdrop veil is a color, so a transparent backdrop can't pass for it. The veils differ as
  the computed `--bg` values do, so a reading that never left one profile would show; two palettes
  that share a `--bg` share a veil. Fullscreen asks for a user gesture, which the evaluation
  carries.
- The hooks cases hold each role's fallback hue distinct, so a reader on the wrong hook can't pass,
  and the scope's distinct from the root's, so a fallback resolved at the root can't either. No
  profile, token, or rule declares a hook.
- The contrast case adds two profiles either side of 4.5:1 on a white `--bg`, `#6c7b67` at
  4.49999…:1 and `#797488` at 4.50000…:1, so the check compares unrounded. A name no stylesheet
  applies sets no value, so the rules that read values are skipped. A sheet served from another
  origin without CORS hides its rules, and the check reads computed values alone.
- The specimen pins each backup's conformance as it stands: a backup that breaks a rule is a fact
  the specimen reports, not one to fix. No backup is registered, and ayu's light raised surfaces
  are lighter than its base, as upstream draws them.

## Keys and preferences

- Every keys fixture shares one origin, and so the reader's stored settings; every preferences page
  shares the one stored choice.
- The sequence wait is short, so a test waits it out quickly. A press that doesn't continue a
  sequence is dropped even where it is bound as a start of its own.
- Chrome and Firefox name a press an input method takes `Process` before `isComposing` is set;
  WebKit sends the key that ends a composition after `compositionend`, not composing. On macOS,
  Option changes the character, so Alt matches a letter by its code.
- Another tab's storage event arrives as a task, so the two-tab cases wait a moment for it; a
  storage cleared in another tab sends a null key.
- The flash cases hold every `dist/` module's fetch and record first paint from a
  `PerformanceObserver` and the moment `data-palette` lands from a `MutationObserver`.

## Layer imports

- `layers-tree.ts` writes every case into one tree, so each is judged beside the others, as the
  package's files are; the before hook asserts every file parses.
- A package by name draws the layer table and `no-extraneous-dependencies`: the manifest declares
  no dependency, and a devDependency ships nothing.
- The package's own name resolves to its build, not its `src/`, and the table alone catches it:
  `no-extraneous-dependencies` (eslint-plugin-import-x 4.18.0) passes a self-import in a package
  whose manifest has an `exports` field, as Node resolves one.
- A value import of a declaration file is caught in each value form, an inline `type` specifier
  among them, since `verbatimModuleSyntax` keeps that import.
- The allowed imports use names that hold dots, which a rule must tell from `.` and `..` segments.
- `lint` runs ESLint with `-c` on the repository's config, whose patterns then match from the tree,
  the working directory, and whose plugins load from the repository's `node_modules`.

## Formatters

- The 1 MB and 20,000-deep JSON cases format in a worker under a per-test timeout, and compare no
  timing: node:test times out only a test's promise, so a stall in the test's own thread would run
  to its end and pass. A linear formatter takes milliseconds; a quadratic one takes minutes over the
  1 MB text.
- The 20,000-deep case bounds the output at the text's length plus 4·64·64 characters: the 64
  formatted levels each add a line break and at most 128 spaces at their opening and closing
  brackets, and the levels below are kept as written.
- The depth-65 case puts an opening brace in a key, an escaped quote before closing brackets, and an
  escaped backslash before a string's real end, then at the cap a string holding the brackets that
  would close it. A bracket count any of these fools ends the kept container early or late.
- The longest-string case fills an array at the cap with ones, about 8 MB: each formats to a comma,
  a line break, and 128 spaces, past V8's longest string, 2²⁹ − 24 characters.
- The keys grammar's symbol case samples the Shift row rather than the whole table, which would
  restate `US_SHIFTED` itself.

## Fixtures

- `demo/demo.css` lays out the main column and its sections alone, never an element the tools page
  gives a tool class, so the comparison of `demo/tools.html` with v0.7.0's sheets reads the same
  layout on both sides and every dropped declaration still shows.
- Each profile under `test/fixtures/conformance/` breaks exactly one rule of its facet, so the
  conformance check fails that rule alone:
  - `*/specific.css`: a selector of specificity (0,1,0), with no `:where()`; fails specificity.
  - `*/unlayered.css`: linked unlayered, outside the facet's layer; fails layer.
  - `*/unregistered.css`: a conforming profile the page never registers; fails registered.
  - `*/missing.css`: one token short (`--magenta`, `--radius-base`, `--leading-code`); fails
    tokens.
  - `color/spacing.css`, `space/coloring.css`, `type/spacing.css`: also set another facet's tokens;
    fail color-only, space-only, and type-only.
  - `color/contrast.css`: dark `--fg` is its `--fg-3`, about 3.75:1 on its `--bg`; fails contrast,
    in dark alone.
  - `color/surfaces.css`: `--bg-1` and `--bg-2` swapped, so the surfaces step away from the text
    after `--bg-1`; fails surfaces.
  - `color/unpainted.css`: also paints its scope's background from `--red`, beating the facet's
    paint rule by order; fails paints.
  - `space/flat.css`: a zero `--space-base`, so every derived step computes to 0px; fails scale.
  - `type/descending.css`: `--text-xl` at 1rem, below `--text-l`; fails scale.
  - `type/unfamilied.css`: a `--font-code` that is a font shorthand, no font-family value; fails
    scale.
