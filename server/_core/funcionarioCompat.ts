import type { Funcionario } from "../../drizzle/schema";
import { getDb, getRawClient } from "../db";

type FuncionarioColumnMap = Map<string, string>;

const funcionarioColumnsBase = [
  "id",
  "condominioId",
  "nome",
  "cargo",
  "departamento",
  "telefone",
  "email",
  "fotoUrl",
  "descricao",
  "dataAdmissao",
  "ativo",
  "tipoFuncionario",
  "hierarquia",
  "criadoPorId",
  "loginEmail",
  "loginUsuario",
  "senha",
  "loginAtivo",
  "ultimoLogin",
  "resetToken",
  "resetTokenExpira",
  "createdAt",
  "updatedAt",
] as const;

let funcionarioColumnsPromise: Promise<FuncionarioColumnMap | null> | null = null;

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function getFuncionarioColumnMap(): Promise<FuncionarioColumnMap | null> {
  if (!funcionarioColumnsPromise) {
    funcionarioColumnsPromise = (async () => {
      const db = await getDb();
      if (!db) return null;

      const client = getRawClient();
      if (!client) return null;

      const rows = await client.unsafe(`
        select column_name
        from information_schema.columns
        where table_schema = 'public' and table_name = 'funcionarios'
      `) as Array<{ column_name?: string }>;

      const map = new Map<string, string>();
      for (const row of rows) {
        if (!row.column_name) continue;
        map.set(row.column_name.toLowerCase(), row.column_name);
      }

      return map;
    })().catch(() => null);
  }

  return funcionarioColumnsPromise;
}

function resolveColumn(columnMap: FuncionarioColumnMap | null, columnName: string) {
  if (!columnMap) return columnName;
  return columnMap.get(columnName.toLowerCase()) ?? null;
}

function buildSelectList(columnMap: FuncionarioColumnMap | null) {
  const availableColumns = funcionarioColumnsBase
    .map((columnName) => {
      const actualName = resolveColumn(columnMap, columnName);
      if (!actualName) return null;
      return `${quoteIdentifier(actualName)} as ${quoteIdentifier(columnName)}`;
    })
    .filter((value): value is string => Boolean(value));

  return availableColumns.join(", ");
}

function asNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNullableNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function asNullableDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function asBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "t", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "f", "0", "no", "n"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeFuncionario(row: Record<string, unknown>): Funcionario {
  const ativo = asBoolean(row.ativo, true);
  const loginAtivo = asBoolean(row.loginAtivo, ativo);

  return {
    id: typeof row.id === "number" ? row.id : Number(row.id ?? 0),
    condominioId: asNullableNumber(row.condominioId) ?? 0,
    nome: asNullableString(row.nome) ?? "",
    cargo: asNullableString(row.cargo),
    departamento: asNullableString(row.departamento),
    telefone: asNullableString(row.telefone),
    email: asNullableString(row.email),
    fotoUrl: asNullableString(row.fotoUrl),
    descricao: asNullableString(row.descricao),
    dataAdmissao: asNullableDate(row.dataAdmissao),
    ativo,
    tipoFuncionario: (asNullableString(row.tipoFuncionario) as Funcionario["tipoFuncionario"]) ?? "auxiliar",
    hierarquia: (asNullableString(row.hierarquia) as Funcionario["hierarquia"]) ?? "funcionario",
    criadoPorId: asNullableNumber(row.criadoPorId),
    loginEmail: asNullableString(row.loginEmail) ?? asNullableString(row.email),
    loginUsuario: asNullableString(row.loginUsuario),
    senha: asNullableString(row.senha),
    loginAtivo,
    ultimoLogin: asNullableDate(row.ultimoLogin),
    resetToken: asNullableString(row.resetToken),
    resetTokenExpira: asNullableDate(row.resetTokenExpira),
    notificarOsEmail: asBoolean(row.notificarOsEmail, true),
    createdAt: asNullableDate(row.createdAt) ?? new Date(0),
    updatedAt: asNullableDate(row.updatedAt) ?? new Date(0),
  };
}

async function findFuncionarioByColumn(columnName: string, value: string | number) {
  const db = await getDb();
  if (!db) return null;

  const client = getRawClient();
  if (!client) return null;

  const columnMap = await getFuncionarioColumnMap();
  const actualColumn = resolveColumn(columnMap, columnName);
  if (!actualColumn) return null;

  const selectList = buildSelectList(columnMap);
  if (!selectList) return null;

  const rows = await client.unsafe(`
    select ${selectList}
    from ${quoteIdentifier("funcionarios")}
    where ${quoteIdentifier(actualColumn)} = $1
    limit 1
  `, [value]) as Array<Record<string, unknown>>;

  const [row] = rows;
  return row ? normalizeFuncionario(row) : null;
}

export async function findFuncionarioForLogin(identificador: string) {
  const isEmail = identificador.includes("@");
  if (isEmail) {
    return (await findFuncionarioByColumn("loginEmail", identificador))
      ?? findFuncionarioByColumn("email", identificador);
  }

  return findFuncionarioByColumn("loginUsuario", identificador);
}

export async function findFuncionarioById(funcionarioId: number) {
  return findFuncionarioByColumn("id", funcionarioId);
}

export async function findFuncionarioByLoginEmail(email: string) {
  return (await findFuncionarioByColumn("loginEmail", email))
    ?? findFuncionarioByColumn("email", email);
}

export async function findFuncionarioByResetToken(token: string) {
  return findFuncionarioByColumn("resetToken", token);
}