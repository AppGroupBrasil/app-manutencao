import postgres from "postgres";

const sql = postgres("postgresql://manutencao:o5OiCHV9pqw6kudEPxUeXnKL2FfSBlm0@localhost:5433/manutencao");

async function check() {
  try {
    const columns = await sql`
      SELECT 1+1 as result;
    `;
    console.log(JSON.stringify(columns));
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
check();
