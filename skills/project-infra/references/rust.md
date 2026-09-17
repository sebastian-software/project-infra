# Rust

Applies to Rust packages, workspaces, and native components inside mixed projects.
The [common workflow](common.md) also applies.

## Declare compatibility in Cargo

Use edition 2024 for new crates with a compatible toolchain. Declare
`resolver = "3"` in every edition 2024 workspace, including one that already
exists: the resolver is a workspace-root setting, so an older value declared
there keeps applying to all members whatever edition they use. Keep a standalone
crate as a package; use a workspace when members share dependencies or
configuration.

Declare the minimum supported Rust version (MSRV) as `rust-version` in
`Cargo.toml`. Keep shared values in `[workspace.package]` and opt members into
inheritance. Derive the CI MSRV check from that declaration to avoid conflicting
support claims. Test the declared floor and preserve it during tooling updates.
The [workspace](../assets/rust/Cargo.toml) and
[member](../assets/rust/crates/example/Cargo.toml) excerpts show the inheritance.

Use `rust-toolchain.toml` for the contributor toolchain and rustfmt/Clippy
components, as in the [toolchain excerpt](../assets/rust/rust-toolchain.toml).
Default to stable; pin a release when repeatable tool behavior requires it. The
contributor toolchain and the consumer support floor serve different purposes.

## Keep formatting and lint policy native

Use rustfmt's defaults and configure only what would otherwise differ between
machines, as the [rustfmt excerpt](../assets/rust/rustfmt.toml) does for the
parsing edition and the line ending. Pair the newline setting with an `eol=lf`
rule in `.gitattributes`, so a Windows checkout formats to the same bytes the
formatting check expects.

Put lint levels in `[workspace.lints]` with member inheritance, or `[lints]` for
a standalone package. Cargo then owns the policy alongside the code it checks.

Start with Clippy's `all` group and make warnings fail the gate. Deny broken
intra-doc links so a reference that no longer resolves fails the rustdoc build
instead of reaching published documentation. Add targeted rules for demonstrated
defects, keeping exceptions narrow and explained. The
[workspace excerpt](../assets/rust/Cargo.toml) carries this baseline next to the
shared package metadata.

For a new safe-Rust package, forbid unsafe code. Where native integration or
low-level code requires it, document the safety argument at each unsafe operation
and deny `unsafe_op_in_unsafe_fn`. This makes the contract explicit at the point
where it must be upheld. Enumerate the files allowed to carry `unsafe` in a
committed list, one path and its reason per line, and check it with the
[unsafe audit script](../assets/rust/scripts/check-unsafe.sh). A file that gains
`unsafe` without an entry fails the check, and so does an entry whose file no
longer carries any, so the inventory cannot quietly stop describing the tree.
`#![forbid(unsafe_code)]` stays the crate-level default wherever the list names
no file.

## Share the local and CI checks

For a workspace with compatible features, start with the commands in the
[check script](../assets/rust/scripts/check.sh): formatting, Clippy with warnings
denied, tests, and the dependency policy check, all with locked resolution.

Commit the workspace lockfile and use locked resolution in ordinary CI. Split
the workflow into jobs that answer separate questions, as the
[check workflow excerpt](../assets/ci/check.yml) does, so a failure names the
property that broke instead of arriving as one long log:

| Job         | What it establishes                                                          | Keep it when                               |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| `rust`      | The gate script on one platform: formatting, lints, tests, dependency policy | Always                                     |
| `msrv`      | The declared floor still builds the workspace                                | Always                                     |
| `platforms` | The test suite on every operating system the product supports                | The product supports more than one         |
| `rustdoc`   | The documentation builds under the flags docs.rs uses                        | The repository publishes a library         |
| `features`  | The feature combinations `--all-features` never builds                       | Features are exclusive or system-dependent |
| `coverage`  | The measured line coverage against the floor the repository commits          | The repository publishes a coverage number |

Every job the project keeps also belongs in the aggregate gate's `needs` list
and gets a result test of its own. A job left out of both reports to nobody, and
its failure blocks nothing.

The `msrv` job reads `rust-version` from `Cargo.toml` in a shell step and
publishes it as a step output, which keeps the declaration the only copy of the
floor: a bump moves the lane with it, and another job needing the value copies
those same two steps rather than a literal version. Run the check as
`cargo "+$MSRV"`. rustup resolves a toolchain in a fixed order — the
`+toolchain` argument, then `RUSTUP_TOOLCHAIN`, then a directory override, then
`rust-toolchain.toml`, then the default toolchain — so a step that installs the
floor and only makes it the rustup default loses to a committed
`rust-toolchain.toml`, and the lane reports on stable while claiming to test the
floor. `rustup override set` outranks the file too, and a `RUSTUP_TOOLCHAIN`
exported by an earlier setup step outranks both and decides every later command
in that job whatever the file says. `rustup show active-toolchain` prints which
one won. Compiling is enough for the claim the floor makes; run the tests on it
as well where the project promises its behavior there.

A project that states its floor relative to current stable, such as stable minus
two releases, can assert that rule in a job of its own: fetch
`channel-rust-stable.toml` from `static.rust-lang.org`, read the version under
`[pkg.rust]`, and compare it with the declared `rust-version`. Keep that job on
`schedule` and `workflow_dispatch` only. It depends on a network fetch and on
Rust's release calendar rather than the repository's, so on pull requests an
upstream release or a transient outage would fail a change that caused neither.
Being scheduled, it also stays out of the gate, which would otherwise read
`skipped` on every pull request.

The `rustdoc` job builds with `-D warnings --cfg docsrs` in `RUSTDOCFLAGS` and
`--no-deps`, matching what `[package.metadata.docs.rs]` in the
[member excerpt](../assets/rust/crates/example/Cargo.toml) tells docs.rs to do.
A broken link or an unresolved reference then fails the check instead of
reaching the published documentation. `--cfg docsrs` is an ordinary cfg and
needs no nightly by itself; a crate needs one when it gates `feature(doc_cfg)`
behind that cfg to render feature badges, and the nightly release then belongs
in the same pinned set as the project's other tool versions. Otherwise leave the
job on the toolchain `rust-toolchain.toml` selects.

Test the supported operating systems in a matrix that runs tests only: the
platform-independent checks already ran in the gate script, and repeating them
per runner buys nothing. Where the project ships a statically linked binary,
give `x86_64-unknown-linux-musl` a lane that builds, tests, and runs the binary
once, because that target needs a linker the default runner image does not carry
and a binary that only compiles has not been shown to start. Benchmarks compile
already, since the gate script lints `--all-targets`; a benchmark outside that
command, in a separate workspace or behind a feature, needs its own
`cargo bench --no-run --locked` so it cannot rot unnoticed.

Where the project publishes a coverage number, measure it in a job of its own
and let that job enforce it. The
[coverage script](../assets/rust/scripts/coverage.sh) runs the instrumented
suite once, writes `target/lcov.info`, derives the workspace percentage and
every per-crate percentage from that one report, and prints each of them
against its floor before it exits non-zero for a floor that was missed; the
workflow uploads that report from the same job, which is the
[order a coverage gate runs in](ci-and-releases.md#keep-ci-reproducible-and-bounded).
The floors live in a committed `coverage-floor` file, one
`<scope> = <percent>` entry per line: `rust` for the whole report, and a key
naming a crate's directory wherever one member has to hold a higher bar than
the workspace around it. A scope that matches no file in the report fails
rather than guarding nothing, and generated sources and fixture members leave
the report through the script's ignore regex, which filters the report where
`--exclude <crate>` would drop a member from the instrumented run itself. The
job adds the `llvm-tools-preview` component, which carries the `llvm-profdata`
and `llvm-cov` binaries the instrumentation needs, and takes cargo-llvm-cov
from the pinned tool set.

Use `cargo deny check` for dependency policy, starting from the
[deny.toml excerpt](../assets/rust/deny.toml): the permissive license allow-list,
yanked and unmaintained crates as errors, and crates.io as the only source.
Record a finding as a narrow, commented exception for the crate that raised it,
never by widening the shared allow-list. Treat duplicate versions as warnings
unless their cost justifies a stricter rule.

cargo-deny and the other helpers these jobs call are CLI tools rather than crate
dependencies, so pin them where the project's
[other CLI tools](common.md#keep-tool-selection-in-the-project) live: the
[mise.toml excerpt](../assets/common/mise.toml) names each tool and its version,
`mise.lock` records the archive and checksum per platform, and the workflow
installs them with `jdx/mise-action` and `install_args: --locked`. A contributor
and CI then resolve the same reviewed version, Renovate's mise manager proposes
the next one as an ordinary pull request, and no job spends minutes compiling a
helper it could download. Where a tool publishes no release archive mise can
fetch, an installer action that resolves its own prebuilt binaries stays
acceptable for that tool; `cargo install` is the last resort, because it
compiles on every run and pins nothing the lockfile can record.

Where a check needs a long flag list, declare a Cargo alias for it, as the
[alias excerpt](../assets/rust/.cargo/config.toml) does for coverage runs. A
contributor and the workflow then run the same name instead of two flag lists
that drift apart.

A published library crate also carries a compatibility contract. Run
`cargo-semver-checks` on pull requests with the base commit as the baseline: it
compares the rustdoc of both revisions and names the rule a change breaks, which
no test suite reports, because a removed variant or an added trait bound still
compiles here and fails in a dependent crate. State the feature group it checks;
an item reachable only behind a feature is invisible to a default-features run.
The [semver job excerpt](../assets/ci/semver.yml) shows the baseline input, the
full history the comparison needs, and the single reviewed break that redefines
the contract before the first stable release.

A public-API snapshot committed next to the crate answers a different question:
its diff shows what the surface becomes, not only whether the change breaks it.
That is worth its maintenance once reviewers govern the API of a stable library,
and is churn in a crate whose surface still moves with every feature. The
[snapshot script](../assets/rust/scripts/check-public-api.sh) regenerates the
listed crates' surfaces and diffs them against the committed files, or rewrites
those files with `--write`. The snapshot tool reads rustdoc's JSON output,
which a stable toolchain does not expose, so pin the nightly release and the
tool version together wherever the project installs them; an unpinned pair
fails the check on an unrelated toolchain update.

Verify packaging on the packaged result, not on the workspace that produced it.
The [package verification script](../assets/rust/scripts/verify-packages.sh)
archives the published crates in publish order, runs each archive's own tests
with the already-packaged siblings patched in place of their registry versions,
and installs a named binary crate from its archive to check that the binary
starts. The workspace lends a crate its path dependencies, a shared lockfile,
and features another member enables; the archive carries none of that, so a file
left outside `include` or a feature the crate never declared itself fails here
instead of in the first project that depends on the release. A crate that sits
at the repository root offers Cargo everything around it unless `include` names
what ships. Assert that allow-list in a test, so neither a new directory beside
the crate nor a dropped file changes the archive unnoticed.

Keep extended checks such as fuzzing and benchmarks in named gates with their
prerequisites documented. Their cost and external requirements should not make
the ordinary development loop unreliable.

Put cargo-fuzz targets in a `fuzz/` directory that forms its own workspace,
excluded from the root workspace, and commit a seed corpus for each target. The
harnesses need a nightly toolchain for sanitizer instrumentation and depend on
crates no release should carry, and the exclusion keeps those requirements out
of the workspace-wide build, lint, and MSRV commands. The committed seeds start every
run from reviewed coverage instead of an empty corpus, and they give a minimized
crash input somewhere to stay as a regression fixture. That second workspace
carries its own `Cargo.lock`, which no release strategy rewrites: list it among
the [release configuration](ci-and-releases.md#configure-release-please)'s extra
files, so a release commit does not leave the fuzz workspace unbuildable under
`--locked`.

Give the scheduled lane a long budget, and a pull-request lane, where the
project wants one, a short one. A fuzzer's yield grows with the time it runs, while a check that
gates a merge has to finish in a predictable few minutes, so the short lane
rules out only shallow regressions and the schedule does the searching. Bound
every run by total time, per-input timeout, and memory, and upload the crash
input on failure; otherwise the reproducer exists only in the run log and cannot
be replayed or minimized. The [fuzz workflow excerpt](../assets/ci/fuzz.yml)
shows the target matrix, the pinned nightly, and those bounds.

Where a project cannot carry a nightly toolchain, a deterministic mutation test
over its own fixtures covers part of the same ground on stable: derive malformed
variants of every committed example, push each through the public entry point
under a wall-clock budget, and assert only that it returns instead of panicking
or hanging. Its input set is fixed, so a failure reproduces from the ordinary
test command rather than from an uploaded artifact.

## Configure releases for their consumers

Use Cargo's release defaults until measured size or performance needs justify
changes. Explain custom profile settings next to them. Native integration can
require unwinding panics, so panic behavior must match the artifact's contract.

A crate compiled as a `cdylib` for a Node addon is that case: give it a profile
such as `[profile.release-node]` that inherits `release` and sets
`panic = "unwind"`, as the [workspace excerpt](../assets/rust/Cargo.toml) shows.
With `panic = "abort"` a panic takes down the host process instead of reaching
the binding that would turn it into a JavaScript error, and the profile is the
only place that choice is visible. Verify it where it matters rather than in the
manifest: load the built addon and call a function that panics, then require a
caught error and a process that is still running.

Declare publication intent per crate. Preserve licenses, attribution, public
features, and supported targets. Use the [artifact checks](ci-and-releases.md#verify-the-artifact-consumers-receive)
to verify what a consumer will install.
