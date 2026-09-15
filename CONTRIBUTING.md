# Contributing

This repository currently contains design documents. Read the
[ADR index](docs/adr/README.md) for constraints and the
[RFC index](docs/rfcs/README.md) for unresolved implementation questions.

## Write and review a record

- Use US English and concrete project terminology.
- Give each durable decision one numbered ADR under `docs/adr/`.
- Use a numbered RFC under `docs/rfcs/` for an implementation proposal with open
  questions. Draft examples must be labeled as proposals, not working interfaces.
- Keep rationale in ADRs and implementation details in their owning RFC or,
  later, code and configuration. Link between them instead of copying rules.
- Update the relevant index when adding or changing a record's status.

ADR statuses are `proposed`, `accepted`, `rejected`, `deprecated`, and
`superseded`. Accepted ADRs preserve the decision as made. Correct typos or broken
links in place; use a successor ADR for a semantic change and link both records.

RFCs begin as `draft` and can evolve during discussion. When a proposal is
resolved, record the decision in an ADR and link it from the RFC. A draft RFC is
not authorization to implement it, run automation, or migrate other repositories.

## Review documentation changes

Before committing:

1. Check that the text follows accepted decisions and keeps open choices open.
2. Read the changed document from its intended entry point, without relying on
   the founding conversation.
3. Check relative links, headings, examples, dates, and index entries.
4. Run `git diff --check` after staging new files or changing tracked files.
5. State which checks ran and identify examples that have not been executed.

There is no package installation, build, documentation generator, or agent
evaluation suite in this initial repository. Add tooling only when a concrete
need justifies its maintenance cost. Do not bootstrap the legacy standards
machinery merely to validate these Markdown files.
