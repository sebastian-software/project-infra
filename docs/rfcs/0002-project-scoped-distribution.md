# RFC-0002: Project-scoped distribution

- Status: draft
- Date: 2026-09-16
- Decisions: [ADR-0003](../adr/0003-install-and-version-at-project-scope.md),
  [ADR-0005](../adr/0005-separate-portable-content-from-integrations.md)

## Problem

The package must reach the app in the project where the agent works. It should
be easy to install, update, review in Git, and use from another developer's clone.
The intended scope is the project; a required global source store would not
match the requested starting point.

The package may eventually include more than an invoked skill. Selecting an
installer therefore requires checking what it actually installs, updates, and
removes for each component.

## Required outcome

- The portable content is installed within the consuming repository and can be
  tracked in Git.
- Supported apps discover the project's selected content.
- An update changes that content in a reviewable way.
- A clean clone does not depend on an absolute symlink into another person's
  home directory or an untracked global checkout.
- Updating and applying conventions remain separate, visible steps.
- Optional hooks and app configuration have explicit ownership and support.

## Candidates

### Plain Agent Skills package with an existing installer

The `skills` CLI supports project-scoped installation, agent selection, and
targeted updates. It is a plausible first path for the portable core.

The following is a **future example**, not a working quick start for the current
documentation-only repository:

```sh
# Candidate installation after an installable skill exists.
npx skills add sebastian-software/project-infra \
  --skill project-infra -a codex -a claude-code

# Candidate update of that project-scoped skill.
npx skills update project-infra -p
```

The flags come from the installer documentation reviewed during the discussion.
They have not been exercised against this package. The example requires Node.js
and npm on the machine running the installer; that must not be confused with a
requirement to turn a Rust or documentation project into a Node project.

Verify the actual output layout, relative links, tracked metadata, update
behavior, and uninstall behavior before adopting this path. A skill installer
does not automatically establish working hook or standing-instruction delivery.

### Dalo portable plugin

Dalo's portable-plugin design can group the broader component set discussed for
project-infra. It distinguishes portable content from app-specific output,
including instructions and supported hooks.

The earlier user-level Dalo source-store suggestion did not match the requested
project scope. Revisit Dalo only against the actual project-local requirement.
Do not assume that a source manifest or a locally available command proves the
required end-to-end installation path exists.

### Other native or Git-based packaging

An app-native plugin may provide a better integrated installation experience but
can bind the package to one app. A Git checkout or submodule can preserve a source
revision but adds maintenance and discovery steps. Consider either when it solves
a demonstrated gap, rather than building a custom installer immediately.

## App discovery

Current docs describe project skill discovery through `.agents/skills` for Codex
and `.claude/skills` for Claude Code. Both can follow skill-directory symlinks.
These locations describe skill discovery, not a universal plugin contract.

The eventual guide must state what happens if another installed skill has the
same name, and must not assume every app gives project content the same priority.
The package should avoid installing multiple competing copies of its own rules.

For a richer package, evaluate each component separately:

| Component                    | Installation question                                                       |
| ---------------------------- | --------------------------------------------------------------------------- |
| Invoked skill and references | Can the app discover the committed project-local content?                   |
| Standing instructions        | What file or section is owned, and how are existing instructions preserved? |
| Hook                         | Which native event and trust mechanism are supported?                       |
| Agent definition             | Does the app support the intended role, or is this component omitted?       |
| Helper script or tool        | Where does it execute, with which prerequisites and inputs?                 |

## Updates and provenance

Keep instruction updates and resulting project changes together for review.
Record source provenance through the installer's existing mechanism where
available. Inspect that mechanism before promising exact restoration from a
lockfile: a content hash is not necessarily a fetchable immutable source pin.

Start a fresh agent session or use a verified reload path after updating. Old
instructions already read by an agent may remain in its conversation context.
Do not replace package files midway through a run and then claim the run used a
single consistent source snapshot.

## Open questions

1. Is the first release a plain skill, or does a concrete requirement already
   justify a richer plugin?
2. Which supported installer provides the simplest correct project-local path?
3. Which files and provenance records should a consumer commit?
4. How should local edits to installed upstream content be handled on update?
5. What does a clean clone need beyond the agent app, especially for Rust-only
   consumers?
6. Which app versions are supported, and what is the tested reload procedure?
7. What license should the distributed content use?

## References

- [Skills CLI](https://github.com/vercel-labs/skills)
- [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Dalo package proposal](https://github.com/sebastian-software/dalo/blob/main/docs/rfcs/0005-portable-plugins-and-agent-stacks.md)
