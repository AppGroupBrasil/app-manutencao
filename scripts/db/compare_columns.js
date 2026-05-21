import postgres from "postgres";

const sql = postgres("postgresql://manutencao:o5OiCHV9pqw6kudEPxUeXnKL2FfSBlm0@127.0.0.1:5433/manutencao");

const expectedColumns = [
  "id", "condominioId", "nome", "cargo", "departamento", "telefone", "email", 
  "fotoUrl", "descricao", "dataAdmissao", "ativo", "tipoFuncionario", 
  "hierarquia", "criadoPorId", "loginEmail", "loginUsuario", "senha", 
  "loginAtivo", "ultimoLogin", "resetToken", "resetTokenExpira", 
  "createdAt", "updatedAt"
];

async function checkColumns() {
  try {
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = "public" AND table_name = "funcionarios"
      ORDER BY ordinal_position;
    `;
    
    const actualColumns = columns.map(c => c.column_name);
    
    console.log("Colunas encontradas no banco:");
    console.log(actualColumns.join(", "));
    
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    
    console.log("\nColunas faltando:");
    if (missingColumns.length === 0) {
      console.log("Nenhuma coluna faltando.");
    } else {
      console.log(missingColumns.join(", "));
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkColumns();
