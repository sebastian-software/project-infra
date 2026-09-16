# RFC-0001: Optional hooks and automation

- Status: draft
- Date: 2026-09-16
- Related decision: [ADR-0004](../adr/0004-keep-the-portable-core-separate-from-app-integrations.md)

## Problem

A manually invoked skill can apply current conventions, but maintainers may
forget to update or invoke it. Hooks could provide a useful automatic trigger.
The trigger should not make every commit slow, repeatedly rewrite the same
project, or duplicate the actual convention logic.

Interest in hooks exists, but no event or schedule has been selected, and this
repository installs no automation.

## Proposed boundary

The skill defines what an update means. An integration decides when to request
that update and how to launch it in the correct project context.

Start with useful manual invocation. Add a trigger when its benefit is clear.
Hook installation and any code execution must use the host's normal trust and
configuration mechanisms. The package's presence alone does not imply that
active integrations are enabled.

## Trigger candidates

| Event                                  | Possible behavior                                                   | Question to resolve                                                   |
| -------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Agent session starts                   | Check whether the installed content or project needs attention      | Can this remain fast and avoid a network dependency on every session? |
| Project-local package update completes | Suggest or start an alignment run with the newly loaded content     | How is the source snapshot made consistent before the run begins?     |
| Git post-merge                         | Inspect whether relevant infrastructure changed                     | Can irrelevant merges be ignored without a new complex detector?      |
| A project-infra release is published   | An external workflow proposes package updates in selected consumers | Who opts projects in, and which system owns the resulting PRs?        |
| Commit or push                         | Run a small existing check or provide a short signal                | Does it preserve the expected speed and avoid unexpected rewrites?    |

Git defines `post-merge`, `pre-commit`, and `pre-push` events. Agent apps define
their own lifecycle hooks, such as Claude Code's `SessionStart`. Those names and
capabilities are not a portable cross-app API.

## Execution behavior to design

Long agent work should happen as a visible task, with a reviewable diff or PR.
Keep routine commit and push operations responsive. A full agent rewrite during
either operation would impose a substantial developer-experience cost.

An automated integration should account for:

- duplicate triggers for the same project and source content;
- concurrent runs changing the same working tree;
- events caused by the integration's own writes;
- interrupted or failed runs, including honest reporting of incomplete checks;
- existing user edits and the choice of an isolated worktree;
- time or cost limits appropriate to the chosen trigger;
- a straightforward way to disable or remove the integration.

These are design concerns, not a prescribed new scheduler, daemon, database, or
consumer marker protocol. An existing job or app runtime may already provide
the needed state and lifecycle. If deduplication needs state, define its owner
before adding files to the consumer.

## Compatibility and ownership

Skill distribution, hook registration, and application startup are different
operations. Document which integration is supported for each app. Preserve
unrelated settings and project instructions during install, update, and removal.

A core installation should still support manual use when optional hooks are
unsupported or disabled. Do not report a trigger as working merely because its
configuration file was written.

## Open questions

1. Is a suggestion at session start sufficient, or is a background update useful?
2. Should the first automatic trigger follow a package update rather than inspect
   every project event?
3. Which external system would own consumer PR creation and scheduling?
4. Which app supports the intended project-local event with acceptable behavior?
5. What minimal concurrency and retry handling is actually required?

## References

- [Distribution decision](../adr/0003-distribute-a-self-contained-skill-at-project-scope.md)
- [Git hooks](https://git-scm.com/docs/githooks)
- [Claude Code hooks](https://code.claude.com/docs/en/hooks#sessionstart)
