import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        main: "index.html", lab: "lab/index.html", tideglass: "tideglass/index.html", comparison: "compare/index.html", trials: "trials/index.html",
        coil: "games/coil/index.html", coilPlain: "games/coil/plain/index.html",
        starfall: "games/starfall/index.html", starfallPlain: "games/starfall/plain/index.html",
        thornwatch: "games/thornwatch/index.html", thornwatchPlain: "games/thornwatch/plain/index.html",
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4179,
  },
  preview: {
    host: "127.0.0.1",
    port: 4179,
  },
});
