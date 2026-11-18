# web-foundation context

web-foundation is the bottom layer of the web client stack: native CSS and ES modules with no
dependencies, released by tag, that every page and every layer above builds on. It holds the
baseline sheets, the swappable color, space, and type profiles, and the behavior every page shares,
so a page built on it looks and behaves like the rest of the effort without a framework. It is the
root of the v1.client.stack goal.

It is a package under the `@standards-lab` scope, starting at v0.1.0 and released by a plain
`vX.Y.Z` tag. Its goals live in the coordinator's roadmap (`standards-lab/context/roadmap.toml`,
v1.client.stack), and its strategy is `standards-lab/context/web-client.md`. It is seeded by copy
from spike-html-apps-foundation v0.3.1; spike-html-design v0.7.0 stays a frozen reference, with a provenance line on every copied file; the spike is archived and never a
dependency.

## Capability map

- **Baseline**: the tokens, reset, and elements sheets.
- **Profiles**: color (light and dark), space, and type profiles, with the built-in color profiles.
- **Tool sheets and DOM helpers**: the utility sheets and the small helpers pages share.
- **Keys**: the registry and keys family, and the keyboard help.
- **Theme preferences**: the stored preferences module and the theme menu.
- **Conformance**: the profile conformance check, contrast included.
- **Formatters**: the Intl formatters for dates, numbers, bytes, and JSON.
