# project-infra

**Shared project infrastructure conventions for Sebastian Software.**

`project-infra` defines how a project's core infrastructure should be organized:
CI, development tools, releases, repository configuration, and the documentation
needed to use them. An agent applies these conventions in the context of the
project, including its existing customizations.

## Current status

This repository contains an [initial set of infrastructure standards](docs/conventions/README.md),
decisions, and implementation proposals. The standards explain the supported
tools, their responsibilities, and the reasons for using them. An installable
skill, plugin, CLI, and working hook integration are still pending.

The direction is to install the package **inside each consuming project**, update
that local installation, and ask the agent to bring the project up to date.
The package may combine a skill, reference files, standing instructions, and
optional hooks or agent definitions. The distribution format is still open.

Projects adopt the guidance through focused updates that preserve their
compatibility contracts and include the affected contributor documentation.

## Start reading

| If you want to understand...                                | Read                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Which infrastructure defaults to apply                      | [Current standards](docs/conventions/README.md)                              |
| What was decided, and why                                   | [Architecture decisions](docs/adr/README.md)                                 |
| How the proposed system could work                          | [RFCs and open questions](docs/rfcs/README.md)                               |
| What an agent would do in a project                         | [The skill workflow](docs/rfcs/0001-contextual-project-updates.md)           |
| Installation, updates, and app support                      | [Project-scoped distribution](docs/rfcs/0002-project-scoped-distribution.md) |
| Automatic triggers                                          | [Optional hooks](docs/rfcs/0003-optional-hooks-and-automation.md)            |
| How to adopt the standards and divide tool responsibilities | [Adoption and tool ownership](docs/rfcs/0004-migration-and-ecosystem.md)     |
| Keeping the instructions clear and consistent               | [Authoring and review](docs/rfcs/0005-authoring-and-review.md)               |

An **ADR** records an architectural decision and its rationale. An **RFC** is a
request for comments on a possible implementation. An accepted ADR means the
direction was agreed; it does not mean the implementation already exists.

## Contribute

Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing a decision or turning a
proposal into an implementation. Keep the project lightweight and write in
US English.
