#!/usr/bin/env bash
# Fails naming mise run install when a tool a task needs is missing: the node_modules tooling, and
# with `browser`, the pinned chrome-headless-shell.
set -euo pipefail

fail() {
  echo "preflight: $1 isn't installed; run mise run install" >&2
  exit 1
}

require_node_modules() {
  local bin
  for bin in eslint prettier; do
    [[ -x node_modules/.bin/$bin ]] || fail "$bin (devDependencies)"
  done
}

require_browser_at_pin() {
  local shell pin version
  shell=$(mise which chrome-headless-shell 2>/dev/null) || fail "chrome-headless-shell"
  pin=$(mise current http:chrome-headless-shell) || return
  version=$("$shell" --version) || return
  if [[ $version != *" $pin" ]]; then
    echo "preflight: $shell isn't chrome-headless-shell $pin; give the pin its own sha256" >&2
    exit 1
  fi
}

require_node_modules
[[ "${1:-}" == browser ]] || exit 0
require_browser_at_pin
