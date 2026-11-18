# web-foundation

The native foundation of the standards-lab web client stack: the baseline stylesheets (tokens,
reset, and elements), the profiles for color, space, and type, the tool sheets (meta, structure,
and utilities), the DOM helpers, the registry and keys family, the theme preferences and menu, the
conformance check for profiles, and the Intl formatters. It is plain CSS and ES modules with their
type declarations, with no runtime dependency, and is released by git tag.

The package is `@standards-lab/web-foundation`. Its modules are imported by their `.js` subpaths,
its stylesheets by their `.css` subpaths, and the CSS module script declaration by `./css`.
