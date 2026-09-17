#!/usr/bin/env sh
# Complete local gate for a Rust workspace. CI runs this same script.
# Requires the toolchain from rust-toolchain.toml and cargo-deny.
set -eu

cargo fmt --all --check
cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
cargo test --workspace --all-features --locked
cargo deny check
# scripts/check-unsafe.sh   # only for a repository with an unsafe allowlist
