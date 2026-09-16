# ADR-0003: Distribute a self-contained skill at project scope

- Status: accepted
- Date: 2026-09-16

## Context

An agent needs to discover the instructions in the app and project where the
work happens. A user-level installation is convenient for personal use but does
not give a project a shared, reviewable rule set.

The first usable package needs project-local installation, app discovery,
reviewable updates, and working copies in fresh clones. Its behavior consists of
task instructions, reference documents, and configuration excerpts. A runtime
or a custom update protocol would add maintenance without improving those
capabilities.

## Decision

Publish `skills/project-infra/` as a self-contained Agent Skill. `SKILL.md` owns
the task workflow, `references/` own the conventions, and `assets/` hold
configuration excerpts. Keep design records, installation instructions, and
contributor documentation outside the package.

Install the skill at project scope with the Skills CLI. Support Codex and Claude
Code through their native discovery paths, with one canonical copy and relative
links. Commit the installed files, app links, and installer lockfile in the
consuming repository, so the instructions travel with every clone and produce a
visible diff.

Use the committed content and Git history to identify the rule set. Do not
introduce a separate migration integer, applied-version tag, commit trailer, or
custom lock format to claim that a project is current.

Updating the skill and applying it are distinct operations. Ordinary use applies
the installed snapshot. An update is a separate requested operation, followed by
a fresh agent session that applies the new instructions. Project-specific
decisions stay outside the replaceable upstream directory.

## Alternatives considered

- Git tags and commit trailers record that an operation occurred. They do not
  prove that its effects remain in the tree: a revert can restore old files
  while the marker stays in history, and shallow clones make history-based
  discovery conditional.
- A custom manifest field would relocate the stamp without removing the need to
  keep it aligned with reality.
- A Git submodule can pin external content but adds checkout and update steps.
  Assess it only if simpler distribution proves insufficient.
- Publishing an npm package is unnecessary; GitHub distribution through the
  installer works without it.

## Consequences

The package requires no build or runtime of its own. Installing and updating it
requires the installer's prerequisites; consuming a committed copy requires only
the selected agent app. Each project carries vendored instruction files.

The installer owns copying, updates, and app links. Validate those boundaries
when packaging or installer guidance changes: installation, a changed-source
update, clean-clone content, discovery, and removal. The lockfile supplies
provenance, not proof that the project follows the conventions.

A source update cannot erase instructions already read in an ongoing
conversation. The documented workflow therefore requires a fresh session after
an update. Hooks and other app integrations remain separate work under
[ADR-0004](0004-keep-the-portable-core-separate-from-app-integrations.md).

## References

- [Installation guide](../installation.md)
- [Agent Skills specification](https://agentskills.io/specification)
- [Skills CLI](https://github.com/vercel-labs/skills)
