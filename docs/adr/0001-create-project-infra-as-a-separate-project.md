# ADR-0001: Develop project-infra alongside standards

- Status: accepted
- Date: 2026-09-16

## Context

The discussion began with an audit of `standards`, `renovate-config`, and
`repo-template`, focusing on lightweight operation, stability, avoiding
duplication, developer experience, and accessible documentation. The audit
produced incremental improvements to the existing system.

The discussion then questioned that system's premise. Its numbered migrations,
template synchronization, metadata, and update orchestration may be more machinery
than projects need. A different approach needs room to develop without forcing
every current consumer to change immediately.

## Decision

Create `sebastian-software/project-infra` as a separate repository. Start by
recording the design, then develop and try the approach on selected projects.
Keep the existing repositories usable throughout the transition.

The package defines a project's core infrastructure: development tools, CI,
release conventions, repository configuration, and supporting documentation.
The agent does the work of applying that definition to a project.

Use `project-infra` for the repository and package identity. It can also name
the central skill. The name describes the content and remains appropriate if
the package later includes hooks, instructions, or agent definitions.

## Alternatives considered

- Replacing `standards` immediately would couple exploration to every existing
  consumer's upgrade path.
- `repo-care` and `repo-refresh` emphasized maintenance actions and suggested
  that the package itself was the actor.
- `repo-baseline`, `repo-foundation`, `repo-conventions`, and
  `project-standards` described related ideas, but `project-infra` more directly
  named the intended scope.
- `repo-kit` emphasized packaging; `standards-skill` tied the identity to one
  delivery format. A `-skill` suffix is not required by the Agent Skills format.

## Consequences

The two approaches coexist during migration. This has a temporary maintenance
cost, but it allows gradual learning and avoids a mandatory organization-wide
cutover. Creating this repository does not merge, close, replace, or invalidate
the earlier audit PRs.

The initial commit is documentation only. Naming the package does not select an
installer, add runtime dependencies, or make a supported release available.

## References

- [Migration and ecosystem RFC](../rfcs/0004-migration-and-ecosystem.md)
- [Agent Skills naming rules](https://agentskills.io/specification#name-field)
