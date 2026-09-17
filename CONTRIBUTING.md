# Contributing

This repository contains an Agent Skill, its standards, and design records.
Read the [ADR index](docs/adr/README.md) for constraints and the
[RFC index](docs/rfcs/README.md) for unresolved implementation questions.
Contributions are covered by the [dual license](#license) described below.

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

Edit `skills/project-infra/SKILL.md` for the workflow, its `references/` for
standards, and its `assets/` for configuration excerpts. Keep the entry point
short and load profiles only when applicable. Keep each excerpt minimal, valid
for its native parser, and linked from the reference that explains it.
All relative links in the installed package must resolve within that directory.
Keep installation instructions and design records outside it.

The pinned Skills CLI version appears in the README, this guide, `SKILL.md`, and
the installation guide. Bump every occurrence together and treat the bump as an
installer change.

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
available. Check frontmatter, links, and discovery, and parse each configuration
excerpt with its native tool; a successful parse does not prove the instructions
make good decisions.

Review an instruction change for whether it is necessary, unambiguous, correctly
scoped, consistent with existing instructions, and located at its source of
truth. Look for conflicts between general defaults and language-specific
requirements, and for duplicates with slightly different wording. Read the
change against concrete scenarios:

- An established check command can stay when it provides the complete,
  documented gate; renaming alone adds churn.
- A Rust workspace with Node bindings needs both profiles, scoped to the actual
  packages.
- Updating a CI check must preserve custom deployment dependencies and required
  check names.
- A generated README needs changes to its authored input and regeneration.
- An aligned project can finish without a diff.

When a real run fails, identify whether the cause is unclear content, incorrect
detection, an installer problem, or an agent error, and rewrite or remove the
relevant instruction. Do not append an exception to the skill for every isolated
incident.

## Write and review a record

- Use US English and concrete project terminology.
- Give each durable decision one numbered ADR under `docs/adr/`. ADRs describe
  what project-infra is and how it is distributed and maintained; they link to
  the skill instead of restating its conventions.
- Use a numbered RFC under `docs/rfcs/` for an implementation proposal with open
  questions. Draft examples must be labeled as proposals, not working interfaces.
- Keep rationale in ADRs and implementation details in their owning RFC or,
  later, code and configuration. Link between them instead of copying rules.
- Update the relevant index when adding or changing a record's status.

ADR statuses are `proposed`, `accepted`, `rejected`, `deprecated`, and
`superseded`. Accepted ADRs preserve the decision as made. Correct typos or broken
links in place; use a successor ADR for a semantic change and link both records.

RFCs begin as `draft` and can evolve during discussion. When a proposal is
resolved, record the decision in an ADR and remove the RFC, or mark it `resolved`
while other records still link to it. A draft RFC is not authorization to
implement it, run automation, or migrate other repositories.

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

## License

This project is dual licensed under the [Apache License 2.0](LICENSE-APACHE) and
the [MIT license](LICENSE-MIT). A user may choose either.

Unless you state otherwise, any contribution you intentionally submit for
inclusion in this project is licensed under those same terms, with no additional
conditions.
