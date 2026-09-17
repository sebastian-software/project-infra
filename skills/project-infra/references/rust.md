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
where it must be upheld.

## Share the local and CI checks

For a workspace with compatible features, start with the commands in the
[check script](../assets/rust/scripts/check.sh): formatting, Clippy with warnings
denied, tests, and the dependency policy check, all with locked resolution.

Commit the workspace lockfile and use locked resolution in ordinary CI. Add a
rustdoc build with warnings denied for published libraries. Test the MSRV and
supported platforms separately. For mutually exclusive or system-dependent
features, check explicit supported combinations.

Use `cargo deny check` for dependency policy, starting from the
[deny.toml excerpt](../assets/rust/deny.toml): the permissive license allow-list,
yanked and unmaintained crates as errors, and crates.io as the only source.
Record a finding as a narrow, commented exception for the crate that raised it,
never by widening the shared allow-list. Treat duplicate versions as warnings
unless their cost justifies a stricter rule.

Where a check needs a long flag list, declare a Cargo alias for it, as the
[alias excerpt](../assets/rust/.cargo/config.toml) does for coverage runs. A
contributor and the workflow then run the same name instead of two flag lists
that drift apart.

Keep extended checks such as fuzzing and benchmarks in named gates with their
prerequisites documented. Their cost and external requirements should not make
the ordinary development loop unreliable.

## Configure releases for their consumers

Use Cargo's release defaults until measured size or performance needs justify
changes. Explain custom profile settings next to them. Native integration can
require unwinding panics, so panic behavior must match the artifact's contract.

Declare publication intent per crate. Preserve licenses, attribution, public
features, and supported targets. Use the [artifact checks](ci-and-releases.md#verify-the-artifact-consumers-receive)
to verify what a consumer will install.
