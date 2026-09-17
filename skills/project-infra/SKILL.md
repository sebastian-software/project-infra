---
name: project-infra
license: MIT OR Apache-2.0
description: Apply Sebastian Software infrastructure conventions to a project's tooling, CI, releases, and contributor documentation. Use for infrastructure setup, standards reviews, or requests to bring a repository up to date; ordinary feature work does not need a repository-wide update.
---

# Project infrastructure

Reconcile the requested project scope with the installed conventions. For a
review-only request, report findings without editing. For an update, make a
coherent change and verify it through the project's own checks.

## Select the relevant guidance

Identify the working repository, its instructions, and the project-local copy of
this skill. Read native manifests, workspace declarations, contributor docs, CI,
and existing changes to distinguish product code from fixtures and generated
content. A mixed repository can need several profiles; a repository without
Node.js or Rust code still uses the common, CI, and documentation guidance.

Read only the references relevant to the requested work:

| Scope                                                              | Reference                                        |
| ------------------------------------------------------------------ | ------------------------------------------------ |
| Project boundaries, local checks, tool and configuration ownership | [Common workflow](references/common.md)          |
| JavaScript or TypeScript packages, apps, and documentation sites   | [Node.js and TypeScript](references/node.md)     |
| Rust packages, workspaces, and native components                   | [Rust](references/rust.md)                       |
| CI, dependency updates, or distributed artifacts                   | [CI and releases](references/ci-and-releases.md) |
| Setup instructions, generated READMEs, or agent guidance           | [Documentation](references/documentation.md)     |

Use the common guidance for infrastructure changes and the documentation
guidance when the contributor workflow changes. Resolve these paths relative
to this skill directory, not the consuming repository's root. The references link
to configuration excerpts under `assets/`; adapt an excerpt to the project instead
of copying it verbatim.

## Apply the conventions

Use each applicable default unless a concrete project requirement justifies a
difference. Existing configuration alone is not an exemption. Preserve runtime
support, public interfaces, framework requirements, and justified customizations.
Explain necessary differences near the affected configuration or in existing
project documents; no separate exception registry is needed.

Follow the repository's instruction authority and requested scope. Surface
unresolved conflicts that would change product behavior or compatibility, and
continue independent work. A targeted tooling update does not authorize a full
infrastructure migration.

Briefly explain the meaningful gaps and make focused changes. Use the owning
generator for generated content; identify readers before replacing configuration.
Keep shared rule catalogs with their owning tools. Update affected setup and
maintenance instructions in the same change.

Run the relevant native checks without weakening them to clear failures. Report
what changed, why any differences remain, and which checks passed or could not
run. An aligned project can finish without a diff. Leave changes reviewable;
publishing, PR creation, and merging follow the user's authorization.

## Update the installed skill when requested

Ordinary use applies the installed snapshot. When the user asks to refresh this
skill, work from the consuming repository's root and inspect `skills-lock.json`.
Confirm that its `project-infra` entry identifies the intended upstream source
and ref. Preserve edits in the installed skill before replacing it; project
customizations belong in the project's own configuration and instructions.

For a Git-source installation managed by the Skills CLI with a recorded
`skillPath`, run:

```sh
npx skills@1.5.26 update project-infra --project
```

Inspect the content, lockfile, and app discovery paths afterward. Do not report
success based on the command's exit status alone. If provenance is missing or
identifies a different source, resolve the installation method before updating.

If the instructions changed, ask the user to start a fresh agent session and
invoke the skill there. Report the instruction update separately from any pending project work.
Refreshing files cannot replace instructions already read in this conversation,
and does not demonstrate that the project follows the new conventions.
