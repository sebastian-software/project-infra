# ADR-0005: Review instructions instead of benchmarking agents

- Status: accepted
- Date: 2026-09-16

## Context

The most important package defect may be an unclear or contradictory
instruction. A technically valid skill can still tell an agent to apply an
irrelevant rule, erase a deliberate customization, or follow two competing
sources of truth.

Agent models and host applications change frequently. For this package, the
immediate maintenance problem is keeping the instructions necessary, clear,
consistent, and free of duplication, not measuring one model's behavior.

## Decision

Make instruction review the primary quality process. Review changes for their
purpose, applicability, conflicts, duplication, and treatment of customizations.
Keep each convention in one owning location and link to it from other surfaces.
The [contribution guide](../../CONTRIBUTING.md) owns the review steps.

Use inexpensive deterministic checks for concrete package defects: invalid
metadata, missing local references, malformed examples, or broken scripts. Use
the target project's own formatters, linters, type checks, builds, and tests to
validate changes made there.

Use occasional real-project trials for substantial instruction or integration
changes. A fresh-context agent can help review instructions, but its findings
need specific evidence and human assessment when judgment matters.

Do not require a comprehensive agent benchmark suite, model-version matrix,
golden output snapshots, scoring infrastructure, or coverage target.

## Alternatives considered

An evaluation runner was proposed: temporary repositories, stored patches,
native check results, runtime and token counts, comparisons between skill
versions, and repeated runs against independently held expectations. Golden
patches and a broad model matrix would be expensive to maintain as agents
evolve. Revisit the smallest useful part only if repeated failures make a
concrete case for it.

## Consequences

The quality process is lightweight and focused on content we own. Mechanical
checks validate syntax and references; they cannot prove that the instructions
are complete or semantically conflict-free.

Changing models does not make every behavioral trial worthless; it limits what
one run proves. Add a focused regression check when a recurring concrete failure
justifies it, rather than building a broad harness speculatively.

Useful trial observations include whether intentional CI jobs survived, whether
native checks ran successfully, and whether a second invocation made unnecessary
additional changes. Treat those as evidence, not as a promise of deterministic
patches or idempotence.

## References

- [Contribution guide](../../CONTRIBUTING.md)
- [Adoption and tool ownership](../rfcs/0002-adoption-and-tool-ownership.md)
