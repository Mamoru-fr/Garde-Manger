# Spec — Modèle générique / poids (blocs 1 à 5)

**Statut** : gravée le 03/10/2026 — validée à deux (Ada + Alexis, tech lead) après reformulations croisées du 03/10.
**Rôle** : source de vérité du chantier générique/poids. Le plan de découpage vit dans `PROJET.md` (section 2) ; cette spec est le contrat d'implémentation des blocs 2 à 5.
**Branche** : `feat-modele-generique-poids` (coupée depuis `developement` après merge de la PR #13).

## 1. Intention

Chaque produit se compte sur une **fiche générique globale** (ex. « Riz ») qui empile les quantités converties vers l'unité de base de sa famille. Les **fiches détail** (marques) informent — marque, Nutri-Score, nutriments, image — et ne portent **jamais** de quantité. L'utilisateur ajuste les quantités sans scanner, affiche dans l'unité de son choix, et relie les produits scannés aux fiches génériques (automatiquement ou à la main).

**On ne veut PAS** :
- d'agrégation stockée (tout est calculé à l'affichage) ;
- de fiches détail comptables (une baisse de quantité ne retire jamais une fiche détail) ;
- de catégories trop larges : huile de tournesol et huile d'olive ne s'entassent jamais sous le même générique.

## 2. Les fiches

### 2.1 Fiche générique — la fiche de stock
- Porte : nom, catégorie, type, famille d'unité de comptage (l'étalon — « le riz se compte en grammes »).
- C'est elle qui porte **l'empilement des quantités** : on y ajoute et retire directement (« +1 kg », « −500 g », « −2 kg »).
- Depuis la fiche : un bouton « voir les différents X » liste les fiches détail affiliées.

### 2.2 Fiche détail (variante) — la fiche d'information
- Exemples : « Riz Carrefour », « Riz Lidl », « Riz vrac ».
- Porte : marque, Nutri-Score, nutriments, image, identifiant OpenFoodFacts — tout ce qu'on peut récolter. **Aucune quantité.**
- But purement informatif : on ne la retire pas quand il n'y a plus de sachet de cette marque ; on diminue la quantité sur le générique.

### 2.3 Trois portes de création d'un générique (jamais une seule)
1. **Au scan** : produit sans générique existant → création automatique d'un générique **point de départ, calibré sur le produit scanné** (pas une catégorie au-dessus — deux produits différents ne s'entassent jamais ensemble).
2. **Manuellement** : le vrac n'a pas de code-barres → l'utilisateur crée la fiche générique lui-même.
3. **Redirection / affiliation** : le bouton « affilier à une fiche générique » est **toujours accessible**, même après affiliation automatique — pour corriger toute association qui ne correspond pas.

## 3. Les quantités

### 3.1 Familles d'unités, base, facteurs

| Famille | Unité de base | Unités | Facteurs vers la base |
|---|---|---|---|
| Masse | gramme (g) | g, kilogramme, milligramme, tonne | 1 / 1000 / 0,001 / 1 000 000 |
| Volume | millilitre (ml) | millilitre, centilitre, litre | 1 / 10 / 1000 |
| Discrète | — (aucune conversion) | unité (œuf, fruit…), sachet, boîte, bouteille, canette | — |
| Autre | — | autre (filet) | — |

- **mg et tonne restent dans la base** (horizon entrepôt — usage futur possible en entrepôts), mais leur affichage est soumis au seuil de lisibilité (§4.1).
- **Œufs** : unité discrète **sans** grammage — « 24 œufs ». L'équivalent masse/volume est **optionnel** partout.
- **Écartées pour l'instant** (ajoutables par simple insertion dans `units`, sans migration) : barquette, pot, brique, tranche, botte. La contenance de la canette (33 cl, 25 cl…) se précisera dans un bloc ultérieur.

### 3.2 Conditionnement (saisie)
- L'ajout se saisit en `{valeur, unité}` libres : « 1 kg », « 750 g », « 2 sachets ».
- Équivalent optionnel pour les discrets : « 2 sachets (de 250 g) » — le grammage, quand il est connu, permet l'intégration au total (§3.3).

### 3.3 Agrégation — règle complète (purement calculée, jamais stockée)
1. Chaque quantité est convertie vers l'unité de base de sa famille : 1 kg → 1000 g.
2. Tout ce qui est convertible s'additionne dans la base : 3 sachets de 1 kg + 5 sachets de 500 g + 750 g en vrac = **5750 g**.
3. Un discret avec équivalent connu **rentre dans le total** et sa composition s'affiche entre parenthèses : « 500 g (dont 2 sachets de 250 g) ».
4. Un discret **sans** équivalent connu s'empile à côté, en **compressant au maximum** (le moins d'unités distinctes possible) : « 1500 g + 2 sachets ».

## 4. L'affichage

### 4.1 Seuil de lisibilité (sélecteur d'unités)
Une unité d'affichage n'est **proposée** que si la quantité convertie atteint **0,1** dans cette unité. Exemples : 500 g → g (500) et kg (0,5) proposés, mg (500 000) proposé, **tonne (0,0005) jamais** ; une demi-tonne réelle dans la fiche → la tonne devient sélectionnable. Le seuil est **réglable sans migration**.

### 4.2 Préférences utilisateur par famille
- Dans le profil utilisateur, section « lisibilité des quantités » : l'unité d'affichage choisie **par famille** (masse → g ou kg ; volume → ml, cl ou L…).
- Toutes les fiches de la famille suivent, dans le périmètre du seuil de lisibilité. Défaut assumé : **centralisé** pour toutes les fiches de la famille.
- Implémentation : table dédiée `user_display_preferences` — pas dans `user`, qui serait surchargé.

## 5. Codes-barres et scan

- Un code-barres identifie **le produit de marque (la variante)**, jamais le générique. Chaîne : barcode → variante → générique.
- **Ordre de résolution : notre base d'abord** — on cherche le barcode dans `barcode_directory` local ; l'appel OpenFoodFacts ne se fait **qu'en repli** si le check local ne donne rien (on n'appelle l'API que lorsque c'est nécessaire). *À re-confirmer par grep sur le flux existant au démarrage du bloc 2 — c'est, sauf surprise, déjà l'ordre du flux actuel ; la spec l'érige en règle.*
- Après résolution, deux chemins — le bouton est voulu **dans les deux** :
  1. **Affiliation automatique** : le barcode identifie la variante → elle rejoint son générique.
  2. **Affiliation manuelle** : bouton « affilier à une fiche générique » → liste des génériques existants (ex. le riz Intermarché rejoint Carrefour et Lidl dans les fiches détail du « Riz »).
- Produit inconnu : création variante + générique éponyme calibré (§2.3).

## 6. Périmètre des données : global vs instance

- **Global, partagé par tous les utilisateurs et toutes les installations** : fiches génériques **et** fiches détail — le « Riz Carrefour » d'un utilisateur est la même référence que celui d'un autre. C'est l'esprit du directory actuel, étendu aux variantes et clarifié.
- **Par instance (installation)** : quantités, notes, prix, dates d'achat/péremption, emplacement — tout ce qui est local, accroché à la fiche référence.
- En base : la fiche référence (globale) porte la redirection vers la fiche d'instance (locale).

## 7. Migration des données existantes (bloc 2 — le point le plus risqué du chantier)

- **Split automatique par fiche existante** : chaque `object_directory` actuel devient un générique éponyme + une variante (la marque, le Nutri-Score, l'image, l'identifiant OpenFoodFacts et le verrou `isReadOnly` descendent dans la variante).
- **Fusion manuelle ensuite** : les génériques en doublon (« Riz Carrefour » + « Riz Lidl » déjà existants) sont fusionnés à la main via le bouton redirection — **pas de fusion automatique par nom, elle ne peut pas deviner**. Alexis fera la passe lui-même (données de famille, volume maîtrisable) — base saine pour l'éventuelle mise en production.

## 8. Décisions d'implémentation figées

| Sujet | Décision |
|---|---|
| Nutriments | JSONB sur la variante (structure flexible héritée d'OpenFoodFacts) |
| Préférences d'affichage | table dédiée `user_display_preferences` (utilisateur × famille × unité) |
| Verrou `isReadOnly` (produits OFF) | descend sur la variante |
| Agrégation | calcul pur à l'affichage ; la vérité = quantités saisies, converties en base de famille |
| Conditionnement à l'ajout | sur la ligne d'instance ; valeur par défaut reprise de la dernière saisie |
| Mouvements de quantité | **aucun lien** vers la marque / fiche détail — saisie libre sur le générique |

## 9. Découpage (rappel — chaque bloc = modification → test → GO d'Alexis)

- **Bloc 2** : schéma Drizzle + migration + seed des unités + service quantités (TDD : test défaillant d'abord).
- **Bloc 3** : vue principale — fiches génériques sans marque, quantité affichée selon les préférences.
- **Bloc 4** : fiches détail + boutons affiliation/redirection + « voir les différents X ».
- **Bloc 5** : ajustement des quantités sans scanner + préférences « lisibilité des quantités » dans le profil.
- Blocs 6 à 9 (cave à vins, nom + QR, hygiène, CI) : inchangés, décrits dans `PROJET.md`.
