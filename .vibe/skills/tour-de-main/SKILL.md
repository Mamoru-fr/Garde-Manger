---
name: |
  tour-de-main
description: |
  Méthode de chantier Ada+Alexis : à charger avant toute création ou modification de code (Next.js, React, Node, front Power Platform). Anti-doublons, cartographie comme cache, plan obligatoire avant modif, TDD-first, gates pre-commit, tech lead tranche sur toute contradiction, économie de tokens maximale. Remplace web-code-map. Portable VibeCode et Copilot.
---

# Tour de main — coder à notre manière, vite, bien, sans gaspiller

**L'invariant :** ne jamais créer ce qui existe, ne jamais modifier sans plan, ne jamais payer deux fois le même token.

Ce skill remplace `web-code-map` (philosophie anti-doublon, cartographie, couches — tout est repris ici). Il est versionné comme du code : chaque changement passe en review Alexis et se consigne dans `CHANGELOG.md`.

## Les 8 règles (toujours vraies)

1. **Réutiliser avant créer.** Avant d'écrire une brique, la chercher (grep, code search, suivi de couche). Conclure en 3 cas : **RÉUTILISATION** (citer où) · **EXTENSION** (existant à modifier — lister les impacts en cascade) · **CRÉATION** (rien trouvé — le dire explicitement avant d'écrire). Un doublon détecté = on réutilise, on n'écrit pas.
2. **La carte est un cache.** La cartographie vit dans `.vibe/plans/code-map.md` du repo — **référencée, jamais recopiée** dans les instructions. Ne jamais relire ce que la carte documente ; grep avant lecture complète ; fichiers ciblés, jamais le dossier entier. *Économiser sur la relecture du statique, jamais sur la compréhension.*
3. **Plan avant modif.** Deux signaux d'escalade détectés → plan à 4 blocs, approbation avant d'écrire. Pas de plan, pas de code. → `annexe-plan.md`
4. **Question à chaque doute.** Jamais de supposition hâtive : on demande. Une question coûte toujours moins cher qu'un re-codage.
5. **TDD-first sur le cœur.** Le test défaillant écrit avant d'ouvrir le code à l'agent. La spec se clarifie dans le test, l'agent ne peut pas faire semblant d'avoir fini, on ne paie pas deux fois le même développement.
6. **Gate pre-commit.** lint + typecheck + tests bloquent le commit. Le gate mécanique ne s'oublie jamais, contrairement au rappel. L'agent corrige seul ses bêtises mécaniques avant d'atteindre la review humaine.
7. **Contexte propre.** Ne jamais lire ni attacher : lockfiles, `node_modules`, builds, fichiers générés, snapshots, `test-results/`, binaires. La liste est gravée dans `annexe-cartographie.md` — elle vaut ~-85 % de contexte à elle seule.
8. **Le tech lead tranche.** L'agent a plus de documentation ; Alexis a plus d'expérience du code actuel et du projet. Toute découverte qui contredit sa parole, ses directives ou l'architecture en place **remonte vers lui** avec options comparées (sa voie vs la nouvelle : gains, risques, possibilités). La décision lui revient, le débat est la méthode. Un changement à gros impact sans son approbation directe est une faute de chantier, pas une initiative.

## Architecture en couches (non négociable)

- **L'architecture choisie est un invariant** : elle ne change que sur GO explicite du tech lead. Une directive sur un outil (lib, framework, plugin) est une directive d'**infrastructure**, jamais un mandat d'architecture — **adopter un outil ≠ adopter l'architecture de l'outil**. La lib s'absorbe dans la couche service ; elle ne remplace pas les couches.
- Toute fonctionnalité traverse les couches définies dans la carte. **Interdit de court-circuiter** : pas de logique métier ni d'accès DB *inline* dans un composant, une page, une Server Action ou une route API.
- Une Server Action / route API est une **couche d'orchestration** : elle valide ses entrées (Zod ou validateur du projet), puis **délègue** au service qui porte la logique.
- Un composant n'appelle jamais un service directement : il passe par l'entrée officielle (Server Action, route API, hook dédié).
- Pas de nouvelle entité de données sans vérification du schéma ORM et de la doc ; toute évolution de schéma passe par l'outil de migration du projet.
- Conventions du projet (commits, branches, nommage, i18n) telles que définies dans la carte — ne pas importer de convention étrangère.
- Ne jamais copier depuis la **liste noire** de la carte (code mort, code résiduel) : à signaler, à ne pas toucher sans décision explicite.

## La boucle d'un chantier

**Entrer** — re-entrée par l'audit du `PROJET.md` (pas par ré-exploration du repo). Charger la carte seulement si la tâche touche des zones inconnues. Grep avant toute lecture complète.

**Travailler** — nommer le besoin en une phrase fonctionnelle → chercher l'existant par mot-clé → suivre la couche → **diagnostic avant code si l'approche n'est pas triviale** (questions bloquantes, logs complets — format dans `annexe-plan.md`) → **reformuler en une phrase toute directive à portée architecturale, et la faire valider avant d'exécuter** → plan si signaux → code + tests, **diff minimal** (l'ampleur d'un diff est un signal, pas un exploit — `annexe-plan.md`).

**Sortir** — checklist de fin de session dans `annexe-session.md` : `PROJET.md` à jour avec audit **daté** (aucune session ne se clôt sans), carte mise à jour si l'architecture a bougé, review qui interroge (*« pourquoi ça tient debout ? »*), mémoire qui remonte à l'étage.

## Où vivent les fichiers (layout standard d'un repo)

| Fichier | Rôle |
|---|---|
| `AGENTS.md` (racine) | Instructions portables — lues nativement par VibeCode, Copilot, Cursor, Codex |
| `PROJET.md` (racine) | Source de vérité du chantier : tâches, décisions, audit daté |
| `.vibe/plans/code-map.md` | La carte — cache du projet, jamais recopiée |
| `.vibe/skills/` ou `.agents/skills/` | Skills du projet (spec Agent Skills) |

## Annexes (chargées à la demande, pas d'office)

- `annexe-cartographie.md` — construire et tenir la carte ; liste d'exclusions gravée
- `annexe-plan.md` — les 5 signaux d'escalade et le format du plan
- `annexe-session.md` — checklists d'entrée et de sortie de session
- `annexe-deploiement.md` — déployer la méthode dans VibeCode / Copilot / Claude Code ; mesure mensuelle des tokens gâchés
