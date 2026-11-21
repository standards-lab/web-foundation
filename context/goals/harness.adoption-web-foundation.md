# goal · harness.adoption-web-foundation

- **State:** building
- **Task:** adopt
- **Branch:** adopt

## Tasks

1. [ ] adopt

## Task brief · adopt

**Problem**

web-foundation predates marathon 0.22.0's rules. Its context and its v1.client.stack record fail
lint-context, its comments carry reasoning outside the five kinds, its check runs neither lint, and
it points at a retired roadmap.

**Behaviors**
1. mise pins marathon 0.22.0 and puts both lints on PATH; currency reports a newer marathon tag.
2. The check runs lint-context and lint-references, reporting both, and fails if either fails. A
   lint missing from PATH fails the check, naming `mise run install`. The check's and currency's
   descriptions name what they run; currency's says it reads the network.
3. lint-context passes: every capability-map entry is `(built)` with a relative link to its home;
   the README is under 1,500 words, its detail moved unchanged to docs/ pages linked by absolute
   `main` URLs.
4. Every comment in TS, JS, CSS, HTML, shell, TOML, YAML, and the ignore files, fixtures included,
   is one of the five kinds. Module headers document the public contract without reasoning;
   comments on public custom properties, classes, and layers stay as the sheet's exports.
   Provenance is one line per source with a short "what changed" clause. Removed reasoning moves to
   docs/, package docs, or names; fixture CSS rules stay byte-identical.
5. An ESLint directive needs a description (eslint-comments `require-description`), and
   `ban-ts-comment` allow-with-description is set explicitly.
6. STANDARDS' comment rule is the five kinds across every file kind; it names the CSS exports, the
   contract header, and the one-line provenance form.
7. CLAUDE.md and the context README point at `standards-lab/roadmap/index.toml`.
8. The v1.client.stack record passes lint-context: the shipped icons brief goes; Decisions fit
   2,000 words keeping what components-settings, template, embedded, and standard rely on, with
   the template slice and review decisions replaced by one line naming webappgen f36de99 and
   record commit 6691d7f; Pending edits fit 1,000 words, shortened in place and retargeted, the
   four-kinds edit rewritten; a new decision states that template adopts marathon 0.22.0 in
   webappgen before it ships.
9. CI passes.

**Test seams**
- `mise run check`, which runs both lints from slice 6 on.

**Slices**
1. Pointers, capability map, README with its docs/ pages.
2. The v1.client.stack record.
3. STANDARDS comment rule and the suppression lint.
4. Source comments (src TS and CSS), with docs/ pages for moved reasoning.
5. Tests, fixtures, demo, scripts, and configuration comments.
6. The marathon pin, both lints in the check, and the descriptions.

**Out of scope**

webappgen and its scaffold; v1.client.stack's own tasks; applying the record's pending edits;
releases and CHANGELOG lines beyond the new devDependency.

**Door**

Two-way: nothing is released.

## Progress

slices 6/6 committed · standards ✓ · spec ✓ · editor ✓

## Decisions

- adopt: web READMEs link their docs/ pages by absolute `main` URLs; the pack holds no docs/. (W1)

## Pending edits

- coordinator · context/web-client.md, "Conventions", Color roles: cite web-foundation's
  `docs/use.md` in place of its README, which no longer documents the hooks.
