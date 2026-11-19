<!-- Adapted from spike-html-apps-foundation (07ba39a): README.md, for
@standards-lab/web-foundation. -->

# web-foundation

The native foundation of the standards-lab web client stack: the baseline stylesheets (tokens,
reset, and elements), the profiles for color, space, and type, the tool sheets (meta, structure,
and utilities), the DOM helpers, the registry and keys family, the theme preferences and menu, the
conformance check for profiles, and the Intl formatters. It is plain CSS and ES modules with their
type declarations, with no runtime dependency, and is released by git tag.

## Install

Each release is a tag, `v<version>`, of
[standards-lab/web-foundation](https://github.com/standards-lab/web-foundation), whose tree is the
package as `pnpm pack` builds it: `package.json`, this README, the LICENSE, and `dist/`, the build.
The build lives only in the tag's tree, so the tag installs with no build step, and its manifest
has no scripts. Install it by the tag:

```
pnpm add github:standards-lab/web-foundation#v0.1.0
bun add github:standards-lab/web-foundation#v0.1.0
npm install --allow-git=root github:standards-lab/web-foundation#v0.1.0
```

npm 12 refuses git dependencies unless `--allow-git` allows them; `root` allows the ones the
project itself declares. Each GitHub release also carries the tarball.

## Use

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
  `structure.css`, and `utilities.css`), and the opt-in `glyph-button.css`, `dialog.css` and
  `motion.css`, which neither entry imports.
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
  `formatRelative`, and `formatDuration`, each taking an optional locale and options.
- `./css`: the ambient `*.css` declaration for CSS module scripts,
  `import sheet from "./x.css" with { type: "css" }`, for a project's `types`.

Colors carry roles through five hooks, custom properties that no profile declares, each read
with a hue of the palette as its fallback:

- `--color-primary`, by default `--blue`: what you can act on. Links, the focus outline, the
  caret, selected text, the hover border of fields, neutral buttons and `meta.css`'s `.button`,
  and `accent-color`, which tints checkboxes, radios, and ranges, follow it.
- `--color-accent`, by default `--magenta`: what is current, active, or in progress. Native
  `progress` follows it.
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

A package outside the foundation adds a profile as a built-in unit does: a sheet that declares
its facet's tokens in one `:where([data-<attribute>="<name>"])` block inside that facet's layer,
`foundation.tokens.<facet>`, and a registration module that calls `register(facet, name)` from
`registry.js`. The page links the sheet after its entry and imports the module, and the registry's
`profiles(facet)` then lists the profile. The profile must pass `check(facet, name)`.

### Storage and global keys

Every page on an origin shares what the foundation stores, under these `localStorage` keys:

- `web-foundation.preferences`: the reader's theme choice, `preferences.js`'s exported `KEY`.
- `web-foundation.keys`: the reader's keys settings, the off switch for character keys and the
  wait between the presses of a sequence.

Every copy of a module on a page shares its state through a `Symbol.for` key on `globalThis`:
`web-foundation.registry`, the registered profiles; `web-foundation.keys`, the bindings; and
`web-foundation.keys.modals`, the modals focus has entered.

## Development

Tasks run through [mise](https://mise.jdx.dev):

```
mise run install      # the pinned tools and node_modules; reads the network
mise run check        # lint, types, build, and the unit and browser tiers; reads no network
mise run build        # src/ into dist/
mise run demo         # serve the demo pages on dist/
mise run screenshots  # capture the demo pages light and dark, shown inline in kitty
mise run currency     # report every tool, package, action pin, and tooling tag behind its latest
```

The demo pages, in `demo/`, are `tools.html` (every tool class, and the elements rules the
foundation adds to v0.7.0: disabled fields, progress and meter), `profiles.html` (the tools page
switched through every profile), `specimen.html` (each color profile light and dark, beside its
backup from `demo/backups/`), `theme.html` (the stored choice on `page-full.css`, switched by the demo's own controls), `unit.html`
(`page.css` with the GitHub unit), `keys.html` (bindings, and a help dialog the page fills from `bindings()`), `format.html`
(each formatter on sample values), `hooks.html` (the two color hooks, at their fallbacks and
overridden), `utilities.html` (each utility class the foundation adds to v0.7.0's, and the
motion sheet), and `dialogs.html` (Help and Settings glyph buttons opening a `.dialog-fit` and a
`.dialog-wide` dialog). Page layout belongs to the consumer, so each page links `demo.css`, a `demo` layer of
its own that lays out the column and its sections. `mise run demo` serves the repository on the
loopback address and prints each page's URL; the pages load `dist/`, which the task builds first.

`mise run screenshots` captures the tools page, the hooks page, the utilities page with its motion
held midway and under reduced motion, the dialogs page at 390px and wide with the Help hint shown
and each dialog open, and the specimen narrowed to the color profile and its backup,
each light and dark, on `page-full.css`. It runs the `web-screenshots` bin of
[web-tooling](https://github.com/standards-lab/web-tooling), the devDependency the browser tier's
driver and server also come from, over the capture description in
`scripts/screenshots.config.ts`, and passes its arguments on. With none it captures the default
profile; `--palette`, `--space`, and `--type` choose a profile, and `--all` captures every color
and compact and sans.
`--output directory --dir <path>` writes the files instead of showing them in kitty;
`mise run screenshots -- --help` lists the other flags, and web-tooling's README documents them.
The check never runs either task.

The check lints with ESLint, Prettier, shellcheck, and actionlint. CI runs `mise run install` and
the check on each pull request to main and each push to it.

## Release

A release is an annotated `v<version>` tag on a pack commit: a commit, on no branch, whose tree is
the pack, the build included, and whose one parent is main's merge commit. The version is the one
`package.json` gives and `CHANGELOG.md` has a section for. A person cuts the tag by hand once the
check is green on the merge commit, from a clean checkout with the pins installed:

```
git fetch origin && git switch --detach origin/main
mise run check
tag=v$(node -p 'require("./package.json").version')
scratch=$(mktemp -d)
pnpm pack --pack-destination "$scratch"
tar -xzf "$scratch"/*.tgz -C "$scratch"
# The pack's package/ as a tree, through an index of its own, so the checkout's index and
# .gitignore (which ignores dist/) play no part; --force keeps any other ignore rule from
# dropping a file.
GIT_INDEX_FILE="$scratch/index" git --work-tree="$scratch/package" add --all --force .
tree=$(GIT_INDEX_FILE="$scratch/index" git write-tree)
commit=$(git commit-tree "$tree" -p HEAD -m "web-foundation $tag")
git tag -a "$tag" -m "web-foundation $tag" "$commit"
git push origin "refs/tags/$tag"
gh workflow run release.yml -f tag="$tag"
```

The release workflow is dispatched by hand with the tag, not run by the push: GitHub reads a tag
push's workflows from the tagged tree, and the pack commit's tree holds only the pack, so the
workflow runs from main's copy. It checks that the tag's commit has one parent, a merge commit on
main, whose `package.json` version the tag names; runs the check on that parent; packs it and holds
the tag's tree to the pack, file for file; and creates the GitHub release from the version's
`CHANGELOG.md` section, with the tarball attached.

## Provenance

The package is seeded by copy from spike-html-apps-foundation at 07ba39a, its v0.3.1, itself
copied from spike-html-packages-foundation at 5dd8a58 with profiles, registration modules, the
preferences module, the theme menu, the conformance check, and the full entry ported from
spike-html-design at fe75220, its v0.7.0. Each copied file that takes comments names its source in
a provenance line.

## License

[Apache License 2.0](LICENSE).
