# Carte Garde-Manger — cache du projet

*Référencée, jamais recopiée. Un changement d'architecture, de couche, de convention ou de liste noire met à jour cette carte dans la foulée — une carte périmée est un cache qui ment.*

## 1. Stack

- **Framework** : Next.js 16, App Router (React 19, Server Components + Server Actions ; Client Components pour l'interactivité)
- **Langage** : TypeScript strict
- **DB** : PostgreSQL serverless (Neon) via Drizzle ORM — migrations drizzle-kit (`drizzle.config.ts`)
- **Auth** : Better-Auth (email/mot de passe, vérification, reset ; session prolongée 1 an pour les usages PWA)
- **Scan** : ZXing (`@zxing/browser` + `@zxing/library`) côté client
- **Données produits** : OpenFoodFacts **v3** (`https://api.openfoodfacts.org/api/v3/product/...`)
- **Emails** : Resend · **Validation** : Zod (`lib/validations/`) · **Tests** : Vitest
- **PWA** : `public/sw.js` (précache + stratégies Network-First/Cache-First), `manifest.webmanifest`, page `/offline`
- **Middleware** : `proxy.ts` (cookies de session, CSP, Permissions-Policy caméra pour le scanner, CORS)
- **Gestion** : pnpm, ESLint

## 2. Architecture en couches (ACS — Action → Controller → Service)

| Couche | Dossier | Rôle |
|---|---|---|
| Routes/pages | `app/` | Server Components (auth) + Client Components (interactivité) |
| Actions (entrée) | `lib/actions/` | Server Actions (`AuthActions`, `ObjectActions`, `StockActions`, `DirectoryActions`, `InstallationActions`, `CategoryActions`, `ShopActions`, `signActions`) : valident (Zod), vérifient l'accès, **délèguent** — jamais de logique métier inline |
| Controllers (orchestration) | `lib/controllers/` | `AuthController`, `InstallationController` (dont `checkAccess`), `ObjectController` |
| Services (métier + DB) | `lib/services/` | `AuthService`, `DirectoryService` (annuaire + OpenFoodFacts v3), `InstallationService`, `ObjectService` |
| Schéma | `lib/db/schema.ts` | Drizzle complet : enums, index, relations |
| UI | `components/` | stock, objects, installations, scanner, modales (CSS modules, thème « café ») |
| Types | `lib/types/` | types partagés |
| Validations | `lib/validations/` | schémas Zod |

**Interdits** : court-circuiter les couches (composant → service direct, logique métier dans une action, SQL inline). Toute évolution de schéma passe par drizzle-kit (`db:generate` → `db:migrate`). Prix stockés en centimes (entiers).

**Frontière server/client** : scan et modales côté client ; toute écriture traverse une Server Action.

## 3. Flux de référence — « scanner et ranger un produit »

1. Scanner (`components/`, Client) : ZXing lit le code (EAN13/EAN8/UPC/QR…)
2. Lookup annuaire local → `DirectoryService` ; si inconnu → OpenFoodFacts v3 (produits importés marqués `isReadOnly`)
3. L'utilisateur ajuste nom/marque/catégorie si non verrouillé (`ScanResultModal` / `ScanDetailsForm`)
4. Server Action (`ObjectActions`, `StockActions`…) : validation Zod + `InstallationController.checkAccess`
5. Service (`ObjectService`) : fiche annuaire (`object_directory` / `barcode_directory`) + instance (`object_installation` : quantité, emplacement, péremption, prix, lot, notes)
6. Historique dans `object_history` ; rafraîchissement ciblé côté client (cache buster, pattern optimiste)

## 4. Modèle de données (concepts clés)

- **Installations** partagées via `user_installations` avec rôles **owner / editor / viewer**
- **Annuaire centralisé** (`object_directory` + `barcode_directory`) : produits définis une fois globalement, instanciés par installation
- **Instances** (`object_installation`) : quantité, emplacement, date d'achat, date de péremption, magasin, prix (centimes), numéro de lot, notes
- **Historique** (`object_history`) : traçabilité des modifications de quantité
- Référentiels : catégories, unités, types d'objets hiérarchiques, magasins

## 5. Invariants et conventions

- **Commits** : conventional commits FR (`feat(stock):`, `refactor(styles):`, `chore(api):`…), messages détaillés — la trace doit dire qui on était
- **Branches** : travail sur branches dédiées → PR vers `developement` (sic, orthographe historique du repo) → `developement` fusionne dans `main` via PR. Jamais de push direct sur `main`.
- **Gates** : lint + typecheck + tests avant tout commit. ⚠️ Aucun outil de hooks détecté dans le repo (husky, lefthook, lint-staged, simple-git-hooks : zéro match) ; et de toute façon les commits via l'API GitHub ne déclenchent jamais les hooks client → la gate réelle doit être server-side (CI GitHub Actions, à poser).
- **Nommage** : code en anglais, commits et commentaires en français

## 6. Liste noire (ne jamais copier, ne jamais toucher sans décision explicite)

- `content/database_types/` — types résiduels d'un autre projet (ride, invoice, shift…)
- `test/translations.test.ts` — test cassé (référence des locales inexistants)
- `next.config.js` — coexiste avec `next.config.ts` (Next 16 lit le `.ts`) ; probablement mort, à trancher explicitement
- `tsconfig.tsbuildinfo` — artefact de build commité, à ajouter au `.gitignore` puis à retirer du suivi
- `README.md` — template générique create-next-app ; la vraie doc vit dans `.vibe/plans/`

## 7. Vraie doc

- `PROJET.md` (racine) — source de vérité du chantier : tâches, décisions, audit daté
- `.vibe/plans/` — plans d'analyse et suivi (dont `plan-ameliorations-idees.md` sur sa branche)
- `.vibe/skills/tour-de-main/` — la méthode de chantier

## 8. À ne jamais lire ni attacher

lockfiles (`pnpm-lock.yaml`), `node_modules/`, `dist/`, `.next/`, fichiers générés (`tsconfig.tsbuildinfo`), snapshots, `test-results/`, `coverage/`, binaires, `.vscode/`
