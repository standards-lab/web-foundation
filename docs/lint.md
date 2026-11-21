# How the lint is built

`eslint.config.js` is the lint the check runs. `test/unit/layers.test.ts` runs it over the tree
`test/unit/layers-tree.ts` writes, so every rule below is tested.

- **The recommended rules, and a reason on every suppression.** ESLint's and typescript-eslint's
  recommended sets apply to every `.js` and `.ts` file. An ESLint directive needs a description
  (eslint-comments `require-description`), and a `@ts-expect-error`, `@ts-ignore`, or `@ts-nocheck`
  needs one too (`ban-ts-comment`, `allow-with-description`).
- **Globals.** Every file sees the browser's globals; the suite and the scripts also see node's,
  since the browser tier's `support/` holds in-page modules beside node ones. `dist/`, the
  gitignored build, is never linted.
- **A `.css` import is a CSS module script.** A static import or re-export of a `.css` file must
  carry `with { type: 'css' }`, matched by the attribute's key as a name or a quoted string. An
  `import()` of a `.css` file is refused, whether its specifier is a string or a template whose
  last part ends in `.css`.
- **The layer table.** `layers` is the table cut to the foundation: `src/` may import nothing but
  itself. The layer is an element by its directory, matched from the root (`partialMatch` false),
  with a second pattern for a file in a directory whose name starts with a dot, which micromatch's
  `**` never enters, so `./.well-known/` and `./..x/` stay in the layer.
- **Disallow by default.** `boundaries/dependencies` checks every origin (a package is external)
  and the local files no element holds, and checks imports within the layer too
  (`checkInternals`), which the layer's policy allows. An import passes only when a policy names
  its target. The rule judges the file an import resolves to, never the specifier's text, and
  `import-x/no-unresolved` fails a specifier that names no file, so no import passes by naming
  none.
- **A declaration file is imported as a type.** A handwritten `.d.ts` has no runtime, so an import
  that resolves to one passes only as `import type` or `export type`, which tsc erases. The last
  policy refuses any other kind and, as the last whose selector matches, overrides the allow
  before it. The dependency's kind is the declaration's, so `import { type X }` is a value import
  here, as it is to `verbatimModuleSyntax`, which keeps it as `import {}` and so loads the file.
- **No dependency.** `import-x/no-extraneous-dependencies` judges each import against
  `package.json`: a package name it doesn't declare in `dependencies`, which holds none (a
  devDependency ships nothing), in every import form (`includeTypes`), an internal one among them
  (`includeInternal`). `import-x/no-relative-packages` refuses a relative path that reaches another
  package's files. The package's own name passes these, since the manifest has an `exports` field;
  `boundaries/dependencies` refuses it, as it resolves to `dist/`.
