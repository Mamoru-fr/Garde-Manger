# Annexe — La cartographie (code-map.md)

## Quand la construire

Si `.vibe/plans/code-map.md` n'existe pas : la construire **avant de coder**. Si elle existe : la **charger d'abord** et s'y référer — ne jamais re-découvrir ce qui est déjà documenté.

**Périmètre d'économie** : sur un gros repo, cartographier d'abord le périmètre de la tâche (la feature visée + ses couches), élargir seulement si nécessaire. Pas de cartographie exhaustive au prix de la tâche.

## Contenu de la carte

1. **Stack** : framework (Next.js App/Pages Router, React seul, autre), langage, ORM, validation, auth, tests, styling.
2. **Architecture en couches** : dossiers et rôles — routes/pages, Server Actions ou routes API, services/logique métier, accès DB, composants UI, schéma de données, tests. En App Router : noter la frontière server/client.
3. **Flux de données de référence** : un exemple complet (« ajouter X ») du point d'entrée au stockage.
4. **Invariants** : conventions de commits, branches, nommage, i18n — et la **liste noire** (code mort, code résiduel, à ne jamais copier ni toucher sans décision).
5. **Vraie doc** : où vit la documentation réelle (souvent pas le README).

## Fraîcheur (document vivant)

Toute modification qui change l'architecture, une couche, une convention ou la liste noire met à jour la carte **dans la foulée**. Une carte périmée est pire qu'une carte absente : c'est un cache qui ment.

## Liste d'exclusions gravée (jamais dans le contexte)

Lockfiles (`*.lock`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) · `node_modules/` · `dist/`, `build/`, `.next/`, `out/` · fichiers générés · snapshots · `test-results/`, `coverage/` · binaires et images · `.vscode/` (config perso, pas du projet).

Vaut ~-85 % de contexte à elle seule. Ne jamais lire ni attacher ces fichiers ; grep ne s'y arrête pas non plus.
