# Contributing

This repository contains an Agent Skill, its standards, and design records.
Read the [ADR index](docs/adr/README.md) for constraints and the
[RFC index](docs/rfcs/README.md) for unresolved implementation questions.

## Improve a standard

The [skill references](docs/conventions/README.md) own the current defaults.
Refine them in place when project trials reveal a better choice. Explain the
technical reason, applicability, and verification path; retain concrete
exceptions and link to shared tools instead of copying their policy catalogs.
Write the supported path. Do not justify a choice by listing projects that used
it, or preserve retired tools as competing recommendations.

Routine convention changes do not need their own ADR. Record a successor ADR
when changing an accepted architectural direction. Keep draft integrations
distinct from the behavior already implemented.

## Change the skill

Edit `skills/project-infra/SKILL.md` for the workflow and its `references/` for
standards. Keep the entry point short and load profiles only when applicable.
All relative links in the installed package must resolve within that directory.
Keep installation instructions and design records outside it.

For a local trial, run the following from a disposable Git repository, replacing
the path with your project-infra checkout:

```sh
npx skills@1.5.26 add /absolute/path/to/project-infra \
  --skill project-infra --agent codex claude-code --yes
```

Inspect the installed files and open that project in the selected apps. Rerun
`add` after editing a local source; local-path installs do not record the source
path needed by the targeted updater. Test the GitHub source before claiming that
remote updates work. For packaging or installer changes, verify a changed-source
update, relative links after a clean clone, and removal. Preserve a separate
skill and local project instructions in the fixture to check update scope.

Use the existing Agent Skills validator or the skill-creator validator when
available. Check frontmatter, links, and discovery; a successful parse does not
prove the instructions make good decisions. Review scope selection and conflicts
using the [workflow scenarios](docs/rfcs/0001-contextual-project-updates.md#useful-review-scenarios).

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
resolved, mark it `resolved`, record the decision in an ADR, and link it from the
RFC. A draft RFC is not authorization to implement it, run automation, or migrate
other repositories.

## Review documentation changes

Before committing:

1. Check that the text follows accepted decisions and keeps open choices open.
2. Read the changed document from its intended entry point, without relying on
   the founding conversation.
3. Check relative links, headings, examples, dates, and index entries.
4. Run `git diff --check` after staging new files or changing tracked files.
5. State which checks ran and identify examples that have not been executed.

The skill is distributed as source files and needs no build. Use available
formatting and validation tools; add repository tooling only when a concrete
need justifies its maintenance cost. Record meaningful checks in the PR instead
of maintaining an agent benchmark suite.
