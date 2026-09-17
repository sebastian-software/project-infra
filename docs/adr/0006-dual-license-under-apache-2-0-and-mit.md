# ADR-0006: Dual license under Apache 2.0 and MIT

- Status: accepted
- Date: 2026-09-17

## Context

The repository distributes an Agent Skill that consuming projects copy into
their own repositories and commit. Those projects include private products and
public packages. Without a stated license, a copied skill has no permission
grant, so a consumer cannot rely on it and an external contributor cannot know
what their contribution is licensed under.

## Decision

License the repository under the Apache License 2.0 and the MIT license, at the
user's option. Keep both texts at the repository root as `LICENSE-APACHE` and
`LICENSE-MIT`.

Declare `license: MIT OR Apache-2.0` in the skill's frontmatter. The Agent
Skills format defines that field and the installer preserves it, so the
installed copy states its own terms without carrying both full texts into every
consuming repository.

State in the contribution guide that a contribution is licensed under the same
terms unless its author says otherwise.

## Alternatives considered

- MIT alone is short and widely understood, but grants no explicit patent
  license and offers no contribution terms.
- Apache 2.0 alone provides the patent grant, but its notice requirements are
  heavier than some consumers accept for a copied instruction package.
- The dual choice is the common arrangement in the Rust ecosystem and lets each
  consumer take the terms that fit its own distribution.

## Consequences

A consumer chooses either license and does not need to satisfy both. Copying the
skill into a project is covered, including into a closed product.

The full texts live only in this repository. A consumer who redistributes the
installed skill outside their own project must include the text of the license
they chose; the frontmatter identifies which licenses apply.

Adding a third-party file under different terms would need its own notice. This
decision covers content written for this repository.

## References

- [Contribution guide](../../CONTRIBUTING.md)
- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [SPDX license expressions](https://spdx.dev/learn/handling-license-info/)
