// ============================================
// Config Vitest — alias "@/"" du tsconfig pour les tests
// ============================================

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
