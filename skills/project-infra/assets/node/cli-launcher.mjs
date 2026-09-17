#!/usr/bin/env node
// The `bin` entry of an npm wrapper whose platform packages carry the binary.
// The wrapper lists one `optionalDependencies` entry per platform, the package
// manager installs only the entry matching the consumer's `os`, `cpu` and
// `libc`, and this launcher resolves that package, refuses a version other
// than its own, and hands the invocation to the native binary. Nothing is
// downloaded, unpacked or written at install or run time, so the install works
// offline, behind a registry mirror and with lifecycle scripts disabled, and
// the lockfile covers the binary. The costs are one published package per
// platform per release, each needing its own first publish, and one Node
// process in front of every invocation. Keep the platform list to the targets
// the release actually builds.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { constants } from "node:os";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);

// The platform ids the shared `napi-matrix` action derives, so a repository's
// CLI packages and its napi sidecars name a platform the same way.
const PLATFORMS = new Set([
  "linux-x64-gnu",
  "linux-arm64-gnu",
  "linux-x64-musl",
  "linux-arm64-musl",
  "darwin-arm64",
  "darwin-x64",
  "win32-x64-msvc",
  "win32-arm64-msvc",
]);

// This file is the wrapper's `bin`, so the wrapper manifest is one level up.
const wrapper = readManifest(path.join(import.meta.dirname, "..", "package.json"));
// What the consumer types, and the name the platform package gives its binary.
const command = Object.keys(wrapper.bin ?? {})[0] ?? wrapper.name.split("/").pop();

run(resolveBinary());

/** The installed platform package's binary, once its version is known to match. */
function resolveBinary() {
  const name = `${wrapper.name}-${platformId()}`;
  let manifestPath;
  try {
    // A platform package declares no `exports`, so its manifest resolves; the
    // resolution then follows the consumer's own installation layout.
    manifestPath = require.resolve(`${name}/package.json`);
  } catch {
    fail(
      `${name} is not installed. Install the optional dependencies of ` +
        `${wrapper.name}, or add ${name} explicitly.`,
    );
  }

  // A stale platform package is a different build of the CLI under the name
  // the consumer pinned, so the mismatch stops the run instead of reaching it
  // as unexplained behavior.
  const platform = readManifest(manifestPath);
  if (platform.version !== wrapper.version) {
    fail(
      `${wrapper.name}@${wrapper.version} resolved ${name}@${platform.version}. ` +
        `Reinstall ${wrapper.name} so its platform dependency is refreshed.`,
    );
  }

  const file = process.platform === "win32" ? `${command}.exe` : command;
  const binary = path.join(path.dirname(manifestPath), "bin", file);
  if (!existsSync(binary)) {
    fail(`${name} is installed, but carries no binary at ${binary}.`);
  }
  return binary;
}

/** The published platform id of the running process. */
function platformId() {
  const { arch } = process;
  const libc = process.platform === "linux" ? linuxLibc() : "";
  let id;
  if (process.platform === "linux") id = `linux-${arch}-${libc}`;
  else if (process.platform === "darwin") id = `darwin-${arch}`;
  else if (process.platform === "win32") id = `win32-${arch}-msvc`;

  if (id === undefined || !PLATFORMS.has(id)) {
    fail(
      `${wrapper.name} publishes no binary for ${process.platform} ${arch} ${libc}`.trim() +
        `. Published platforms: ${[...PLATFORMS].join(", ")}.`,
    );
  }
  return id;
}

/**
 * The diagnostic report carries `glibcVersionRuntime` only on a glibc runtime,
 * which separates the two Linux builds without running `ldd` in a subprocess.
 */
function linuxLibc() {
  const header = process.report?.getReport?.()?.header;
  return typeof header?.glibcVersionRuntime === "string" ? "gnu" : "musl";
}

/** Runs the binary in this process's place: same stdio, signals, exit code. */
function run(binary) {
  // On Unix the binary leads its own process group, so a terminal signal
  // reaches it once through the forward below instead of once directly and
  // once again through this launcher.
  const ownGroup = process.platform !== "win32";
  const child = spawn(binary, process.argv.slice(2), { stdio: "inherit", detached: ownGroup });

  const forwards = (ownGroup ? ["SIGINT", "SIGTERM", "SIGHUP"] : ["SIGINT", "SIGTERM"]).map(
    (signal) => [
      signal,
      () => {
        try {
          if (ownGroup && child.pid) process.kill(-child.pid, signal);
          else child.kill(signal);
        } catch (error) {
          // The child won the race and is already gone.
          if (error.code !== "ESRCH") throw error;
        }
      },
    ],
  );
  for (const [signal, forward] of forwards) process.on(signal, forward);

  child.on("error", (error) => fail(`could not start ${binary}: ${error.message}`));
  child.on("exit", (code, signal) => {
    // A registered signal listener keeps this process alive, so the forwards
    // are removed once there is nothing left to forward to. The exit code is
    // the child's, and a signalled exit keeps the shell's 128 + signal form.
    for (const [name, forward] of forwards) process.off(name, forward);
    process.exitCode = signal ? 128 + (constants.signals[signal] ?? 0) : (code ?? 1);
  });
}

function readManifest(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    // No command prefix here: naming the command needs this manifest.
    process.stderr.write(`could not read ${file}: ${error.message}\n`);
    process.exit(1);
  }
}

function fail(message) {
  process.stderr.write(`${command}: ${message}\n`);
  process.exit(1);
}
