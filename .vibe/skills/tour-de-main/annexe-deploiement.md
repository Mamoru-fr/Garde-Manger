# Annexe — Déployer la méthode (VibeCode, Copilot, Claude Code)

## L'idée directrice : une source, zéro traduction

**AGENTS.md est le standard gagnant** : un fichier à la racine du repo, lu nativement par GitHub Copilot, OpenAI Codex, Cursor, Gemini CLI, Windsurf, Zed… et **VibeCode** (vérifié le 30/09/2026 sur la doc et le repo Mistral).

### VibeCode (extension VS Code / CLI Mistral Vibe)

- Lit **AGENTS.md nativement** : fichier projet chargé du répertoire courant jusqu'au *trust root* ; le plus proche dans l'arborescence gagne ; instructions AGENTS.md **override le prompt système** par défaut. Fichier utilisateur possible : `~/.vibe/AGENTS.md`.
- Suit la **spec Agent Skills** : skills du projet dans `./.vibe/skills/` ou `./.agents/skills/` (dossier de confiance requis), skills utilisateur dans `~/.vibe/skills/`. Un SKILL.md écrit pour la spec tourne tel quel.
- L'extension VS Code embarque l'agent Vibe et partage la **même couche de configuration** que le CLI (`~/.vibe/` + `.vibe/` du projet) : agents, skills, prompts, hooks.
- Donc : ce skill (`tour-de-main`), déposé dans `~/.vibe/skills/` ou `.vibe/skills/` du repo, fonctionne nativement.

### GitHub Copilot

Lit AGENTS.md nativement (support ajouté en août 2025). Le portage Copilot prévu au départ devient un simple fichier racine.

### Claude Code

Ne lit pas AGENTS.md nativement — poser un `CLAUDE.md` d'une ligne qui l'importe.

## Modèle d'AGENTS.md (minimal, par repo de l'atelier)

Ne contenir **que ce que le code ne dit pas déjà** — les sections « présentation du repo » sont mesurées inutiles (coûtent à chaque invocation) :

```markdown
# AGENTS.md — <projet>

## Commandes
- dev / build / test / lint : <les commandes réelles>

## Invariants
- Architecture en couches : voir `.vibe/plans/code-map.md` (ne pas recopier ici).
- Validation à l'entrée de chaque action/route ; un composant n'appelle jamais un service directement.
- Conventions : <commits, nommage, i18n>

## Liste noire (ne jamais copier, ne jamais toucher sans décision)
- <code mort, code résiduel>

## Ne jamais lire ni attacher
lockfiles, node_modules/, dist/, générés, snapshots, test-results/, binaires, .vscode/

## Méthode de travail
Ce repo suit la méthode tour-de-main : plan avant modif si 2 signaux,
test défaillant d'abord sur le cœur, PROJET.md mis à jour à chaque session.
```

## Mesure mensuelle des tokens gâchés

Une fois par mois (rituel d'atelier) : noter ce qui a coûté des tokens pour rien — relectures, re-codages, contexte mort — et corriger le skill en conséquence. **Le skill a son propre changelog** (`CHANGELOG.md`), versionné comme du code.

## Chiffres de référence (benchmarks communautaires, à prendre comme ordres de grandeur)

- Élaguer un fichier d'instructions de 3 847 → 312 tokens : **-91,9 % de contexte sans perte de qualité**.
- Liste d'exclusions seule : **-85,5 % de contexte**.
- Les deux gestes les plus rentables : **élaguer et exclure**.

## Questions ouvertes

- Les hooks pre-commit s'appliquent-ils quand la maison commite via le connecteur GitHub (API) ? À tester au premier chantier.
- Réplication rapide du -91,9 % sur un vrai repo de l'atelier (mesurer avant/après sur une session réelle) — candidat : Garde-Manger.
