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
    // Le test cassé historique reste exclu (liste noire de la carte .vibe/plans/code-map.md)
    exclude: ["**/node_modules/**", "**/dist/**", "test/translations.test.ts"],
  },
});
