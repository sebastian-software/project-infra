import { defineConfig } from "tsdown";

// Distributable package bundle: ESM output with type declarations. The
// consumer-artifact checks in the CI reference verify the packed result.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
});
