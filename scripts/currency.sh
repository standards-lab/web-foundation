#!/usr/bin/env bash
# Prints `<where>: <item> <pin> -> <latest>` for each mise tool, package.json dependency, GitHub
# Actions pin, and github: devDependency's tag behind its latest, and exits 1 if any; prints
# nothing when all are current. Reads the network.
# Adapted from spike-html-apps-foundation (07ba39a): scripts/currency.sh, its action pins checked only when a workflow exists.
# Adapted from spike-html-packages-foundation (5dd8a58): scripts/currency.sh, with a github: branch.
# Adapted from spike-html-apps-components (2fded6d): scripts/currency.sh, its github: branch without the peer range check.
set -euo pipefail
cd "$(dirname "$0")/.."

trailing=""

report() {
  trailing+=$'\n'"$1"
}

report_mise_tools() {
  local outdated lines
  outdated=$(MISE_LOG_LEVEL=error mise outdated --bump --local --json) || return
  lines=$(node -p '
    Object.entries(JSON.parse(process.argv[1]))
      .map(([tool, { requested, bump }]) => "mise.toml: " + [tool, requested, "->", bump].join(" "))
      .join("\n")
  ' "$outdated") || return
  [[ -z $lines ]] || report "$lines"
}

report_github_release_tag() {
  local package=$1 pin=$2 spec latest
  spec=${pin#github:}
  latest=$(gh api "repos/${spec%%#*}/releases/latest" --jq .tag_name) || return
  if [[ ${spec#*#} != "$latest" ]]; then
    report "package.json: $package ${spec#*#} -> $latest"
  fi
}

typescript_eslint_accepted_typescript() {
  local typescript_eslint range accepted
  typescript_eslint=$(node -p 'require("./package.json").devDependencies["typescript-eslint"]') ||
    return
  range=$(pnpm view "typescript-eslint@$typescript_eslint" peerDependencies.typescript) || return
  accepted=$(pnpm view "typescript@$range" version --json) || return
  node -p '[].concat(JSON.parse(process.argv[1])).join("\n")' "$accepted" | sort -V | tail -n 1
}

report_packages() {
  local pins package pin latest
  pins=$(node -p '
    const { dependencies, devDependencies } = require("./package.json");
    Object.entries({ ...dependencies, ...devDependencies })
      .map(([name, pin]) => name + " " + pin)
      .join("\n")
  ') || return
  while read -r package pin; do
    if [[ $pin == github:* ]]; then
      report_github_release_tag "$package" "$pin"
      continue
    fi
    if [[ $package == typescript ]]; then
      latest=$(typescript_eslint_accepted_typescript) || return
    else
      latest=$(pnpm view "$package" version) || return
    fi
    if [[ $pin != "$latest" ]]; then
      report "package.json: $package $pin -> $latest"
    fi
  done <<<"$pins"
}

report_actions() {
  local uses action repo latest
  compgen -G '.github/workflows/*.yml' >/dev/null || return 0
  uses=$(grep -ho 'uses: *[^ ]*@[^ ]*' .github/workflows/*.yml | sed 's/uses: *//' | sort -u) ||
    return
  while read -r action; do
    repo=$(cut -d/ -f1,2 <<<"${action%@*}") || return
    latest=$(gh api "repos/$repo/releases/latest" --jq .tag_name) || return
    if [[ ${action#*@} != "$latest" ]]; then
      report ".github/workflows: ${action%@*} ${action#*@} -> $latest"
    fi
  done <<<"$uses"
}

report_mise_tools
report_packages
report_actions

if [[ -n ${trailing//$'\n'/} ]]; then
  sed '/^$/d' <<<"$trailing"
  exit 1
fi
