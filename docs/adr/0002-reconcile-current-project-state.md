# ADR-0002: Apply current conventions to the observed project

- Status: accepted
- Date: 2026-09-16

## Context

A repository template provides a useful starting point. Keeping existing projects
current is a different problem: projects acquire custom CI jobs, mixed language
workspaces, alternate configurations, and documentation tailored to their users.

The legacy standards version mainly identifies a revision of a template and its
migration instructions. Advancing that number does not establish that all
relevant work was completed or that later edits still satisfy the conventions.

## Decision

Publish current conventions, decision criteria, and useful reference assets as
agent-consumable content. The skill asks the agent to inspect the actual project,
identify relevant conventions, and adapt the project to them.

Common, Node.js, and Rust conventions are initial areas of interest. They can
combine within one repository. Detection must distinguish real project areas
from examples, generated files, fixtures, and vendored code.

The target workflow is: understand the repository, apply the relevant current
intent, preserve justified customizations, update affected documentation, and
validate the resulting changes with the project's own checks.

Routine alignment does not depend on replaying every numbered migration. The
package's current instructions must stand on their own for both new and existing
projects. Historical migration guidance remains useful when it explains how to
leave an old tool or arrangement; it does not define a new global stamp protocol.

## Alternatives considered

- Byte-exact synchronization is inexpensive and predictable for wholly owned
  files, but it is a poor default for customized project infrastructure.
- An upgraded migration engine could improve recovery, but would preserve the
  metadata and sequencing responsibilities questioned in this discussion.
- An unconstrained request to improve a repository would lose the shared
  organization-specific intent. The package must state that intent explicitly.

## Consequences

The agent needs judgment, so identical inputs do not guarantee identical patches
across models or runs. Native checks and review remain necessary. There is no
promise of a cheap, exact organization-wide compliance verdict from a version
comparison alone.

Deterministic tools remain appropriate for concrete operations such as formatting,
configuration validation, and document generation. The new direction does not
require rewriting those operations as prose or giving the agent ownership of
another tool's generated output.

## References

- [Contextual update workflow](../rfcs/0001-contextual-project-updates.md)
- [Instruction quality](0006-prioritize-instruction-quality.md)
