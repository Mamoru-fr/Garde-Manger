const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function checkTables() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL non défini dans .env');
      return;
    }

    const sql = neon(databaseUrl);
    // Vérifier tous les schemas
    const allSchemas = await sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog')`;
    
    for (const schemaRow of allSchemas.rows) {
      const schema = schemaRow.schema_name;
      console.log(`\n📋 Tables dans le schema '${schema}':`);
      const result = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = ${schema}`;
      if (result.rows && result.rows.length > 0) {
        result.rows.forEach(row => console.log('   ✓', row.table_name));
      } else {
        console.log('   ✗ Aucune table trouvée');
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Détails:', error);
  }
}

checkTables();