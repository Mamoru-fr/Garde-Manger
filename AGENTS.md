# AGENTS.md — Garde-Manger

## Commandes
- dev : `pnpm dev` · build : `pnpm build` · lint : `pnpm lint` · tests : `pnpm test` (Vitest)
- typecheck : `npx tsc --noEmit` (à standardiser en script — voir PROJET.md)
- DB (drizzle-kit) : `pnpm db:generate` / `db:migrate` / `db:studio`

## Invariants
- Architecture en couches ACS (Action → Controller → Service) : voir `.vibe/plans/code-map.md` — ne pas recopier ici.
- Interdit de court-circuiter : validation Zod à l'entrée de chaque Server Action, un composant n'appelle jamais un service directement, jamais de SQL inline.
- Toute évolution de schéma passe par drizzle-kit (db:generate → db:migrate).
- Conventions : conventional commits FR (`feat(stock):`…) · travail sur branches dédiées → PR vers `developement` · jamais de push direct sur `main` · review d'Alexis obligatoire avant merge.

## Liste noire (ne jamais copier, ne jamais toucher sans décision)
- `content/database_types/` (types résiduels) · `test/translations.test.ts` (test cassé) · `next.config.js` (doublon du `.ts`) · `README.md` (générique create-next-app) · `tsconfig.tsbuildinfo` (artefact commité)

## Ne jamais lire ni attacher
lockfiles, `node_modules/`, `dist/`, `.next/`, fichiers générés, snapshots, `test-results/`, binaires, `.vscode/`

## Méthode de travail
Ce repo suit **tour-de-main** (`.vibe/skills/tour-de-main/`) : réutiliser avant créer · la carte est un cache · plan à 4 blocs avant modif si 2 signaux · une question par doute · test défaillant d'abord sur le cœur · gate lint+typecheck+tests · `PROJET.md` mis à jour à chaque session (source de vérité du chantier).
