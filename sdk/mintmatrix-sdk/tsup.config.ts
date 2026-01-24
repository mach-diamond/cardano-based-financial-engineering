import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "cdo/index": "src/cdo/index.ts",
    "loan/index": "src/loan/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false, // Keep readable for debugging
  external: ["@lucid-evolution/lucid"],
});
