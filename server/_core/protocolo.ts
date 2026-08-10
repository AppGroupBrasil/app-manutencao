/**
 * Protocolo emitido pelo banco.
 *
 * O modelo antigo sorteava um número e conferia se já existia. Entre a leitura
 * e a gravação cabe outra requisição, então duas pessoas registrando no mesmo
 * instante recebiam o mesmo protocolo — ou uma delas batia no índice único e
 * perdia o registro. `nextval` resolve os dois casos: é atômico, não repete e
 * não precisa de retry.
 *
 * As sequences são criadas na migração `0056_protocolos_por_sequence.sql`, já
 * posicionadas acima do maior número gravado no modelo antigo.
 */
import { sql } from "drizzle-orm";
import type { getDb } from "../db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Sequences existentes. Lista fechada: o nome nunca vem de input. */
export const SEQUENCIAS = {
  checklist: "protocolo_checklist",
  manutencao: "protocolo_manutencao",
  ocorrencia: "protocolo_ocorrencia",
  vistoria: "protocolo_vistoria",
  reporte: "protocolo_reporte",
  os: "protocolo_os",
  atividade: "protocolo_atividade",
  tarefa: "protocolo_tarefa",
  vencimento: "protocolo_vencimento",
  qrcode: "protocolo_qrcode",
  qrcodeResposta: "protocolo_qrcode_resposta",
} as const;

export type Sequencia = keyof typeof SEQUENCIAS;

/** Próximo número da sequence. */
async function proximoNumero(db: Db, sequencia: Sequencia): Promise<number> {
  const nome = SEQUENCIAS[sequencia];
  const linhas = await db.execute<{ valor: string | number }>(
    sql`SELECT nextval(${nome}) AS valor`,
  );

  // postgres.js devolve array; drizzle-orm/node-postgres devolve { rows }.
  const primeira = Array.isArray(linhas)
    ? linhas[0]
    : (linhas as unknown as { rows?: { valor: string | number }[] }).rows?.[0];

  return Number(primeira?.valor ?? 0);
}

/**
 * Protocolo pronto para gravar.
 *
 * @param prefixo  "OS-", "TRF-"... vazio nas funções que usam só o número
 * @param digitos  largura mínima; o número cresce além dela quando precisar
 */
export async function proximoProtocolo(
  db: Db,
  sequencia: Sequencia,
  { prefixo = "", digitos = 6 }: { prefixo?: string; digitos?: number } = {},
): Promise<string> {
  const numero = await proximoNumero(db, sequencia);
  return `${prefixo}${String(numero).padStart(digitos, "0")}`;
}

/**
 * Protocolo com data, no formato do Manutenção X: `OS-AAMMDD-0001`.
 *
 * A data é informativa; quem garante a unicidade é a sequence no fim.
 */
export async function proximoProtocoloComData(
  db: Db,
  sequencia: Sequencia,
  prefixo: string,
  digitos = 4,
): Promise<string> {
  const numero = await proximoNumero(db, sequencia);
  const agora = new Date();
  const data = [
    String(agora.getFullYear()).slice(-2),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0"),
  ].join("");

  return `${prefixo}${data}-${String(numero).padStart(digitos, "0")}`;
}
