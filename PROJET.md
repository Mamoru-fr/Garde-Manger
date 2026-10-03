# PROJET — Garde-Manger

**Géré par** : Ada (4e étage) · **Décide et review** : Alexis
**Statut** : en chantier
**Repo** : https://github.com/Mamoru-fr/Garde-Manger · **Fiche Knowledge** : topic `garde-manger`

## 1. Identité

- **Objectif en une phrase** : PWA mobile-first pour inventoriér ses provisions domestiques — scan de codes-barres, péremptions, installations (placards/frigos) partageables en famille avec rôles.
- **Commanditaire** : initiative perso (Alexis).
- **Stack / langages** : Next.js 16 (App Router, React 19, Server Actions) · TypeScript strict · PostgreSQL/Neon via Drizzle ORM · Better-Auth · ZXing · OpenFoodFacts v3 · Resend · Zod · Vitest · PWA (`sw.js` + manifest).
- **Périmètre confidentiel** : aucun élément AGL — vraies données, noms clients, détails internes interdits.

## 2. Tâches (gestionnaire de chantier d'Ada)

| Tâche | Statut | Priorité | Notes |
|---|---|---|---|
| Init tour-de-main (AGENTS.md, PROJET.md, code-map, skill) | en cours | haute | branche `init-tour-de-main` → `developement` |
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
| 03/10/2026 | Question hooks pré-tranchée : le repo n'a pas de hooks locaux (aucun husky), et les commits via l'API GitHub ne déclenchent jamais les hooks client → la gate doit être server-side (CI) | première mesure du chantier pilote |

## 4. Fichiers et documents associés

| Fichier | Rôle | Dernière mise à jour |
|---|---|---|
| `PROJET.md` | source de vérité du chantier (ce fichier) | 03/10/2026 |
| `.vibe/plans/code-map.md` | la carte — cache du projet | 03/10/2026 |
| `.vibe/plans/plan-ameliorations-idees.md` | plan des 5 idées (branche `plan-ameliorations-idees`, commit 95987fd) — à mettre à jour avec les décisions 27/09 | 11/09/2026 |
| `.vibe/skills/tour-de-main/` | la méthode (v1.1) | 02/10/2026 |
| `AGENTS.md` | instructions portables (VibeCode, Copilot, Cursor…) | 03/10/2026 |

## 5. État d'avancement

Chantier pilote de tour-de-main. Init posée le 03/10 sur branche dédiée ; prochaine étape : **la spec à deux sur le modèle générique/poids, avant toute ligne de code**. Risque principal : la migration du directory (générique → variantes) — d'où plan obligatoire et test défaillant d'abord.

## 6. Audit de la solution (changelog daté)

| Date | Mise à jour | Par | Review Alexis |
|---|---|---|---|
| 03/10/2026 | Init du chantier : AGENTS.md, PROJET.md, code-map.md, skill tour-de-main v1.1 ; deux détections ajoutées à la liste noire (`next.config.js` dupliqué, `tsconfig.tsbuildinfo` commité) | Ada | en attente |

**Règle de merge** : aucun merge de code cœur sans review d'Alexis — la review est son moment de compréhension et de contrôle.
