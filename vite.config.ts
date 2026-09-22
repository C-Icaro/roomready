import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "public-build-provenance",
      generateBundle() {
        const commit = execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim();
        const dirty =
          execFileSync("git", ["status", "--porcelain"], {
            encoding: "utf8",
          }).trim().length > 0;
        this.emitFile({
          type: "asset",
          fileName: "build-info.json",
          source: JSON.stringify(
            {
              app: "RoomReady",
              commit,
              dirty,
              builtAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        });
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes("node_modules/three/") ? "three" : undefined,
      },
    },
  },
});
