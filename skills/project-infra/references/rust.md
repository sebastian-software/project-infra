# Rust

Applies to Rust packages, workspaces, and native components inside mixed projects.
The [common workflow](common.md) also applies.

## Declare compatibility in Cargo

Use edition 2024 for new crates and resolver 3 for new workspaces with a
compatible toolchain. Keep a standalone crate as a package; use a workspace
when members share dependencies or configuration.

Declare the minimum supported Rust version (MSRV) as `rust-version` in
`Cargo.toml`. Keep shared values in `[workspace.package]` and opt members into
inheritance. Derive the CI MSRV check from that declaration to avoid conflicting
support claims. Test the declared floor and preserve it during tooling updates.

Use `rust-toolchain.toml` for the contributor toolchain and rustfmt/Clippy
components. Default to stable; pin a release when repeatable tool behavior
requires it. The contributor toolchain and the consumer support floor serve
different purposes.

## Keep formatting and lint policy native

Use rustfmt with minimal configuration. Put lint levels in `[workspace.lints]`
with member inheritance, or `[lints]` for a standalone package. Cargo then owns
the policy alongside the code it checks.

Start with Clippy's `all` group and make warnings fail the gate. Add targeted
rules for demonstrated defects, keeping exceptions narrow and explained.

For a new safe-Rust package, forbid unsafe code. Where native integration or
low-level code requires it, document the safety argument at each unsafe operation
and deny `unsafe_op_in_unsafe_fn`. This makes the contract explicit at the point
where it must be upheld.

## Share the local and CI checks

For a workspace with compatible features, start with:

```sh
cargo fmt --all --check
cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
cargo test --workspace --all-features --locked
```

Commit the workspace lockfile and use locked resolution in ordinary CI. Add a
rustdoc build with warnings denied for published libraries. Test the MSRV and
supported platforms separately. For mutually exclusive or system-dependent
features, check explicit supported combinations.

Use `cargo deny check` for dependency policy. Keep findings and narrow exceptions
in `deny.toml`, with reasons. Preserve the project's license policy; do not widen
a shared allowlist to clear one dependency finding. Treat duplicate versions as
warnings unless their cost justifies a stricter rule.

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
