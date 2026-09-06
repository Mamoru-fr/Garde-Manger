-- Script pour renommer les tables Better-Auth selon le schema attendu
-- Exécuter ce script directement dans Neon (via psql ou l'interface web)

-- Renommer les tables existantes (si elles existent)
ALTER TABLE IF EXISTS users RENAME TO user;
ALTER TABLE IF EXISTS sessions RENAME TO session;
ALTER TABLE IF EXISTS accounts RENAME TO account;
ALTER TABLE IF EXISTS verifications RENAME TO verification;

-- Renommer les séquences (si elles existent)
ALTER SEQUENCE IF EXISTS users_id_seq RENAME TO user_id_seq;
ALTER SEQUENCE IF EXISTS sessions_id_seq RENAME TO session_id_seq;
ALTER SEQUENCE IF EXISTS accounts_id_seq RENAME TO account_id_seq;
ALTER SEQUENCE IF EXISTS verifications_id_seq RENAME TO verification_id_seq;

-- Renommer les indexes
ALTER INDEX IF EXISTS users_email_idx RENAME TO user_email_idx;
ALTER INDEX IF EXISTS sessions_user_id_idx RENAME TO session_userId_idx;
ALTER INDEX IF EXISTS accounts_user_id_idx RENAME TO account_userId_idx;
ALTER INDEX IF EXISTS verifications_identifier_idx RENAME TO verification_identifier_idx;

-- Renommer les contraintes de clé étrangère
ALTER TABLE IF EXISTS installations 
  RENAME CONSTRAINT installations_owner_id_fkey TO installations_owner_id_fkey;

ALTER TABLE IF EXISTS user_installations 
  RENAME CONSTRAINT user_installations_user_id_fkey TO user_installations_user_id_fkey;

ALTER TABLE IF EXISTS accounts 
  RENAME CONSTRAINT accounts_user_id_fkey TO account_user_id_fkey;

ALTER TABLE IF EXISTS sessions 
  RENAME CONSTRAINT sessions_user_id_fkey TO session_user_id_fkey;