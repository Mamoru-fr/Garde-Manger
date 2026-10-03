# PROJET — Garde-Manger

**Géré par** : Ada (4e étage) · **Décide et review** : Alexis
**Statut** : en chantier
**Repo** : https://github.com/Mamoru-fr/Garde-Manger · **Fiche Knowledge** : topic `garde-manger`

## 1. Identité

- **Objectif en une phrase** : PWA mobile-first pour inventorier ses provisions domestiques — scan de codes-barres, péremptions, installations (placards/frigos) partageables en famille avec rôles.
- **Commanditaire** : initiative perso (Alexis).
- **Stack / langages** : Next.js 16 (App Router, React 19, Server Actions) · TypeScript strict · PostgreSQL/Neon via Drizzle ORM · Better-Auth · ZXing · OpenFoodFacts v3 · Resend · Zod · Vitest · PWA (`sw.js` + manifest).
- **Périmètre confidentiel** : aucun élément AGL — vraies données, noms clients, détails internes interdits.

## 2. Tâches (gestionnaire de chantier d'Ada)

| Tâche | Statut | Priorité | Notes |
|---|---|---|---|
| Init tour-de-main (AGENTS.md, PROJET.md, code-map, skill) | fait | haute | PR #11 mergée le 03/10 + correctifs review |
| Recherche manuelle d'un produit par nom (annuaire + OpenFoodFacts) | en review | haute | branche `feat-recherche-manuelle-nom` → `developement` ; GO du 03/10 sans attendre la fondation générique — adaptation post-migration à prévoir (une ligne dans la présentation du code) |
| Alignement auth sur la voie documentée Better-Auth (handler `/api/auth/[...all]` + `authClient`, chaîne custom débranchée) | en review | haute | même branche `feat-recherche-manuelle-nom` (règle Alexis 03/10 : une branche par chantier en cours, PR uniquement sur sa demande) ; PR #14 laissée en attente à sa demande ; les 3 fichiers de la chaîne custom restent en place (permission de suppression refusée) — plus aucun import ne les référence |
| Spec à deux : modèle générique/poids | à faire | haute | avant tout code — c'est la fondation |
| Implémentation générique/poids (directory générique → variantes, migration) | à faire | haute | ordre 1 du planning d'octobre |
| Cave à vins — option B (table `wine_details` portée par l'instance) | à faire | normale | ordre 2 |
| Bouton « s'opposer au nom » (correction + traçabilité) + liaison QR ↔ objet existant | à faire | normale | ordre 3 |
| Hygiène code : `test/translations.test.ts`, `content/database_types/`, `next.config.js`, README, `tsconfig.tsbuildinfo` | à faire | basse | après les features |
| CI GitHub Actions (lint + typecheck + tests) — la gate réelle côté serveur | à faire | normale | voir décision 03/10 |
| Mesure mensuelle des tokens gâchés (benchmark élagage −91,9 %) | à faire | basse | rituel d'atelier |

## 3. Décisions

| Date | Décision | Pourquoi |
|---|---|---|
| 27/09/2026 | Modèle générique à deux niveaux : fiches sans marque en vue principale, quantité en unités sur l'instance, variantes par marque au détail ; recherche/filtres suivent | débloque le MVP sans figer les marques |
| 27/09/2026 | Cave à vins option B : le vin = fiche produit, millésime et détails (appellation, cépage, apogée…) sur l'instance via `wine_details` | pas de sur-spécialisation du directory |
| 27/09/2026 | Toute implémentation part d'un plan du processus actuel — ne pas changer la structure de fond, préserver l'ACS et l'arborescence | le chantier révèle ce que le code dit déjà, il ne divorce pas |
| 27/09/2026 | Planning d'octobre : 1) générique/poids, 2) cave à vins, 3) corrections de nom + liaison QR, puis hygiène | la structure générique est l'invariant des autres chantiers |
| 03/10/2026 | Go sur le planning d'octobre, après relecture à deux | session du 03/10 |
| 03/10/2026 | Init posée sur branche dédiée `init-tour-de-main` → `developement` | convention du repo : pas de commit direct sur une branche de long cours |
| 03/10/2026 | Question hooks tranchée : aucun outil de hooks détecté (husky, lefthook, lint-staged, simple-git-hooks : zéro match), et les commits via l'API GitHub ne déclenchent jamais les hooks client → la gate doit être server-side (CI). *Reformulé après review : « aucun husky » ne prouvait pas « pas de hooks » — un mot n'est pas une preuve* | première mesure du chantier pilote |
| 03/10/2026 | Recherche manuelle par nom : annuaire local d'abord (ILIKE sur `name` + `brand`), repli OpenFoodFacts si 0 résultat local ; sélection d'un résultat OFF = résolution/création de la fiche locale via le flux code-barres existant | construit sur la plomberie existante, zéro migration |
| 03/10/2026 | Correction du branchement `objectDirectoryId` : la page d'ajout envoyait le code-barres brut comme ID de fiche, alors que le service cherche `eq(objectDirectory.id, …)` — la fiche résolue par la recherche est maintenant envoyée | le flux d'ajout manuel renvoie un vrai ID d'annuaire |
| 03/10/2026 | Repo passé en public sous licence **All Rights Reserved** (`LICENSE.txt`) : lecture et fork autorisés (CGU GitHub), toute copie/modification/redistribution interdite sans accord écrit | accès permanent d'Ada au code, plus d'upload manuel ; pas d'ouverture open-source |
| 03/10/2026 | Auth : fin de la gestion maison — la chaîne custom (`AuthActions` → `AuthController` → `AuthService`) n'est plus utilisée (plus aucun import après l'alignement) ; la connexion/inscription/reset passent par le client officiel (`authClient`, `better-auth/react`) + le handler monté sur `/api/auth/[...all]` (`toNextJsHandler`), la lecture serveur par `auth.api.getSession` direct. La suppression physique des 3 fichiers a été refusée par la permission au moment du push — ils restent en place, à retirer à la main ou lors d'un prochain feu vert | la doc Next.js de Better-Auth exclut signIn/signUp en Server Action (les RSC ne posent pas les cookies) — c'était la cause de la boucle de connexion ; le cache de module de `getCurrentSession` (valeur `null` figée pour tout le process) est remplacé par le `cookieCache` natif ; décision Alexis : « laisser le travail à better-auth » |
| 03/10/2026 | Règle de travail : toutes les modifications d'un chantier en cours sur la même branche (ici `feat-recherche-manuelle-nom`) ; PR ouverte uniquement sur demande explicite d'Alexis | il veut suivre les évolutions et inspecter le code commit par commit |

## 4. Fichiers et documents associés

| Fichier | Rôle | Dernière mise à jour |
|---|---|---|
| `PROJET.md` | source de vérité du chantier (ce fichier) | 03/10/2026 |
| `.vibe/plans/code-map.md` | la carte — cache du projet | 03/10/2026 |
| `.vibe/plans/plan-ameliorations-idees.md` | plan des 5 idées (branche `plan-ameliorations-idees`, commit 95987fd) — à mettre à jour avec les décisions 27/09 | 11/09/2026 |
| `.vibe/skills/tour-de-main/` | la méthode (v1.1) | 02/10/2026 |
| `AGENTS.md` | instructions portables (VibeCode, Copilot, Cursor…) | 03/10/2026 |

## 5. État d'avancement

Chantier pilote de tour-de-main. Recherche manuelle par nom posée le 03/10 sur branche dédiée (en review Alexis). Le 03/10 au soir : alignement complet de l'auth sur la voie documentée Better-Auth (bug de la boucle /connexion réglé structurellement). Prochaine étape : **la spec à deux sur le modèle générique/poids, avant toute ligne de code**. Risque principal : la migration du directory (générique → variantes) — d'où plan obligatoire et test défaillant d'abord.

## 6. Audit de la solution (changelog daté)

| Date | Mise à jour | Par | Review Alexis |
|---|---|---|---|
| 03/10/2026 | Init du chantier : AGENTS.md, PROJET.md, code-map.md, skill tour-de-main v1.1 ; deux détections ajoutées à la liste noire (`next.config.js` dupliqué, `tsconfig.tsbuildinfo` commité) | Ada | en attente |
| 03/10/2026 | Corrections de texte après review Alexis : « inventorier » (faute propagée depuis la fiche d'origine, copiée sans relecture), formulation des hooks (« aucun husky » ne prouvait pas « pas de hooks » → « aucun outil de hooks détecté », revérifié : zéro match), « à gitigner » → « à ajouter au .gitignore » | Ada | en attente |
| 03/10/2026 | Recherche manuelle par nom : `SearchProductsByNameSchema` (Zod), `DirectoryService.searchByNameLocal` (ILIKE nom + marque), action `searchProductsByName` (session + Zod + locale d'abord + repli OFF), bascule « Par code-barres » / « Par nom » dans `AddObjectClient` avec liste de résultats cliquable et résolution de fiche (corrige le branchement `objectDirectoryId`), styles toggle/résultats (palette café), test TDD `test/searchProductsByName.test.ts` + `vitest.config.ts` (alias `@/`, exclusion du test cassé historique). ⚠️ Gates lint/typecheck/vitest non exécutés dans l'environnement Ada (installation de paquets interdite) — à faire tourner avant merge | Ada | en attente |
| 03/10/2026 | Alignement auth Better-Auth : handler officiel `app/api/auth/[...all]/route.ts` (`toNextJsHandler`), `lib/auth/auth-client.ts` (`createAuthClient` de `better-auth/react`), formulaires connexion/inscription/oubli/vérification passés sur `authClient` (validation Zod conservée côté client), **nouvelle page `/mot-de-passe/reset`** (le lien de l'email n'aboutissait nulle part ; `redirectTo` branché), déconnexion via `authClient.signOut` (page + bouton header), chaîne `AuthActions`/`AuthController`/`AuthService` débranchée (plus aucun import — suppression physique refusée par la permission, fichiers laissés en place), `getCurrentSession` sans cache de module (bug racine de la boucle de connexion) + `cookieCache` natif (5 min) dans la config, messages d'erreur FR centralisés `lib/utils/auth-errors.ts` + test TDD `test/auth-errors.test.ts`, retrait des options de config non supportées (`framework`, `signInCallbackUrl`, `signUpCallbackUrl`, `defaultRole`). ⚠️ Même limitation de gates côté Ada — à faire tourner avant merge | Ada | en attente |

**Règle de merge** : aucun merge de code cœur sans review d'Alexis — la review est son moment de compréhension et de contrôle.
