# ADR-0005: Separate portable content from app integrations

- Status: accepted
- Date: 2026-09-16

## Context

The initial idea was a skill invoked with a request such as "bring this project
up to date." The discussion expanded to optional hooks, standing instructions
in `AGENTS.md` or `CLAUDE.md`, and agent definitions.

These components serve different purposes. A skill describes an invoked task;
standing instructions affect ongoing work; a hook reacts to an event; an agent
definition configures a role. They should not accidentally become equivalent
just because they share a repository.

## Decision

Keep a portable core of conventions, task instructions, and reference assets.
Allow the project-infra package to grow optional integrations around that core.
The package describes how project infrastructure should look; the selected agent
performs the work.

Keep app-specific discovery, hook configuration, and agent definitions at an
integration boundary. They must not require separate copies of the organization
rules for each app. Installation of the core must remain useful when optional
integrations are unavailable.

Do not infer support for hooks, standing instructions, or agent definitions from
the fact that an installer can copy a `SKILL.md` directory. Those capabilities
need their own verified installation behavior at project scope.

## Packaging under consideration

Dalo's newer portable-plugin concept is relevant to the "Skill++" idea discussed
in the session. It groups skills, instruction packs, agents, tools, and hooks,
then maps supported parts to each app's native format.

That concept is a candidate, not a selected mandatory runtime or proof that the
required project-local path already works. A plain Agent Skills package is also
a candidate for the first usable release. The choice belongs in RFC-0002.

The repository's own `AGENTS.md` guides contributors working on project-infra.
It is not automatically a distributable instruction pack for consuming projects.

## Consequences

The package can evolve beyond one skill without changing its name. Optional
integrations introduce compatibility and ownership work that a Markdown-only
skill does not have. Unsupported or partial behavior must be documented rather
than presented as equivalent across apps.

This decision does not require a new plugin compiler, installer, agent runner,
or configuration framework in project-infra.

## References

- [Distribution RFC](../rfcs/0002-project-scoped-distribution.md)
- [Hooks RFC](../rfcs/0003-optional-hooks-and-automation.md)
- [Agent Skills specification](https://agentskills.io/specification)
- [Dalo portable plugins and agent stacks](https://github.com/sebastian-software/dalo/blob/main/docs/rfcs/0005-portable-plugins-and-agent-stacks.md)
