import postgres from "postgres";

const sql = postgres("postgresql://manutencao:o5OiCHV9pqw6kudEPxUeXnKL2FfSBlm0@127.0.0.1:5432/manutencao");

async function check() {
  try {
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'funcionarios'
      ORDER BY ordinal_position;
    `;
    console.log(JSON.stringify(columns));
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
check();
