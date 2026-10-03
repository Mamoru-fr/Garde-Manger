# Annexe — Checklists d'entrée et de sortie de session

## Entrée de session (re-entrée, pas ré-exploration)

1. Lire l'**audit daté du `PROJET.md`** — le changelog du chantier, pas le repo entier.
2. Si la tâche touche des zones inconnues : charger `.vibe/plans/code-map.md`.
3. **Grep avant lecture** : cibler les fichiers, jamais le dossier entier (exclusions gravées : `annexe-cartographie.md`).
4. Vérifier le statut git (branche, fichiers sales) — on ne code pas sur un chantier en pente.

## Sortie de session (aucun item ne se saute)

1. **`PROJET.md` à jour** : avancement, décisions, et l'**audit daté** — aucune session ne se clôt sans lui. Le fichier gagne en cas de divergence avec les issues.
2. **Carte mise à jour** si l'architecture, une couche, une convention ou la liste noire a bougé — dans la foulée, pas « plus tard ».
3. **Gates verts** : lint, typecheck, tests passent avant de rendre la main.
4. **Review notée** : ce qui doit survivre à la review bidirectionnelle (*« pourquoi ça tient debout ? »*) est consigné — dans le `PROJET.md` ou l'issue.
5. **Mémoire remontée à l'étage** : ce qui compte à la fin de la session (décisions, découvertes, dettes repérées) remonte au journal d'Ada — la prochaine session ne repart pas avec une valise et aucun souvenir.
6. **Doublons repérés** : signalés avec proposition de déduplication — mais jamais de refactor à l'aveugle sans accord.
