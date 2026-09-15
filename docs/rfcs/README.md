# RFCs and open questions

These RFCs preserve implementation ideas and unresolved questions from the
founding discussion. They are drafts, not implemented contracts. Accepted
direction lives in [the ADRs](../adr/README.md).

| RFC                                           | Proposal                           | Main unresolved question                                                | Status |
| --------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------- | ------ |
| [0001](0001-contextual-project-updates.md)    | Contextual project updates         | What is the smallest useful convention set and conflict policy?         | draft  |
| [0002](0002-project-scoped-distribution.md)   | Project-scoped distribution        | Which installer and package format support the actual local scope?      | draft  |
| [0003](0003-optional-hooks-and-automation.md) | Optional hooks and automation      | Which triggers provide enough value to justify running an agent?        | draft  |
| [0004](0004-migration-and-ecosystem.md)       | Migration and ecosystem boundaries | Which consumer should be the first pilot, and what ownership transfers? | draft  |
| [0005](0005-authoring-and-review.md)          | Authoring and review               | What minimal review guidance and mechanical checks are sufficient?      | draft  |

The shortest path to an implementation proposal is RFC-0001 plus RFC-0002.
Hooks can follow after manual use is useful. RFC-0004 records the earlier audit
work and the boundaries that gradual adoption must preserve.
