import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Décision tech lead (03/10/2026) : apostrophes UTF-8 directes dans le JSX,
  // zéro entité HTML. On coupe la règle Next qui exige &apos;.
  {
    rules: {
      "react/no-unescaped-entities": "off",
      // Bloc 2:1 : les `any` explicites (~60 sites, dette ancienne) passent en
      // warning — élimination planifiée au bloc 8. Réactivable en supprimant
      // cette ligne (retour à "error").
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts de maintenance Node hors app (require() légitime) :
    "scripts/*.js",
  ]),
]);

export default eslintConfig;
