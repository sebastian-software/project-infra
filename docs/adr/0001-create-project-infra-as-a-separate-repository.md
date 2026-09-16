# ADR-0001: Create project-infra as a separate repository

- Status: accepted
- Date: 2026-09-16

## Context

Sebastian Software maintained its project conventions through `standards`,
`renovate-config`, and `repo-template`. That system relies on numbered
migrations, template synchronization, a repository metadata file, and update
orchestration. An audit of it produced incremental improvements but also
questioned its premise: the machinery may be more than projects need.

A different approach needs room to develop without forcing every current
consumer to change immediately.

## Decision

Create `sebastian-software/project-infra` as a separate repository. It defines
a project's core infrastructure: development tools, CI, release conventions,
repository configuration, and supporting documentation. An agent does the work
of applying that definition to a project.

Record the design first, then develop and try the approach on selected projects.
Keep the existing repositories usable throughout the transition.

Use `project-infra` for the repository, the package, and the central skill. The
name describes the content and remains appropriate if the package later includes
hooks, instructions, or agent definitions.

## Alternatives considered

- Replacing `standards` immediately would couple exploration to every existing
  consumer's upgrade path.
- `repo-care` and `repo-refresh` emphasized maintenance actions and suggested
  that the package itself was the actor.
- `repo-baseline`, `repo-foundation`, `repo-conventions`, and
  `project-standards` described related ideas less directly.
- `repo-kit` emphasized packaging; `standards-skill` tied the identity to one
  delivery format, which the Agent Skills format does not require.

## Consequences

The two approaches coexist during migration. This has a temporary maintenance
cost, but it allows gradual learning and avoids a mandatory organization-wide
cutover. Creating this repository does not replace, close, or invalidate the
existing repositories or their pending changes.

## References

- [Adoption and tool ownership](../rfcs/0002-adoption-and-tool-ownership.md)
- [Agent Skills naming rules](https://agentskills.io/specification#name-field)
