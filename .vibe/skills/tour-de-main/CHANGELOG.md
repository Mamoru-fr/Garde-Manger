# Changelog — tour-de-main

## v1.1 — 02/10/2026

- **Premier retour du terrain intégré** : mesure réelle d'une session Copilot pro (analyse d'Alexis) — explorations non validées ~25 % + pivots sans contexte ~15 % des tokens, pour zéro gain de justesse ; économie potentielle mesurée : 30-40 %.
- **Phase 0 — Diagnostic (0 code)** ajoutée à `annexe-plan.md` : questions bloquantes avant d'écrire (contrainte réelle, schéma exact attendu, logs complets), déclaration explicite des « essais » techniques — jamais de code spéculatif déguisé en test.
- **Discipline de pivot** : changer d'approche uniquement sur erreur réelle confirmée + nouvelles données du système + plus aucune question à poser.
- **Hygiène des gestes** : regrouper les modifications liées en une passe ; vérifier après changement structurel et aux gates finales, pas après chaque micro-changement.
- Confirmé par la mesure (aucun changement nécessaire) : grep-first (règle 2) et question-à-chaque-doute (règle 4) — les 2ᵉ et 4ᵉ postes de gaspillage relevés correspondent mot pour mot aux règles déjà gravées.

## v1.0 — 30/09/2026

- **Création** : fusion de la méthode d'atelier (atelier-ada) et de la recherche « Agents IA dans les IDE » (2 vagues, ~40 sources, rapport dans le canvas `recherche-agents-ia-ide-tour-de-main`).
- **Remplace `web-code-map`** : philosophie anti-doublon, cartographie, obligations de couches intégralement reprises puis étendues.
- **Les 7 règles** : réutiliser avant créer · carte = cache · plan avant modif · question à chaque doute · TDD-first · gate pre-commit · contexte propre.
- **Architecture progressive** (divulgation) : SKILL.md corps mince + 4 annexes chargées à la demande (cartographie, plan, session, déploiement).
- **Portabilité vérifiée** : VibeCode lit AGENTS.md nativement et suit la spec Agent Skills ; Copilot lit AGENTS.md ; Claude Code via CLAUDE.md.
- Amendements d'Alexis intégrés : remplacement de web-code-map (n°1), économie de tokens en tête (n°2), plan obligatoire + question à chaque doute (n°3).

*Review d'Alexis en attente — ce changelog se met à jour à chaque review, comme un diff.*
