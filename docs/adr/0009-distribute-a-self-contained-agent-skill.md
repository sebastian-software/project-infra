# ADR-0009: Distribute a self-contained Agent Skill

- Status: accepted
- Date: 2026-09-16
- Resolves: [RFC-0002](../rfcs/0002-project-scoped-distribution.md)

## Context

The first usable package needs project-local installation, app discovery,
reviewable updates, and working copies in fresh clones. Its current behavior
requires task instructions and reference documents. A runtime or custom update
protocol would add maintenance without improving those capabilities.

## Decision

Publish `skills/project-infra/` as a self-contained Agent Skill. Its `SKILL.md`
owns the task workflow; its references own the infrastructure conventions.
Keep design records and contributor documentation outside the installed package.
Move existing standards into the references instead of maintaining two copies.

Use the existing Skills CLI for project-scoped installation and targeted updates.
Document and exercise a published installer version. Support Codex and Claude
Code through their native skill discovery paths, with one canonical copy and
relative links where needed. Commit the installed files, links, and installer
lockfile in the consuming repository.

Apply the installed snapshot during ordinary use. Updating the skill is a
separate requested operation, followed by a fresh agent session to apply it.
Keep project-specific decisions outside the replaceable upstream directory.
Use committed content and Git history to preserve and restore instruction
snapshots; the installer lockfile supplies provenance, not proof of alignment.

## Consequences

The package requires no build or runtime of its own. Installing and updating it
requires the existing installer's prerequisites; consuming a committed copy
requires the selected agent app. GitHub distribution works without publishing
an npm package for project-infra.

The installer owns copying, updates, and app links. Validate those boundaries
when packaging or installer guidance changes: installation, a changed-source
update, clean-clone content, discovery, and removal. Keep checks focused on
observable behavior instead of building an agent benchmark suite.

Hooks and other app integrations remain separate work under
[ADR-0005](0005-separate-portable-content-from-integrations.md). They are not
required for the first skill. This decision implements the project scope from
[ADR-0003](0003-install-and-version-at-project-scope.md).

## References

- [Installation guide](../installation.md)
- [Agent Skills specification](https://agentskills.io/specification)
- [Skills CLI](https://github.com/vercel-labs/skills)
