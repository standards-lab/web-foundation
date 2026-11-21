# Development

Tasks run through [mise](https://mise.jdx.dev):

```
mise run install      # the pinned tools and node_modules; reads the network
mise run check        # lint (lint-context and lint-references too), types, build, and the unit and browser tiers; reads no network
mise run build        # src/ into dist/
mise run demo         # serve the demo pages on dist/
mise run screenshots  # capture the demo pages light and dark, shown inline in kitty
mise run currency     # report every tool, package, action pin, and tooling tag behind its latest; reads the network
```

The demo pages, in `demo/`:

- `tools.html`: every tool class, and the elements rules the foundation adds to v0.7.0: disabled
  fields, progress and meter.
- `profiles.html`: the tools page switched through every profile.
- `specimen.html`: each color profile light and dark, beside its backup from `demo/backups/`
  ([backups.md](backups.md)).
- `theme.html`: the stored choice on `page-full.css`, switched by the demo's own selects.
- `unit.html`: `page.css` with the GitHub unit.
- `keys.html`: bindings, and a help dialog the page fills from `bindings()`.
- `format.html`: each Intl formatter on sample values, and `tryFormatJson` on JSON samples.
- `hooks.html`: the five color hooks, at their fallbacks and overridden.
- `utilities.html`: each utility class the foundation adds to v0.7.0's, and the motion sheet.
- `dialogs.html`: Help and Settings glyph buttons opening a `.dialog-fit` and a `.dialog-wide`
  dialog.
- `app.html`: an application page, `body.page-app`, its workspace on the full lines.
- `prose.html`: a reading page, `body.page-prose`.

The application and reading pages take their layout from `layout.css`, each with Help and
Settings in its header's actions; every other page links `demo.css`, a `demo` layer of its own
that lays out the column and its sections. `mise run demo` serves the repository on the loopback
address and prints each page's URL; the pages load `dist/`, which the task builds first.

`mise run screenshots` captures the tools page, the hooks page, the utilities page with its motion
held midway and under reduced motion, the dialogs page at 390px and wide with the Help hint shown
and each dialog open, the application page's screen and the reading page whole at 390px with the
text at 200% and wide, the formatters page, and the specimen narrowed to the color profile and
its backup, each light and dark, on `page-full.css`. It runs the `web-screenshots` bin of
[web-tooling](https://github.com/standards-lab/web-tooling), the devDependency the browser tier's
driver and server also come from, over the capture description in
`scripts/screenshots.config.ts`, and passes its arguments on. With none it captures the default
profile; `--palette`, `--space`, and `--type` choose a profile, and `--all` captures every color
and compact and sans. `--output directory --dir <path>` writes the files instead of showing them
in kitty; `mise run screenshots -- --help` lists the other flags, and web-tooling's
[docs/screenshots.md](https://github.com/standards-lab/web-tooling/blob/main/docs/screenshots.md)
documents them. The check runs neither `demo` nor `screenshots`.

`mise run screenshots` is `raw`: mise pipes a task's output when the task has dependencies, and
kitty's inline images need the terminal. Its arguments follow the capture description, with or
without a leading `--`.

The check lints with ESLint, Prettier, shellcheck, actionlint, and the pinned marathon release's
lint-context and lint-references. actionlint also runs the pinned shellcheck on each workflow's
`run:` blocks. [lint.md](lint.md) gives the ESLint rules, and [testing.md](testing.md) explains why
the tests measure as they do. CI runs `mise run install` and the check on each pull request to main
and each push to it.

## How the toolchain is configured

- **No task installs a tool.** `task.run_auto_install` is off, so a missing tool fails its task,
  and the preflight names `mise run install`, the one task that reads the network besides
  `currency`.
- **chrome-headless-shell has no published checksum.** Chrome for Testing publishes none, so each
  bump takes the sha256 and size from the download by hand. mise caches downloads by checksum: a
  version bumped without its own sha256 installs the old build, and the preflight fails naming the
  pin.
- **pnpm's settings** are in `pnpm-workspace.yaml`; the repository is one package, so it lists no
  packages. unrs-resolver, under eslint-plugin-import-x and eslint-import-resolver-typescript, has
  a postinstall that fetches its native binding when the optional dependency holding it is
  missing; pnpm installs that dependency, so the script isn't run. `minimumReleaseAge: 0` turns off
  pnpm's one-day wait before it installs a release. The currency task moves each pin to its latest
  release, and that release's notes are read before the bump lands, a review that stands in for
  the wait. With the wait on, a frozen install of a lockfile that pins a release under a day old
  fails.
- **`tsconfig.json` is the build**, src/ into dist/: tsc emits each module's `.js` and `.d.ts`,
  and `mise run types` checks the same sources with `--noEmit`. `lib` is es2025 for
  `Intl.DurationFormat`'s types, which `src/format.ts` uses.
- **`tsconfig.test.json` is the suite's type check**, `mise run types:test`: the tests and their
  helpers, which node runs under its type stripping, and `scripts/screenshots.config.ts`, which the
  tooling's bin runs the same way, checked against `dist/` as a consumer's code is and never
  emitted. `allowJs` reads the browser tier's in-page `support/` module, which stays `.js` because
  the server sends it as written.
- **Prettier formats the code, the JSON, and the stylesheets only.** Its default run would also
  rewrite the Markdown, the YAML, and `pnpm-lock.yaml`, so `.prettierignore` ignores every file,
  then lets back every directory and the code, JSON, and CSS files. Prettier also skips what
  `.gitignore` lists.
- **Currency** runs mise at its error log level, since mise warns on every run that a GitHub
  release has no assets. It checks a `github:` devDependency, such as web-tooling, which is pinned
  to a release tag the npm registry doesn't hold, against its repository's latest release. It
  holds typescript to the newest version typescript-eslint's peer range accepts.
