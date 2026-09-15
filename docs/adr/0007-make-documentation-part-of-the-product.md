# ADR-0007: Make accessible documentation part of the product

- Status: accepted
- Date: 2026-09-16

## Context

The original audit included a concern that existing documentation was difficult
to approach. The later discussion added another reader task: understanding how
to install the package in a particular app and project, update it, and use it.

An uninstalled skill cannot be the only place that explains its own installation.
Historical rationale, current conventions, and user procedures also have
different audiences and change at different rates.

## Decision

Write repository content in US English. Keep the README short and organized
around the reader's first useful next step.

The eventual onboarding path must explain installation at project scope,
updating the local package, loading the current instructions, invoking the
skill, and reviewing the result. State prerequisites and app-specific behavior
where they matter. Keep unsupported examples visibly separate from verified
instructions.

Documentation is part of a project update. Changes to development commands,
CI, releases, or configuration must include the corresponding user-facing docs.

Give each fact one owner: ADRs preserve decisions and rationale, RFCs hold open
design proposals, current skill references define conventions, and task guides
explain how to use the implemented system. Link instead of repeating policies.
README rendering and branding remain with mdtheme where that tool is used.

## Consequences

The package needs to explain both why a convention exists and how readers use
the resulting setup. More prose is not automatically better; examples and short
task guides should reduce the amount of system history a user needs to learn.

The initial repository provides navigation and design records only. It does not
publish a quick start that falsely implies an installable release exists.

## References

- [README](../../README.md)
- [Contribution guide](../../CONTRIBUTING.md)
- [Metadata and ownership](0004-use-native-metadata-and-existing-owners.md)
- [Distribution RFC](../rfcs/0002-project-scoped-distribution.md)
