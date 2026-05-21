import postgres from 'postgres';
const sql = postgres('postgresql://manutencao:o5OiCHV9pqw6kudEPxUeXnKL2FfSBlm0@127.0.0.1:5433/manutencao');

async function checkSchema() {
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'funcionarios';
    `;
    console.log('REAL_SCHEMA_START');
    console.log(JSON.stringify(columns));
    console.log('REAL_SCHEMA_END');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
