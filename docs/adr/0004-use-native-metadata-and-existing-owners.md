# ADR-0004: Use native metadata and existing ownership

- Status: accepted
- Date: 2026-09-16

## Context

The legacy `.repometa.json` is a convention of the standards system. The discussion
examined its fields to determine which facts the new approach actually needs.
Several fields duplicated information or combined unrelated responsibilities.

Moving every field into a language manifest would preserve that duplication.
The more useful question is which component should own each remaining fact.

## Decision

Do not require `.repometa.json` in project-infra consumers. Use existing native
sources and explicit project decisions wherever possible.

| Legacy information               | Direction for project-infra                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `visibility`                     | Remove it from this system. Repository access and visibility are handled elsewhere.    |
| `since`                          | Do not require it for infrastructure updates.                                          |
| `platform`                       | Derive the relevant forge from Git remotes and project context when unambiguous.       |
| README owner and branding inputs | Keep ownership with mdtheme and its configuration.                                     |
| `standards` integer              | Use the project-local package content and provenance described in ADR-0003.            |
| `workspaces`                     | Inspect native workspace declarations and actual project structure.                    |
| `exceptions`                     | Preserve deliberate project decisions in their natural configuration or documentation. |

Removing `since` from this system does not authorize deleting existing copyright
notices. Removing `visibility` does not change a repository's access settings.

Native evidence is not always complete. Multiple remotes, custom forge domains,
unusual layouts, or conflicting instructions require interpretation. Surface an
unresolved choice instead of manufacturing metadata or guessing a destructive
change. The evidence and conflict-handling workflow belongs in the skill design.

## Alternatives considered

A custom object in `package.json` was considered. Cargo also provides
`package.metadata` and `workspace.metadata` for external tool information. Those
are suitable extension points when a tool genuinely needs a project-owned fact.
They are not a reason to keep facts that are unnecessary or already owned
elsewhere. No custom manifest namespace is adopted.

Git-based applied-version markers were also considered; their limitations and
the chosen installation model are recorded in ADR-0003.

## Consequences

There is less metadata to maintain and less risk of contradictory sources. The
agent must explain ambiguous detection and preserve intentional differences.
The exact convention for documenting exceptions remains open; it should not
recreate a generic metadata registry.

Legacy consumers still depend on their current metadata and ownership rules.
Remove those only as part of an explicit migration, not because this ADR exists.

## References

- [Project-local versioning](0003-install-and-version-at-project-scope.md)
- [Update workflow](../rfcs/0001-contextual-project-updates.md)
- [Migration boundaries](../rfcs/0004-migration-and-ecosystem.md)
- [Cargo metadata](https://doc.rust-lang.org/cargo/reference/manifest.html#the-metadata-table)
