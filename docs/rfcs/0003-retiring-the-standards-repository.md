# RFC-0003: Retiring the standards repository

- Status: draft
- Date: 2026-09-17
- Related decision: [ADR-0008](../adr/0008-succeed-the-standards-repository.md)

## Problem

The predecessor repository holds content this repository needs and content that
should not survive it. Moving the first without dragging in the second takes a
per-area judgement, and one of the areas is a publishing path a product depends
on. The order matters more than the speed.

## What is there

Measured on `standards` at `v0.13.0`.

| Area                                                               | Size        | Assessment                                                                                                                        |
| ------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `.github/actions/`                                                 | 840 lines   | Moved. Executable, organization-wide, no substitute in prose                                                                      |
| `reference/release-please/`                                        | 588 lines   | High value. A release blueprint, a publish skeleton and three configurations, referenced by a product's own decision record       |
| `reference/common/`                                                | 350 lines   | Repository scaffolding: issue templates, pull-request template, code owners, labels, security and support texts, branding footers |
| `reference/rust/`                                                  | 406 lines   | A CI workflow, a dependency policy and a page explaining which file is owned by whom                                              |
| `reference/node/`                                                  | 570 lines   | Configurations and three CI workflows, including a Forgejo variant                                                                |
| `docs/runbooks/onboard-repo.md`                                    | 1 file      | The procedure has value; its text is written for the machinery                                                                    |
| `src/`, `test/`, `bin/`, `manifest.json`, `changes/`, `docs/plan/` | ~9800 lines | Dropped with the machinery                                                                                                        |
| `SKILL.md`, `CONSUMER-AGENTS.md`, `reference/agent/`               | 625 lines   | Dropped. The instructions describe the stamp, the markers and the two-run agent pipeline                                          |
| `reference/mdtheme/`, `docs/adr/generated-readme-ownership.md`     | 2 files     | Belong with the README tooling                                                                                                    |

The two numbers worth keeping in mind: roughly 2400 lines are candidates to
move, and roughly 10400 lines are not.

## Proposed order

1. **Actions.** Done. They are here, the CI reference names this repository, and
   this repository's gate runs the pin checker against its own workflows.
2. **Release blueprint.** Done. The prose is the "Configure Release Please"
   section of the CI reference, and the workflow skeleton and four
   configurations live under `assets/ci/release-please/`. The material was
   reduced to the supported path rather than copied.
3. **Scaffolding templates.** Decide their owner first, because a template is
   only useful where something applies it.
4. **Stack references.** Keep what a project adapts, drop what only made sense
   as a byte-exact source. The Forgejo workflow is the one piece with no
   equivalent here.
5. **Onboarding procedure.** Procedure defined. The
   [migration reference](../../skills/project-infra/references/migration.md)
   rewrites it against this repository's install and invoke path, and the
   [`AGENTS.md` excerpt](../../skills/project-infra/assets/common/AGENTS.template.md)
   replaces the marker-fenced guardrail block. No repository has run it yet.
6. **Consumer pins.** Procedure defined. Each consuming repository moves its
   action references when it next changes its workflow; the same reference
   covers the pin and the repository-local pin checker it makes redundant. The
   survey below records what is outstanding.
7. **Archive.** Only once nothing resolves against the old address.

## Consumer references

Surveyed 2026-09-17 over the organization's seven active repositories. A
reference is anything that names the predecessor: a pin, a CLI invocation, the
metadata stamp, a Renovate rule, a file header, or a document. The search is the
one the migration reference documents, so the survey is repeatable and its
result is checked rather than remembered.

| Repository  | What still names the predecessor                                                                                                                                                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ardo`      | Nothing                                                                                                                                                                                                                                                                                                                          |
| `dalo`      | Drift job running the pinned CLI behind `pending.json` and `blocked.json` guards; `.repometa.json`; a Renovate regex manager for the pin; the `AGENTS.md` guardrail block; a `rustfmt.toml` header; a contributor paragraph; a local pin checker                                                                                 |
| `ferralk`   | Drift job running the pinned CLI behind a `pending.json` guard; `.repometa.json`; a Renovate regex manager and the `:standards` preset; the `AGENTS.md` guardrail block; headers in `rustfmt.toml` and `rust-toolchain.toml`                                                                                                     |
| `ferrocat`  | Drift job running the pinned CLI behind a `pending.json` guard; `.repometa.json`; a Renovate regex manager; the `AGENTS.md` guardrail block; a `rustfmt.toml` header; `.standards/` entries in the docs workspace's ignore and word lists; a contributor paragraph; a local pin checker                                          |
| `ferromark` | Four action pins in `ci.yml` and `publish.yml`; a contract test asserting that address; two documentation links; orphaned fixtures for a pin checker the repository no longer has                                                                                                                                                |
| `mdtheme`   | `.repometa.json`; the `:standards` preset; the `AGENTS.md` guardrail block; headers in `rustfmt.toml` and `deny.toml`; `docs/standards-integration.md`                                                                                                                                                                           |
| `palamedes` | Drift job running the CLI as a pinned `devDependency`, with a CLI/stamp alignment guard and a committed `blocked.json`; `.repometa.json`; the `:standards` preset; the `AGENTS.md` guardrail block; headers in `rustfmt.toml` and `deny.toml`; `.standards/` ignore entries; ESLint and Oxlint seed bridges; a local pin checker |

Only `ferromark` holds an action pin, and it is also the repository that already
removed its standards machinery — in one commit, `78321b8`, that took Renovate
with it. That is the loss the migration reference is written to prevent. Its
pins have not moved because the workflow change also has to update a test
asserting the old owner inside the `uses:` string.

## Open questions

1. Who owns the scaffolding templates: this repository as the source, or
   `repo-template` as the applier that reads them from here?
2. Does the Forgejo CI workflow have a consumer that justifies carrying it?
3. Resolved: the release blueprint is a section of `ci-and-releases.md`, not a
   reference of its own.
4. What replaces the predecessor's `README.md` for a reader who arrives at the
   old repository, and at which point does it become a pointer?
5. Does the survey above become a scheduled check across the organization, or is
   it re-run by hand before the archive step?

## Related proposals

- [Adoption and tool ownership](0002-adoption-and-tool-ownership.md)
