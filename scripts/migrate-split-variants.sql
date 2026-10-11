-- ============================================================
-- Migration de données : split directory → générique + variante
-- Spec générique/poids §7 (.vibe/plans/spec-modele-generique-poids.md)
--
-- À exécuter APRÈS la migration Drizzle du bloc 2 ET le seed des unités :
--   1. pnpm drizzle-kit generate
--   2. pnpm drizzle-kit migrate
--   3. psql "$DATABASE_URL" -f scripts/seed-units.sql
--   4. psql "$DATABASE_URL" -f scripts/migrate-split-variants.sql   (ce script)
--
-- Règle gravée (§7) : SPLIT AUTOMATIQUE par fiche existante — chaque
-- object_directory qui porte une marque devient un générique éponyme +
-- une variante (marque, Nutri-Score, image, identifiant OFF, verrou
-- isReadOnly descendent dans la variante). FUSION MANUELLE ensuite par
-- Alexis via le bouton redirection (bloc 4) — pas de fusion automatique
-- par nom, elle ne peut pas deviner.
--
-- Idempotent : chaque étape se relance sans effet de bord.
-- ============================================================

BEGIN;

-- 1. Créer une variante pour chaque directory qui porte une marque.
--    Le directory actuel DEVIENT le générique éponyme (pas de renommage
--    au bloc 2 — la fusion manuelle viendra avec l'UI du bloc 4).
INSERT INTO product_variants (
  id, generic_directory_id, brand, nutriscore, image_url,
  open_food_facts_id, is_read_only, created_at, updated_at
)
SELECT
  gen_random_uuid()::text,
  d.id,
  d.brand,
  d.nutriscore,
  d.image_url,
  d.open_food_facts_id,
  COALESCE(d.is_read_only, false),
  now(),
  now()
FROM object_directory d
WHERE d.brand IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_variants pv WHERE pv.generic_directory_id = d.id
  );

-- 2. Lier chaque code-barres à sa variante (§5 : barcode → variante → générique).
--    L'ancien lien object_directory_id reste en place jusqu'à la bascule (bloc 4).
UPDATE barcode_directory bd
SET product_variant_id = pv.id
FROM product_variants pv
WHERE pv.generic_directory_id = bd.object_directory_id
  AND bd.product_variant_id IS NULL;

COMMIT;

-- Vérification visuelle attendue :
-- SELECT count(*) FROM product_variants;              -- = nombre de directories avec marque
-- SELECT count(*) FROM barcode_directory
--   WHERE product_variant_id IS NOT NULL;             -- barcodes de ces directories
