# web-foundation

The native foundation of the standards-lab web client stack: the baseline stylesheets (tokens,
reset, and elements), the five color role hooks, the profiles for color, space, and type, the tool
sheets (meta, structure, and utilities), the opt-in sheets for glyph buttons, dialogs, page layout,
and motion, the DOM helpers, the registry and keys family, the theme preferences, the conformance
check for profiles, and the formatters, Intl's and JSON's. It is plain CSS and ES modules with
their type declarations, with no runtime dependency, and is released by git tag. A theme settings
UI and keyboard help are planned as web-components' `sl-settings` and `sl-shortcuts`; the
foundation ships `preferences.js` and `bindings()` for them.

## Install

Each release is a tag, `v<version>`, of
[standards-lab/web-foundation](https://github.com/standards-lab/web-foundation), whose tree is the
package as `pnpm pack` builds it: `package.json`, this README, the LICENSE, and `dist/`, the build.
The build lives only in the tag's tree, so the tag installs with no build step, and its manifest
has no scripts. Install it by the tag:

```
pnpm add github:standards-lab/web-foundation#v0.4.0
bun add github:standards-lab/web-foundation#v0.4.0
npm install --allow-git=root github:standards-lab/web-foundation#v0.4.0
```

npm 12 refuses git dependencies unless `--allow-git` allows them; `root` allows the ones the
project itself declares. Each GitHub release also carries the tarball.

## Use and development

- [Use](https://github.com/standards-lab/web-foundation/blob/main/docs/use.md): the entries,
  modules, color hooks, tokens, and sheets, and what the foundation stores.
- [Development](https://github.com/standards-lab/web-foundation/blob/main/docs/development.md):
  the mise tasks, the demo pages, the screenshots, and how the toolchain is configured.

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
`CHANGELOG.md` section, on the tag its `ref` names rather than the dispatching ref, with the
tarball attached.

## Provenance

The package's lineage is in the workspace's [references catalog](https://github.com/standards-lab/org/blob/main/references.md).

## License

[Apache License 2.0](LICENSE).
