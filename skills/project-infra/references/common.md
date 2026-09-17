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

Provide one documented complete local gate. Use `pnpm check` for a new Node
project and `scripts/check.sh` with native Cargo commands for a new Rust project;
the [package scripts](../assets/node/package.json) and
[check script](../assets/rust/scripts/check.sh) excerpts show the shape. Keep an
established, equally clear entry point when renaming it would only add churn.

Local work and CI must share check implementations so a contributor can
reproduce failures without reverse-engineering a workflow. Keep checks
non-writing, with separate fix and generation commands. Builds may create
ignored output; changes to tracked generated files must be explicit.

If a faster development loop is useful, distinguish it from the complete gate.
Document prerequisites for credential-dependent checks, benchmarks, fuzzing, and
external fixtures. Run checks relevant to the change rather than making every
edit depend on every optional system.

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
