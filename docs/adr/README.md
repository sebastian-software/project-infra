# Architecture decisions

These records describe what project-infra is and how it is distributed and
maintained. The skill and its references own the infrastructure conventions;
the records link to them instead of restating them. `accepted` describes
agreement on the direction; implementation is pending unless the repository
demonstrates otherwise.

The record set was consolidated before any external consumer linked to it. From
here on, an accepted record is superseded rather than rewritten.

| ADR                                                                    | Decision                                               | Status   |
| ---------------------------------------------------------------------- | ------------------------------------------------------ | -------- |
| [0001](0001-create-project-infra-as-a-separate-repository.md)          | Create project-infra as a separate repository          | accepted |
| [0002](0002-apply-current-conventions-through-an-agent.md)             | Apply current conventions through an agent             | accepted |
| [0003](0003-distribute-a-self-contained-skill-at-project-scope.md)     | Distribute a self-contained skill at project scope     | accepted |
| [0004](0004-keep-the-portable-core-separate-from-app-integrations.md)  | Keep the portable core separate from app integrations  | accepted |
| [0005](0005-review-instructions-instead-of-benchmarking-agents.md)     | Review instructions instead of benchmarking agents     | accepted |
| [0006](0006-dual-license-under-apache-2-0-and-mit.md)                  | Dual license under Apache 2.0 and MIT                  | accepted |
| [0007](0007-consolidate-shared-infrastructure-into-this-repository.md) | Consolidate shared infrastructure into this repository | accepted |
| [0008](0008-succeed-the-standards-repository.md)                       | Succeed the standards repository                       | accepted |
| [0009](0009-release-with-release-please-and-no-publishing-step.md)     | Release with Release Please and no publishing step     | accepted |

See [the contribution guide](../../CONTRIBUTING.md) for the record lifecycle and
[the RFCs](../rfcs/README.md) for open proposals.
