# Development

Tasks run through [mise](https://mise.jdx.dev):

```
mise run install      # the pinned tools and node_modules; reads the network
mise run check        # lint, types, build, and the unit and browser tiers; reads no network
mise run build        # src/ into dist/
mise run demo         # serve the demo pages on dist/
mise run screenshots  # capture the demo pages light and dark, shown inline in kitty
mise run currency     # report every tool, package, action pin, and tooling tag behind its latest
```

The demo pages, in `demo/`:

- `tools.html`: every tool class, and the elements rules the foundation adds to v0.7.0: disabled
  fields, progress and meter.
- `profiles.html`: the tools page switched through every profile.
- `specimen.html`: each color profile light and dark, beside its backup from `demo/backups/`.
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
in kitty; `mise run screenshots -- --help` lists the other flags, and web-tooling's README
documents them. The check never runs either task.

The check lints with ESLint, Prettier, shellcheck, and actionlint. CI runs `mise run install` and
the check on each pull request to main and each push to it.
