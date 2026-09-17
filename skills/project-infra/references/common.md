# Common workflow and tool ownership

Applies to infrastructure updates in any project.

## Work at the right project boundary

Read the manifests, workspace declarations, contribution guide, CI entry points,
and repository instructions. Identify product packages, documentation sites,
generated output, examples, and fixtures before selecting a profile.

Use native workspace declarations to determine membership. This keeps checks
scoped to real project code and avoids adding tooling to a fixture or generated
package. Add a runtime only when the project needs it.

## Provide one local verification path

Provide one documented complete local gate and give it one name across stacks:
`mise run check`. The task wraps the implementation its stack already expects —
`scripts/check.sh` with native Cargo commands in a Rust project, `pnpm check` in
a Node project, and both plus the README check, chained with `depends`, in a
mixed project. A second task, `mise run fast`, runs formatting, the linter, and
the unit tests for the loop between edits. Two task names give the fast loop and
the complete gate an address a contributor can run, instead of the prose list
each document otherwise restates in its own wording, and a project that already
pins a tool with mise needs nothing new to define them. The
[mise.toml excerpt](../assets/common/mise.toml) shows both tasks; the
[check script](../assets/rust/scripts/check.sh) and
[package scripts](../assets/node/package.json) excerpts show what `check` calls.

CI runs that same `mise run check` after `jdx/mise-action`, as the
[workflow excerpt](../assets/ci/check.yml) does, so the documented command and
the workflow step stay one string. In a Node-only project that needs no
mise-managed tool, `mise run check` is `pnpm check` under a second name and is
optional; keep the established entry point when renaming it would only add
churn.

Local work and CI must share check implementations so a contributor can
reproduce failures without reverse-engineering a workflow. Keep checks
non-writing, with separate fix and generation commands. Builds may create
ignored output; changes to tracked generated files must be explicit.

Document prerequisites for credential-dependent checks, benchmarks, fuzzing, and
external fixtures. Run checks relevant to the change rather than making every
edit depend on every optional system.

Git hooks are an optional accelerator, never a second gate: a contributor can
bypass them with `--no-verify`, and CI decides whether a change is acceptable.
Keep them in a `.githooks/` directory committed with the project and enabled
once per clone:

```sh
git config core.hooksPath .githooks
```

Committed hooks are reviewed in the same diff as the checks they call, need no
runtime, dependency, or install lifecycle script, and cannot run as a side
effect of installing dependencies, so a project without a package manager gets
the same hooks as one with a package manager. Commit them executable, because
Git skips a hook file it cannot execute, and document the enable command with
the project's other setup steps, because Git never applies it automatically.

Scope `pre-commit` to the staged file types so a commit that touches only
documentation does not pay for a compiler: select the staged paths with
`git diff --cached` pathspecs and run the matching fast check. A push is rarer
and is the last local point before CI sees the commits, so let `pre-push` run
those same checks once for the whole repository, plus `mise run readme:pre-push`
in a project with a
[generated README](documentation.md#generate-shared-readme-content). The
[pre-commit](../assets/common/githooks/pre-commit) and
[pre-push](../assets/common/githooks/pre-push) excerpts show both shapes.

A hook only reads the worktree. One that formats or regenerates files changes
the content after the contributor staged and reviewed it, so the commit no
longer matches what was reviewed; keep fix and generation commands manual. A
package-manager-installed hook runner stays acceptable in a Node-only project
that already carries one and follows these rules; do not add a runtime and a
dependency to a project that otherwise needs neither.

## Test what two places must agree on

A repository states the same fact in several places: the contributor guide names
the gate, a workflow runs it, a manifest declares the supported toolchain, a
release configuration lists the files carrying the version, and a README promises
a reader a section. No compiler, linter, or test suite compares those places, so
they drift apart silently and the drift surfaces where it costs the most: a
contributor running commands CI does not run, a release commit contradicting its
own tag, a promised section that no longer exists. A repository-contract test is
a small check that fails when two such places stop agreeing. It asserts nothing
about product behavior; it asserts that each fact has one source and that every
restatement still matches that source.

Pin down the agreements a contributor, a reader, or a release depends on:

- the gate commands the contributor guide documents appear verbatim as CI steps;
- the [MSRV](rust.md#declare-compatibility-in-cargo), the coverage floor, and
  each released version have one source, and every other occurrence is derived
  from it rather than restated;
- every file carrying a version is covered by a
  [release updater](ci-and-releases.md#configure-release-please), which the
  [release-set check](../assets/common/check-release-set.mjs) proves;
- the README and the other entry points still carry the sections and links they
  promise, and every decision record appears in its
  [index](documentation.md#record-decisions-in-one-indexed-set);
- a number quoted in prose is backed by the committed report that produced it.

Keep these checks in `scripts/` or `tests/` and run them from the gate, so drift
fails on the pull request that introduces it instead of on the release that trips
over it. They read files and finish in milliseconds, which is what makes running
them on every change affordable. The
[contract check](../assets/common/check-contracts.mjs) implements the two that
apply to any repository — the documented gate commands run in CI, and the
declared MSRV is the only one stated — and takes `--section` when the gate lives
under a heading it does not recognize. Assertions about one repository's jobs,
documents, or release configuration stay with that repository, next to the files
they describe.

Two properties decide whether such a check earns its maintenance. It must name
both places in its failure message, so the fix is obvious without reading the
check, and it must fail when it finds nothing to compare, because a check that
silently matches an empty set reports success forever. Comparing command text
verbatim is strict by design: a CI step that composes or parameterizes a
documented command stops matching it. Resolve that by moving the work into the
one shared script the gate already requires, not by loosening the comparison.

## Keep tool selection in the project

Declare package-manager versions and supported runtimes in native manifests.
Commit lockfiles and use them in CI so dependency resolution is reviewable and
repeatable.

Use [mise](https://mise.jdx.dev) for shared CLI tools the package manager does
not provide, such as [mdtheme](https://github.com/sebastian-software/mdtheme).
Pin the exact version in a project-local `mise.toml`, commit the `mise.lock`
recording each supported platform's archive and checksum, and install with
`mise install --locked`. Disable automatic installation and system fallback so a
missing tool fails instead of resolving to whatever the machine provides, and
expose the tool through mise tasks so every stack shares one command name. The
[mise.toml excerpt](../assets/common/mise.toml) shows that shape; document the
installation step in the contributor guide. Keep Cargo and package-manager
metadata in their native locations.

This gives contributors and agents the same tool selection without depending
on one developer's machine setup.

## Give each setting one owner

Shared packages own shared rules. Project configuration owns deliberate local
settings. Generators own their output. Keep narrow exceptions close to the
configuration they affect and explain their purpose.

Before removing or replacing configuration, identify its readers. Update the
associated contributor documentation in the same change. Clear ownership avoids
contradictory instructions and two tools repeatedly rewriting the same files.
