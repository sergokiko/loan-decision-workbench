import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    include: ["test/public/**/*.test.tsx"],
    setupFiles: ["./test/setup.ts"],
    environment: "jsdom",
    restoreMocks: true,
    clearMocks: true,
  },
});
