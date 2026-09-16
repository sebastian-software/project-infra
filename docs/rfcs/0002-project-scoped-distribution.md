# RFC-0002: Project-scoped distribution

- Status: resolved
- Date: 2026-09-16
- Decision: [ADR-0009](../adr/0009-distribute-a-self-contained-agent-skill.md)

## Problem

The package must reach the app in the project where the agent works. It should
be easy to install, update, review in Git, and use from another developer's clone.

## Resolution

Distribute a self-contained Agent Skill through the existing Skills CLI. Track
the installed content, relative app links, and `skills-lock.json` in the consuming
repository. Keep updating and applying the instructions as separate operations.

The [ADR](../adr/0009-distribute-a-self-contained-agent-skill.md) owns the rationale.
The [installation guide](../installation.md) owns working commands, prerequisites,
app discovery, customization, and removal. The guide supersedes the draft
installation examples in this RFC.

## Remaining topics

- [Optional hooks and automation](0003-optional-hooks-and-automation.md) need
  their own installation and ownership decisions.
- [Adoption](0004-migration-and-ecosystem.md) covers dependency automation for
  the installed skill.
- Distribution licensing remains an explicit maintainer decision; this RFC
  does not select a license.
