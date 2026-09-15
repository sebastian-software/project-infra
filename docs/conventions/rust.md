# Rust

Applies to Rust packages, workspaces, and native components inside mixed projects.
The [common workflow](common.md) also applies.

## Manifests and compatibility

**Default:** use edition 2024 for new crates and resolver 3 for new workspaces
whose toolchain supports it. Keep a standalone crate as a package; introduce a
workspace when there are actual members or shared configuration to coordinate.

Declare the minimum supported Rust version (MSRV) as `rust-version` in
`Cargo.toml`. In a workspace, keep shared values in
`[workspace.package]` and opt members into inheritance. Derive the MSRV check in
CI from that source. Choose the minimum supported Rust version from the actual
language and dependency requirements; an infrastructure update must not silently
raise a published library's support floor.

Use `rust-toolchain.toml` for the contributor toolchain and required rustfmt and
Clippy components. Default to stable; pin a release when tool behavior requires
it. The contributor toolchain and MSRV are different facts. Test the declared
MSRV separately, and keep derived copies synchronized.

The variation is substantial: Ferrugo declares edition 2021 and Rust 1.81,
Dalo declares edition 2024 and Rust 1.94, and Ferralk uses resolver 3. These are
compatibility inputs, not values to replace with the highest observed version.

Evidence: [Ferrugo manifest](https://github.com/sebastian-software/ferrugo/blob/445227a1d3a9d0a7bbe1491240b2839886f3dcbd/Cargo.toml),
[Dalo manifest](https://github.com/sebastian-software/dalo/blob/4fdef503716b16fb911767a252daca0e38b67adf/Cargo.toml), [Ferralk workspace](https://github.com/sebastian-software/ferralk/blob/ddfabcbb421bdbdd8cbc4a73a9232b1a0102edd4/Cargo.toml),
[Ferrocat toolchain](https://github.com/sebastian-software/ferrocat/blob/28a51a638724c57f1f9e08284e88fb6a26c42f09/rust-toolchain.toml),
[Ferrolex MSRV helper](https://github.com/sebastian-software/ferrolex/blob/e5850998d654ff8fd1b15d061fd95bf4bfc1da9c/scripts/workspace-rust-version.py).
See [Cargo workspace inheritance](https://doc.rust-lang.org/cargo/reference/workspaces.html)
for the native mechanism.

## Formatting and lint ownership

**Default:** rustfmt with minimal configuration. Put lint levels in Cargo:
`[workspace.lints]` with member inheritance for a workspace, or `[lints]` for a
standalone package. A crate does not need an artificial workspace just to hold
its lint policy. Never put lint levels in `rustfmt.toml`.

Start with Clippy's `all` group and make warnings fail the gate. Add targeted
rules for demonstrated defects. Do not enable every pedantic or nursery rule
and then copy a large unrelated allowlist to compensate.

For a new safe-Rust package, forbid unsafe code. Native bindings, low-level
implementations, and ports can require unsafe code: scope the exception,
document the safety argument at each unsafe operation, and deny
`unsafe_op_in_unsafe_fn`. Do not apply a safe-only policy to a native component
without examining its purpose.

Dalo uses package-local lint tables. Ferromark shares lint tables across a
workspace. Ferroni permits specific patterns to preserve the structure of its
ported implementation. The portable rule is explicit ownership and a reason for
the difference, not an identical Clippy list.

Evidence: [Dalo lint policy](https://github.com/sebastian-software/dalo/blob/4fdef503716b16fb911767a252daca0e38b67adf/Cargo.toml),
[Ferromark lint policy](https://github.com/sebastian-software/ferromark/blob/dea120198145497cf4e1bec88b2d865cc050b7c3/Cargo.toml),
[Ferroni exceptions](https://github.com/sebastian-software/ferroni/blob/7eedb09359df144eb8c0a4ea3195e7636bd44910/Cargo.toml).

## The local and CI gate

For a workspace with compatible features, start with:

```sh
cargo fmt --all --check
cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
cargo test --workspace --all-features --locked
```

Commit the workspace lockfile and use locked dependency resolution in ordinary
CI. Add a rustdoc build with warnings denied for published libraries. Validate
the declared MSRV and supported platforms separately. If features are mutually
exclusive or require unavailable systems, define explicit supported combinations
instead of treating `--all-features` as universally meaningful.

Run `cargo deny check` for Rust dependency policy and keep findings narrow and
commented in `deny.toml`. Retain the project's established license policy and
crate-specific exceptions. Start duplicate-version findings as warnings;
promote them to errors where dependency duplication has a demonstrated cost.
Do not widen a shared allowlist to clear one repository's failure.

Evidence: [mdtheme local gate](https://github.com/sebastian-software/mdtheme/blob/cfae631c2387b8460ebe5e7bd92556d17ac80dd7/scripts/check.sh),
[Dalo CI and MSRV job](https://github.com/sebastian-software/dalo/blob/4fdef503716b16fb911767a252daca0e38b67adf/.github/workflows/ci.yml),
[Ferrocat dependency policy](https://github.com/sebastian-software/ferrocat/blob/28a51a638724c57f1f9e08284e88fb6a26c42f09/deny.toml).

Keep fuzzing, benchmarks, model checking, and external compatibility suites in
named extended gates with documented prerequisites. Some products need them as
release checks; they are not prerequisites for every local edit.

Evidence: [Ferrolex recipes](https://github.com/sebastian-software/ferrolex/blob/e5850998d654ff8fd1b15d061fd95bf4bfc1da9c/justfile),
[Ferralk model checks](https://github.com/sebastian-software/ferralk/blob/ddfabcbb421bdbdd8cbc4a73a9232b1a0102edd4/.github/workflows/loom.yml).

## Release behavior follows the artifact

Use Cargo's release defaults until size or performance requirements justify
overrides. Explain custom LTO, codegen, stripping, and panic settings next to the
profile. Never copy an optimized CLI profile into every crate.

Ferromark deliberately uses aborting panics for ordinary release artifacts and
unwinding for its Node binding. Palamedes has private Rust crates behind npm
packages. A Cargo manifest does not imply crates.io publication.

Evidence: [Ferromark release profiles](https://github.com/sebastian-software/ferromark/blob/dea120198145497cf4e1bec88b2d865cc050b7c3/Cargo.toml),
[Palamedes workspace](https://github.com/sebastian-software/palamedes/blob/29d30ce85d49087cdef37f05c0554c76c1d6402c/Cargo.toml).

Preserve licenses, attribution, public features, and supported targets. Verify
publishable crates and native packages using the
[artifact checks](ci-and-releases.md#verify-the-artifact-consumers-receive).
