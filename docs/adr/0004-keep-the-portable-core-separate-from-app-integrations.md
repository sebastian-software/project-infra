# ADR-0004: Keep the portable core separate from app integrations

- Status: accepted
- Date: 2026-09-16

## Context

Beyond the invoked skill, the package could grow optional hooks, standing
instructions in `AGENTS.md` or `CLAUDE.md`, and agent definitions. These
components serve different purposes: a skill describes an invoked task, standing
instructions affect ongoing work, a hook reacts to an event, and an agent
definition configures a role. They should not become equivalent just because
they share a repository.

## Decision

Keep a portable core of conventions, task instructions, and reference assets.
Allow the package to grow optional integrations around that core. The package
describes how project infrastructure should look; the selected agent performs
the work.

Keep app-specific discovery, hook configuration, and agent definitions at an
integration boundary. They must not require separate copies of the organization
rules for each app. Installation of the core must remain useful when optional
integrations are unavailable.

Do not infer support for hooks, standing instructions, or agent definitions from
the fact that an installer can copy a skill directory. Each capability needs its
own verified installation behavior at project scope.

The repository's own `AGENTS.md` guides contributors working on project-infra.
It is not a distributable instruction pack for consuming projects.

## Alternatives considered

A portable-plugin bundle, as proposed for Dalo, groups skills, instruction
packs, agents, tools, and hooks and maps the supported parts to each app's
native format. It remains a candidate for later integrations, not a required
runtime. [ADR-0003](0003-distribute-a-self-contained-skill-at-project-scope.md)
selected a plain Agent Skill for the first release.

## Consequences

The package can evolve beyond one skill without changing its name. Optional
integrations introduce compatibility and ownership work that a Markdown-only
skill does not have. Unsupported or partial behavior must be documented rather
than presented as equivalent across apps.

This decision does not require a new plugin compiler, installer, agent runner,
or configuration framework in project-infra.

## References

- [Optional hooks and automation](../rfcs/0001-optional-hooks-and-automation.md)
- [Agent Skills specification](https://agentskills.io/specification)
- [Dalo portable plugins and agent stacks](https://github.com/sebastian-software/dalo/blob/main/docs/rfcs/0005-portable-plugins-and-agent-stacks.md)
