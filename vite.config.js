import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFile, mkdir } from "node:fs/promises";

function sitesWorker() {
  return {
    name: "sites-worker-output",
    apply: "build",
    async closeBundle() {
      await mkdir("dist/server", { recursive: true });
      await copyFile("worker/index.js", "dist/server/index.js");
    }
  };
}

export default defineConfig({
  plugins: [react(), sitesWorker()]
});
