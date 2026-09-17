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
2. **Release blueprint.** The largest piece of remaining value, and the one a
   product's release decision links to. The prose belongs in the CI reference;
   the publish skeleton and the three configurations belong under `assets/`.
   Reduce rather than copy: the reference explains a boundary, not a template to
   paste.
3. **Scaffolding templates.** Decide their owner first, because a template is
   only useful where something applies it.
4. **Stack references.** Keep what a project adapts, drop what only made sense
   as a byte-exact source. The Forgejo workflow is the one piece with no
   equivalent here.
5. **Onboarding procedure.** Rewrite against this repository's install and
   invoke path. It cannot be carried over as text.
6. **Consumer pins.** Each consuming repository moves its action references when
   it next changes its workflow.
7. **Archive.** Only once nothing resolves against the old address.

## Open questions

1. Who owns the scaffolding templates: this repository as the source, or
   `repo-template` as the applier that reads them from here?
2. Does the Forgejo CI workflow have a consumer that justifies carrying it?
3. Does the release blueprint stay one page of guidance, or does it need its own
   reference file next to `ci-and-releases.md`?
4. What replaces the predecessor's `README.md` for a reader who arrives at the
   old repository, and at which point does it become a pointer?
5. Which consumers still resolve a reference against the old repository, and how
   is that list kept honest rather than assumed?

## Related proposals

- [Adoption and tool ownership](0002-adoption-and-tool-ownership.md)
