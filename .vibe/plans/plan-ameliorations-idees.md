# Plan d'implémentation — 5 idées d'amélioration Garde-Manger

_Demande d'Alexis (#garde-manger-idees, 21-22/09/2026) — analysé par Vibe le 22/09/2026._

Contexte technique de référence : PWA Next.js 16 (App Router, Server Actions), PostgreSQL/Neon + Drizzle ORM, Better-Auth, architecture ACS ('lib/actions' → 'lib/controllers' → 'lib/services', schéma 'lib/db/schema.ts'). Toute nouvelle donnée passe par : **migration Drizzle → validation Zod ('lib/validations') → service → controller → action → UI**.

---

## 1. Ajouter poids / grammage ⏱️ estimé : M

**Objectif** : stocker un poids (ex. « 500 g », « 1,2 kg ») par produit, en plus de la quantité d'unités.

- **Schéma** : le référentiel 'units' existe déjà ('unitEnum' : litre, …) et 'objectDirectory.unitId' le référence. Ajouter :
  - 'object_directory.weightInGrams' (poids unitaire nominal, ex. 500) — nullable
  - 'object_installation.weightInGrams' (poids réel constaté pour une instance) — nullable, optionnel en v1
- **Migration** : 'pnpm db:generate' + 'pnpm db:migrate'
- **Services** : 'DirectoryService' (mapping OpenFoodFacts : extraire le champ 'quantity' OFF), 'ObjectService' (CRUD instance)
- **Actions** : 'DirectoryActions', 'ObjectActions' — accepter les nouveaux champs via Zod
- **UI** : 'ScanDetailsForm' (afficher/éditer le poids au scan), 'EditObjectInstallationForm', 'ObjectGlobalCard' / 'StockItemCard' (badge « 500 g »)
- **OpenFoodFacts** : le champ 'quantity' de l'API v3 contient souvent le grammage en texte libre → parsing best-effort (regex '(\d+[.,]?\d*)\s*(g|kg|ml|cl|l)'), fallback saisie manuelle.
- **Décision à valider** : poids au niveau produit (directory) seulement, ou aussi par instance ? Reco : directory seul en v1 (le poids d'une boîte ne change pas), instance utile seulement si tu achètes au poids.

## 2. Bouton « S'opposer au nom » (produits importés) ⏱️ estimé : S

**Objectif** : les produits créés depuis OpenFoodFacts sont 'isReadOnly = true' et le nom est figé ('ScanDetailsForm' conditionne l'édition à '!isReadOnly'). Permettre de contester/corriger le nom.

- Reco **v1 (simple)** : bouton « Ce nom est faux / Corriger » dans 'ScanDetailsForm' → action 'DirectoryActions.updateDirectoryName(directoryId, newName)' → passe 'isReadOnly = false' et enregistre le nouveau nom. Historiser dans une table 'directory_corrections' (ancien nom, nouveau, source) pour garder la traçabilité OFF.
- Alternative v2 : système de vote/suggestion si l'annuaire devient partagé entre installations — pas nécessaire tant que l'app est mono-famille.
- **Fichiers** : 'lib/services/DirectoryService.ts', 'lib/actions/DirectoryActions.ts', 'components/objects/ScanDetailsForm.tsx', migration légère.

## 3. Relier un QR/code-barres à un objet existant ⏱️ estimé : S-M

**Objectif** : au scan, si le code est inconnu (ni annuaire local, ni OFF), proposer de l'associer à un produit existant du directory plutôt que d'en créer un nouveau.

- **Schéma** : 'barcode_directory' existe déjà (lien code ↔ 'object_directory'). Rien à migrer : il suffit d'insérer une ligne 'barcode_directory' pointant vers l'objet choisi.
- **Flux** : 'DirectoryService.findProductByBarcode' retourne null → 'ScanDetailsForm' affiche 2 options : *Créer un nouveau produit* (flux actuel) / *Relier à un produit existant* → recherche dans le directory (voir idée 4) → 'DirectoryActions.linkBarcodeToDirectory(barcode, directoryId)'.
- **Edge cases** : code déjà lié à un autre objet → message clair ; vérifier les droits (viewer ne modifie pas l'annuaire) ; QR non-EAN → stocker le payload brut dans 'barcode_directory' avec le bon 'barcodeTypeEnum'.
- **Fichiers** : 'lib/services/DirectoryService.ts', 'lib/actions/DirectoryActions.ts', 'components/objects/BarcodeScanner.tsx' + 'ScanDetailsForm.tsx', types 'lib/types/scanTypes.ts'.

## 4. Recherche manuelle d'un produit ⏱️ estimé : M

**Objectif** : trouver/ajouter un produit sans scan, par saisie de texte.

- **Annuaire local** : action 'DirectoryActions.searchDirectoryByName(query)' → 'DirectoryService' recherche ILIKE sur 'object_directory.name' (+ marque), debounce 300 ms côté client. Alimente l'ajout manuel de stock et l'idée 3.
- **OpenFoodFacts** : si pas de résultat local, option « Chercher sur OpenFoodFacts » → appel à la recherche par nom de l'API v3, 5-10 premiers résultats proposés → création 'isReadOnly = true' (même flux que le scan).
- **UI** : nouveau composant 'components/objects/ManualSearchProduct.tsx' (input + résultats), réutilisable dans le scan (option 3) et dans l'ajout de stock.
- **Zod** : valider la longueur/format de la query ; cache court des recherches OFF pour limiter les appels.

## 5. Gestion d'une cave à vins ⏱️ estimé : M-L (faisable ✅)

**Réponse** : oui, l'architecture actuelle le permet sans refonte — une cave à vin = une **installation** (type « cave ») + produits du directory enrichis de champs vin.

- **Schéma** — 2 options :
  - **Option A (reco)** : table dédiée 'wine_details' ('directoryId' FK, millésime, appellation, cépage, région, couleur enum rouge/blanc/rosé/effervescent, « boire à partir de », « boire avant », note perso ; prix d'achat déjà présent via 'object_installation.priceInCents'). Extension propre : pas de colonnes mortes pour les non-vins.
  - **Option B** : 'installationTypeEnum' + JSONB 'attributes' sur 'object_installation'. Plus flexible mais moins typé, validations plus lourdes.
- **Spécificités cave** : tri par millésime/apogée plutôt que par péremption ('expiryDate' existant peut servir pour « boire avant ») ; emplacements casiers si besoin (champ 'location' déjà présent sur les instances) ; stat « valeur de la cave » = Σ prix.
- **UI** : catégorie « vin » (ajout au 'categoryEnum'), carte produit avec badge millésime, filtres stock existants réutilisables.
- **Décision à valider** : millésime **sur l'instance** plutôt que sur le directory — le même vin existe en plusieurs millésimes, et la quantité = bouteilles.

---

## Ordre de mise en œuvre conseillé

| # | Idée | Taille | Pourquoi cet ordre |
|---|---|---|---|
| 1 | Recherche manuelle (idée 4) | M | Débloque l'ajout sans scan + prérequis de l'idée 3 |
| 2 | Relier un code à un objet (idée 3) | S-M | Réutilise la recherche manuelle |
| 3 | S'opposer au nom (idée 2) | S | Rapide, améliore la qualité de l'annuaire |
| 4 | Poids (idée 1) | M | Migration + parsing OFF |
| 5 | Cave à vins (idée 5) | M-L | Plus gros périmètre, à cadrer d'abord (option A vs B, millésime) |

Nettoyage à faire au passage (déjà identifiés) : corriger 'test/translations.test.ts' (locales inexistants), purger 'content/database_types/' (types résiduels ride/invoice/shift), remplacer le README create-next-app par une vraie doc.

— Vibe, 22/09/2026
