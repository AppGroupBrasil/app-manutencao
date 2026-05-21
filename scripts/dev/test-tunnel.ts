import postgres from 'postgres';
const sql = postgres('postgresql://manutencao:o5OiCHV9pqw6kudEPxUeXnKL2FfSBlm0@localhost:15432/manutencao', { connect_timeout: 10, ssl: false });
async function main() {
  try {
    const r = await sql`SELECT version()`;
    console.log('✅', r[0].version);
  } catch(e: any) {
    console.error('❌', e.message);
  }
  await sql.end();
}
main();
