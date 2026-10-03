# Annexe — Le plan avant modification

## Les 5 signaux d'escalade

Le plan se déclenche quand **2 signaux au moins** sont détectés :

1. **Rayon d'impact large** — la modif touche plusieurs couches, plusieurs fichiers, ou un fichier partagé.
2. **Code inconnu** — la zone touchée n'est pas encore cartographiée, ou on n'a jamais travaillé dedans.
3. **Demande ambiguë** — l'intention peut se lire de deux façons, les cas limites ne sont pas tranchés.
4. **Travail difficilement réversible** — migration de schéma, refactoring structurel, suppression, contrat API public.
5. **Risque réel d'approche** — plusieurs façons de faire se présentent, avec des compromis différents.

**0 ou 1 signal** : annoncer l'intention en une phrase, puis coder — c'est l'économie de tokens. Pas de cérémonie pour un changement trivial.

## Mode plan = lecture seule

Pendant le plan : analyser, poser les questions de clarification, **ne pas écrire de code**. Le plan est un document éditable — Alexis le corrige, puis approuve.

## Format du plan (4 blocs)

```markdown
## Plan — <tâche>
1. **Intention** : ce qu'on veut obtenir, en 1-2 phrases (et ce qu'on ne veut PAS).
2. **Fichiers touchés** : liste des fichiers à créer/modifier/supprimer.
3. **Impact par fichier** : ce qui change dans chacun, et les impacts en cascade
   (autres fichiers/couches affectés).
4. **Questions** : tout ce qui fait doute → une question par doute, jamais de supposition.
```

Après approbation : coder le plan, dans l'ordre, test défaillant d'abord sur le cœur (règle 5).

## Phase 0 — Diagnostic (0 code)

*(Première version v1.1, gravée après une mesure réelle : les explorations non validées + les pivots sans contexte = ~40 % des tokens d'une session, pour zéro gain de justesse.)*

Avant tout plan sur une approche non triviale : **diagnostiquer, ne pas coder d'essai spéculatif**. Un « essai » technique se déclare comme tel — jamais de code produit spéculatif déguisé en test.

1. **Grep d'abord** pour les patterns existants — ne jamais relire un fichier complet pour retrouver un appel qui se grep.
2. **Lire les logs et erreurs complets** — pas un extrait qui arrange.
3. **Poser les questions bloquantes** (1-2 messages max, avant d'écrire) :
   - Quelle est la vraie contrainte du système ?
   - Qu'attend / retourne *réellement* le système visé (schéma exact du payload, accès réels de la plateforme) ?
   - Quel est l'état réel (logs complets) ?
4. **Documenter les contraintes** avant d'écrire la moindre ligne.

## Pivot — uniquement sur erreur confirmée

Ne changer d'approche que si les trois sont vrais :

1. **Erreur réelle confirmée** — pas une spéculation (« ça ne marchera peut-être pas » n'est pas une erreur).
2. **Nouvelles données du système** — le diagnostic a appris quelque chose de neuf.
3. **Plus aucune question à poser d'abord** — la question bloquante est toujours moins chère que le pivot.

Un pivot sans diagnostic en amont fabrique des pivots en cascade : le gouffre à tokens.

## Implémentation économe (hygiène des gestes)

- **Regrouper** les modifications liées en une seule passe d'édition — jamais d'édits séquentiels du même fichier un par un.
- **Vérifier au bon moment** : après un changement structurel, et à la fin (les gates) — pas après chaque micro-changement. La plupart des erreurs viennent du runtime et du payload, pas de la syntaxe.
- Un essai technique raté qui *dit* qu'il est un essai coûte une passe ; le même essai déguisé en solution coûte des pivots en cascade.

## Pourquoi ce format

- L'intention d'abord : empêche l'agent de résoudre *un autre* problème que celui demandé.
- L'impact par fichier : rend les cascades visibles **avant** qu'elles arrivent.
- Les questions en bloc 4 : la règle 4 du skill a un endroit dédié — un doute sans question, c'est un plan qui ment.
