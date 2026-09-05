import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: true, // Activer SSL pour Neon
  },
  // Ne pas inclure les tables internes dans les migrations
  tablesFilter: [
    "!better-auth_*",
    "!verification_tokens",
    "!password_reset_tokens",
  ],
});