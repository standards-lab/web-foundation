<!-- Adapted from spike-html-apps-foundation (07ba39a): STANDARDS.md, for
@standards-lab/web-foundation and its hand-cut releases. -->

# web-foundation standards

The judgement calls the standards-reviewer applies to web-foundation, beyond what `mise run check`
enforces: each one line, with a pointer to the architecture page that applies where one does. The
`standard` task points them at the Web Elemental standard once it is founded
(`standards-lab/context/web-client.md`, "Toward Web Elemental").

The architecture pages that apply, in the architecture repository:

- `architecture/principles/minimal-footprint.md`: no runtime dependency, and each devDependency
  deliberate; a consumer installs the tag with no build step.
- `architecture/principles/rolling-currency.md`: every tool, package, and action pin explicit and
  at its latest.
- `architecture/principles/independent-releases.md`: the package releases on its own tags.
- `architecture/principles/downward-dependencies.md`: the foundation is the bottom layer, and
  imports nothing above it.
- `architecture/principles/validation-first.md`: a stored preference, a key binding, and a
  profile name are checked before they are applied.

## Design

- spike-html-design v0.7.0 is the frozen visual reference: native elements keep its styling, and
  every profile renders as it does there. Two deliberate exceptions: native `progress` takes
  `--accent-color`, magenta by default, where v0.7.0's takes the interaction color, because
  progress reports state rather than inviting interaction; and only a modal dialog's backdrop is
  veiled, where v0.7.0 veils every top-layer backdrop, because a popover or a fullscreen element
  covers nothing it should shade.
- A sheet is finished in every profile the baseline carries, light and dark.
- Focus is always visible, motion is brief and honours reduced motion, and nothing shifts layout.
- Density, alignment, and spacing in the tool sheets come from the tokens, never a literal.
- A visual change's session brief carries its screenshots per profile (`mise run screenshots
  --all`); the architect's acceptance is the design review, and a passing check alone doesn't ship
  one.
- The baseline is open for extension, closed for modification: a consumer extends it in its own
  layers, and a new profile joins as a unit beside the built-in ones.
- Page layout is the consumer's: the foundation's sheets set no page column, gutters, or section
  spacing, and the demo pages take theirs from their own layer, `demo/demo.css`.

## Conformance

- A profile an extension package ships, in any facet, must pass `check(facet, name)` from
  `./conformance.js`. The contract is that facet's rules in `RULES`, and nothing more.

## Package

- The package is `@standards-lab/web-foundation`, the bottom layer of the web client stack, and
  the tool sheets stay in it.
- It declares no runtime dependency: the foundation is the platform alone
  (`architecture/principles/minimal-footprint.md`).
- The keys family gives the app the means to bind; the foundation binds no key itself.
- `dist/` lives only in a release tag's tree, the pack, never on a branch.
- Releases are plain `vX.Y.Z` annotated tags on a pack commit whose one parent is main's merge
  commit, cut by hand on a green check from `package.json`'s version, each with its `CHANGELOG.md`
  section, and never changed or re-cut; the release workflow, dispatched by hand with the pushed
  tag and never on a push, only verifies and publishes it (`standards-lab/context/web-client.md`,
  "Packaging and release").

## Code

- Code meets the bar of spike-html-conventions' `layers/` code at a88828a: a 2–4 line header, a
  one-line doc comment per export, and comments only for a non-obvious why.
- A copied file names its source repository and commit in a provenance line, which reads
  `From|Adapted from <repo> (<commit>): <path>`. It names the immediate source alone; that source
  keeps the earlier lines. A JSON file, which takes no comment, has its line in
  `context/README.md`.
- Sources use `.ts` relative specifiers, which tsc rewrites; handwritten `.d.ts` keep `.js`.
- Tests are TypeScript run under Node's type stripping, erasable syntax only, type-checked by
  `tsconfig.test.json`; browser-served fixtures stay `.js`.
- A lazy load uses a literal `import()`.
- The browser tier tests `dist/`, and no server transforms what it serves.
- A mise task runs one script or one command, and `check` is a depends list.
