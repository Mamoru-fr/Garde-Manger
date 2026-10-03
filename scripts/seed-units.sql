-- ============================================================
-- Seed des unités — spec générique/poids §3.1
-- (.vibe/plans/spec-modele-generique-poids.md)
--
-- À exécuter APRÈS la migration Drizzle du bloc 2 :
--   1. pnpm drizzle-kit generate   (génère la migration depuis lib/db/schema.ts)
--   2. pnpm drizzle-kit migrate    (l'applique : enums, colonnes, tables)
--   3. psql "$DATABASE_URL" -f scripts/seed-units.sql   (ce script)
--
-- Idempotent : aligne les noms existants (insensible à la casse),
-- puis insère ou met à jour chaque unité du canon de la spec.
--
-- Familles (§3.1) : masse (base g), volume (base ml),
-- discrete (aucune conversion), autre (filet).
-- ============================================================

BEGIN;

-- 0. Alignement des noms existants sur le canon du seed (insensible à la casse)
UPDATE units SET name = 'gramme'      WHERE lower(name) = 'gramme';
UPDATE units SET name = 'kilogramme'  WHERE lower(name) = 'kilogramme';
UPDATE units SET name = 'milligramme' WHERE lower(name) = 'milligramme';
UPDATE units SET name = 'tonne'       WHERE lower(name) = 'tonne';
UPDATE units SET name = 'millilitre'  WHERE lower(name) = 'millilitre';
UPDATE units SET name = 'centilitre'  WHERE lower(name) = 'centilitre';
UPDATE units SET name = 'litre'       WHERE lower(name) = 'litre';
UPDATE units SET name = 'unité'       WHERE lower(name) = 'unité';
UPDATE units SET name = 'sachet'      WHERE lower(name) = 'sachet';
UPDATE units SET name = 'boîte'       WHERE lower(name) = 'boîte';
UPDATE units SET name = 'bouteille'   WHERE lower(name) = 'bouteille';
UPDATE units SET name = 'canette'     WHERE lower(name) = 'canette';
UPDATE units SET name = 'autre'       WHERE lower(name) = 'autre';

-- 1. Insertion ou mise à jour des unités du canon (§3.1)
--    conversion_factor = facteur vers l'unité de BASE de la famille ;
--    null pour les familles sans conversion (discrete, autre).
INSERT INTO units (id, name, symbol, type, family, conversion_factor, is_base, created_at) VALUES
  (gen_random_uuid()::text, 'gramme',      'g',       'gramme',      'masse',    1,        true,  now()),
  (gen_random_uuid()::text, 'kilogramme',  'kg',      'kilogramme',  'masse',    1000,     false, now()),
  (gen_random_uuid()::text, 'milligramme', 'mg',      'milligramme',  'masse',    0.001,    false, now()),
  (gen_random_uuid()::text, 'tonne',       't',       'tonne',       'masse',    1000000,  false, now()),
  (gen_random_uuid()::text, 'millilitre', 'ml',      'millilitre',  'volume',   1,        true,  now()),
  (gen_random_uuid()::text, 'centilitre', 'cl',      'centilitre',  'volume',   10,       false, now()),
  (gen_random_uuid()::text, 'litre',      'L',       'litre',       'volume',   1000,     false, now()),
  (gen_random_uuid()::text, 'unité',      'unité',   'unité',       'discrete', NULL,     false, now()),
  (gen_random_uuid()::text, 'sachet',     'sachet',  'sachet',      'discrete', NULL,     false, now()),
  (gen_random_uuid()::text, 'boîte',      'boîte',   'boîte',       'discrete', NULL,     false, now()),
  (gen_random_uuid()::text, 'bouteille',  'bouteille', 'bouteille',  'discrete', NULL,     false, now()),
  (gen_random_uuid()::text, 'canette',    'canette', 'canette',     'discrete', NULL,     false, now()),
  (gen_random_uuid()::text, 'autre',      'autre',   'autre',       'autre',    NULL,     false, now())
ON CONFLICT (name) DO UPDATE SET
  symbol = EXCLUDED.symbol,
  type = EXCLUDED.type,
  family = EXCLUDED.family,
  conversion_factor = EXCLUDED.conversion_factor,
  is_base = EXCLUDED.is_base;

COMMIT;

-- Vérification visuelle attendue : 13 unités, une seule base par famille
-- convertible (gramme pour masse, millilitre pour volume).
-- SELECT name, symbol, family, conversion_factor, is_base FROM units ORDER BY family, conversion_factor;
