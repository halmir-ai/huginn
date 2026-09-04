import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist/library",
    emptyOutDir: true,
    lib: {
      entry: {
        core: resolve(import.meta.dirname, "src/huginn/index.ts"),
        webmcp: resolve(import.meta.dirname, "src/webmcp/index.ts"),
        "game-runtime": resolve(import.meta.dirname, "src/game-runtime/index.ts"),
        debugger: resolve(import.meta.dirname, "src/debugger/index.ts"),
      },
      formats: ["es"],
      cssFileName: "debugger",
    },
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
      },
    },
  },
});
