const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function dropAndRecreate() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL non défini dans .env');
      return;
    }

    const sql = neon(databaseUrl);
    
    // 1. Supprimer toutes les tables existantes (dans l'ordre inverse pour les contraintes)
    console.log('🗑️ Suppression des tables existantes...');
    
    const dropTables = [
      'object_history',
      'object_installation', 
      'barcode_directory',
      'object_directory',
      'user_installations',
      'installations',
      'shops',
      'object_types',
      'categories',
      'units',
      'accounts',
      'sessions', 
      'verifications',
      'users'
    ];
    
    for (const table of dropTables) {
      try {
        await sql`DROP TABLE IF EXISTS ${sql.unsafe(table)} CASCADE`;
        console.log(`   ✓ Table ${table} supprimée`);
      } catch (e) {
        console.log(`   ⚠ Table ${table} non trouvée ou déjà supprimée`);
      }
    }

    // 2. Supprimer les séquences
    console.log('\n🗑️ Suppression des séquences...');
    const dropSequences = [
      'users_id_seq',
      'sessions_id_seq', 
      'accounts_id_seq',
      'verifications_id_seq',
      'installations_id_seq',
      'user_installations_id_seq',
      'categories_id_seq',
      'units_id_seq',
      'object_directory_id_seq',
      'barcode_directory_id_seq',
      'object_installation_id_seq',
      'object_history_id_seq',
      'object_types_id_seq',
      'shops_id_seq'
    ];
    
    for (const seq of dropSequences) {
      try {
        await sql`DROP SEQUENCE IF EXISTS ${sql.unsafe(seq)} CASCADE`;
        console.log(`   ✓ Séquence ${seq} supprimée`);
      } catch (e) {
        // ignore
      }
    }

    // 3. Vérifier que tout est propre
    console.log('\n✅ Base de données nettoyée !');
    const result = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables restantes dans public:', result.rows.map(r => r.table_name));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Détails:', error);
  }
}

dropAndRecreate();