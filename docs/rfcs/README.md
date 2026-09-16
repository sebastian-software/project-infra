# RFCs and open questions

These RFCs preserve implementation ideas and unresolved questions from the
founding discussion and subsequent project work. They are drafts, not implemented
contracts. Accepted direction lives in [the ADRs](../adr/README.md).

| RFC                                           | Proposal                      | Main unresolved question                                                         | Status |
| --------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------- | ------ |
| [0001](0001-contextual-project-updates.md)    | Contextual project updates    | How does an update apply defaults and resolve project-specific conflicts?        | draft  |
| [0002](0002-project-scoped-distribution.md)   | Project-scoped distribution   | Which installer and package format support the actual local scope?               | draft  |
| [0003](0003-optional-hooks-and-automation.md) | Optional hooks and automation | Which triggers provide enough value to justify running an agent?                 | draft  |
| [0004](0004-migration-and-ecosystem.md)       | Adoption and tool ownership   | How can a project adopt the standards without conflicting tool responsibilities? | draft  |
| [0005](0005-authoring-and-review.md)          | Authoring and review          | What minimal review guidance and mechanical checks are sufficient?               | draft  |

The shortest path to an implementation proposal is RFC-0001 plus RFC-0002.
Hooks can follow after manual use is useful. RFC-0004 describes gradual adoption
and the responsibilities of the shared tools.

The [current standards](../conventions/README.md) are ready as written guidance.
