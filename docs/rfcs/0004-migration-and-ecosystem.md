# RFC-0004: Migration and ecosystem boundaries

- Status: draft
- Date: 2026-09-16
- Decisions: [ADR-0001](../adr/0001-create-project-infra-as-a-separate-project.md),
  [ADR-0004](../adr/0004-use-native-metadata-and-existing-owners.md)

## Problem

The existing standards system serves real consumers. The new direction must
allow gradual adoption while preserving useful fixes, repository behavior, and
clear ownership of shared configuration.

This RFC also preserves the earlier audit work so the new design does not lose
the concrete stability and developer-experience problems that prompted it.

## Existing system discussed in the session

- `standards` owns reference files, a manifest, numbered migration instructions,
  an agent workflow, and CLI mechanics.
- `.repometa.json` records a standards integer and other repository metadata.
- Managed files are synchronized exactly; seeded files are created once and
  then need contextual adaptation; some document sections are marker-owned.
- `renovate-config` supplies general dependency policy and a standards-specific
  update path for stamps and CLI pins.
- `repo-template` bootstraps new repositories and consumes those conventions.
- Pending and blocked markers coordinate incomplete migration work and CI.

That model can work, but it creates alignment and recovery obligations among
the stamp, installed CLI, reference content, markers, and actual project state.
The founding discussion moved toward reviewing current project state against
locally installed instructions instead.

## Audit PRs: verified snapshot

The following PRs were verified as **open and unmerged on September 16, 2026**.
The status is historical evidence, not a live dashboard.

| Repository      | PR                                                                                                                                   | Head at verification                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| standards       | [#93: feat: make migrations resumable and share CI validation](https://github.com/sebastian-software/standards/pull/93)              | `c3cd16c0405977dee531df65abade1dceaec3c14` |
| renovate-config | [#25: fix: centralize standards workflow updates and clarify rollout](https://github.com/sebastian-software/renovate-config/pull/25) | `7f40db6bbefe9c638d8c91286b26c138edec1f3f` |
| repo-template   | [#14: fix: enable standards updates and simplify project setup](https://github.com/sebastian-software/repo-template/pull/14)         | `1333345434ceb5919f179a11399344b8df4e7514` |

### standards #93

The PR addresses interrupted sync advancing the stamp before remaining judgment
work is complete. It persists the original baseline before applying changes,
preserves pending work on failure, includes declared nested workspaces, and makes
preview read-only. Local agents leave a working-tree diff; the driver owns marker
completion.

It also consolidates repeated CI guards in `standards ci`, fixes bare npm publish
directory arguments by making them absolute, and handles partially completed
publishes by skipping exact versions already present. Registry lookup failures
other than an explicit missing-package response do not permit publishing.

Other changes avoid a repository scan when no formatter-ignore migration is
needed, disable signing only in test fixtures, introduce migration 0016, and
reorganize onboarding, ownership, CLI, recovery, and label documentation.

The PR description reports a passing local gate with 347 tests, CLI checks,
action-pin checks, and mdtheme generation checks. Recovery and publishing tests
used controlled fixtures; no live agent migration or registry publish was part
of that validation. Those tests were not rerun while recording this design.

### renovate-config #25

The PR centralizes detection of exact standards CLI pins in GitHub and Forgejo
workflows, including `check`, `ci`, and prerelease versions. It keeps post-upgrade
tasks scoped to the integer-stamp update path and explicitly disables automerge
for the relevant migration PRs.

The documentation explains that the CLI pin and migration stamp are separate
updates in the legacy system. The PR reports four passing Node contract tests
and configuration validation with Renovate 44.83.0. Local validation used the
JavaScript fallback because native RE2 was unavailable. These are prior results,
not validation of a new project-infra integration.

### repo-template #14

The PR adds the missing standards Renovate preset, separates code and standards
CI lanes, and preserves the existing required `check` context through an
always-evaluated aggregate. It also introduces bounded job timeouts, cancels
superseded CI runs, and improves setup and maintenance documentation.

Its description reports a passing frozen install and local gate, mdtheme checks,
guard-script fixtures, and all 16 success/failure/canceled/skipped aggregate
combinations. The empty template has no application packages to build or test.

The PR retains published CLI 0.11.1 and stamp 13 pending the legacy release that
introduces the shared CI command. That is the PR's compatibility choice, not a
version requirement for project-infra.

### Legacy rollout dependencies to preserve

If those PRs proceed, publish the CLI that provides `standards ci` before using
that command in consumers. Make the shared Renovate preset available before
removing equivalent consumer regex managers. Preserve existing branch-protection
check names until their required contexts are deliberately changed.

Creating project-infra neither performs this rollout nor authorizes merging the
PRs. Their focused fixes remain useful to repositories that continue using the
legacy model.

## Proposed ecosystem ownership

| Component                        | Responsibility during the transition                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| project-infra                    | Current project infrastructure intent, adaptable references, and agent-facing application guidance |
| standards                        | Existing consumers and their legacy migration mechanics until explicitly retired                   |
| renovate-config                  | Shared dependency update policy; evaluate package-update integration separately                    |
| repo-template                    | Optional initial scaffolding for new repositories                                                  |
| mdtheme                          | README rendering, branding, and the related ownership inputs                                       |
| Consumer repository              | Actual project configuration, intentional customizations, and project checks                       |
| Agent app or external automation | Execution context, invocation, and optional scheduling                                             |

If repo-template continues, it should consume the same applicable conventions
or assets rather than become an independent specification of the rules. The
exact reuse mechanism is open. A template need not become an update engine.

## Proposed gradual adoption

1. Select a small useful convention set and a verified project-local installation
   path. Do not copy the full legacy framework into this repository.
2. Choose a willing pilot consumer and use manual invocation. A Node project,
   Rust project, and customized or mixed project are useful eventual examples,
   not a required automated benchmark matrix.
3. In the pilot change, inventory the files, markers, CI checks, generator inputs,
   and instructions owned by the old system.
4. Transfer ownership coherently. Do not leave the old generator and new agent
   both authoritative over the same files or sections.
5. Update or remove obsolete checks and metadata only when their remaining
   readers have been identified. Preserve unrelated dependency automation,
   deployment jobs, branch protection, and native project gates.
6. Review the package update, project adaptations, and documentation together.
   Learn from the result before selecting more consumers.

During cutover, existing managed-file rules still apply until explicitly
replaced. A new ADR in this repository is not permission to bypass a consumer's
current ownership contract.

## Reuse current intent, not all historical machinery

The legacy references include useful subjects to evaluate: shared Renovate
policy, formatter and linter setup, Rust toolchain and minimum supported Rust
version (MSRV), dependency policy, CI job names, release workflows, contribution
files, and generated documentation.

For example, current Rust guidance keeps MSRV in `Cargo.toml`, workspace lint
levels in workspace configuration, and dependency-policy exceptions narrow.
Current Node guidance separates shared formatter configuration from repo-local
ignores. Preserve the rationale where useful, but do not declare every legacy
file, tool choice, or copy rule mandatory without reviewing its purpose.

## Recovery and retirement

A pilot must explain how to recover from incomplete changes. Reverting a package
update alone may leave project adaptations behind; reverting the complete pilot
change is a different operation. Neither procedure is implemented here.

Retire old stamps, custom datasource rules, CLI pins, or markers only when no
remaining consumer or workflow needs them. Keep enough history to understand a
past transition without requiring future users to read every old migration.

## Open questions

1. Which repository is the first pilot, and what concrete result makes it useful?
2. Which legacy conventions still justify their maintenance cost?
3. Should ordinary dependency automation update the installed package, and can
   it do so through the selected installer without a custom stamp protocol?
4. How should repo-template reuse the current source of truth?
5. Which mdtheme changes are needed to complete the ownership transfer?
6. What evidence is sufficient to retire each part of the legacy system?

## Related proposals

- [Contextual update workflow](0001-contextual-project-updates.md)
- [Distribution and installation](0002-project-scoped-distribution.md)
- [Optional automation](0003-optional-hooks-and-automation.md)
