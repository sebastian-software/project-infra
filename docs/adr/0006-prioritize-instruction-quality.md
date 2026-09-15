# ADR-0006: Prioritize instruction quality and native project checks

- Status: accepted
- Date: 2026-09-16

## Context

An early proposal suggested a substantial agent evaluation harness: representative
repositories, repeated runs, comparisons between skill versions, invariant
checks, and measurements of runtime and token use.

The discussion challenged that investment. Agent models and host applications
change frequently. For this package, the more immediate maintenance problem is
keeping the instructions necessary, clear, consistent, and free of duplication.

## Decision

Make instruction review the primary quality process. Review changes for their
purpose, applicability, conflicts, duplication, and treatment of customizations.
Keep each convention in one owning location and link to it from other surfaces.

Use inexpensive deterministic checks for concrete package defects: invalid
metadata, missing local references, malformed examples, or broken scripts if
scripts are introduced. Use the target project's own formatters, linters,
type checks, builds, and tests to validate changes made there.

Do not require a comprehensive agent benchmark suite, model-version matrix,
golden output snapshots, scoring infrastructure, or coverage target for the
initial project. A large evaluation platform is not a prerequisite for writing
useful conventions.

Use occasional real-project trials for substantial instruction or integration
changes. A fresh-context agent can help review instructions, but its findings
need specific evidence and human assessment when judgment matters.

## Consequences

The initial quality process is lightweight and focused on content we own.
Mechanical checks can validate syntax and references; they cannot prove that
the instructions are complete or semantically conflict-free.

Changing models does not make every behavioral trial worthless. It limits what
one run proves. Add a focused regression check when a recurring concrete failure
justifies it, rather than building a broad harness speculatively.

For a trial, useful observations include whether intentional CI jobs survived,
whether native checks ran successfully, and whether a second invocation made
unnecessary additional changes. Treat those as evidence, not a universal promise
of deterministic patches or idempotence.

## References

- [Authoring and review RFC](../rfcs/0005-authoring-and-review.md)
- [Current-state reconciliation](0002-reconcile-current-project-state.md)
