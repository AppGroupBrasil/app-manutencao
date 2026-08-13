/**
 * O que uma organização recebe ao nascer.
 *
 * Antes cada cadastro da O.S. era criado na primeira vez que alguém abria a
 * tela: unidade que nunca foi usada ficava sem status, e duas unidades do mesmo
 * cliente podiam acabar com conjuntos diferentes conforme a ordem em que foram
 * abertas. Aqui é uma chamada só, na criação, e toda unidade nasce igual.
 *
 * Idempotente: só grava o que falta, então serve para consertar unidade antiga
 * sem duplicar nada.
 */
import { and, eq } from 'drizzle-orm';
import { osCategorias, osPrioridades, osStatus } from '../../drizzle/schema';
import { getDb } from '../db';
import { seedModulosDoTenant } from './modules';

/**
 * Andamento da O.S.: quatro passos e a saída.
 *
 * "Cancelada" não é andamento — é o que fazer com a ordem aberta por engano.
 * Sem ela, a única saída seria finalizar um serviço que nunca existiu, e o
 * relatório do cliente passaria a mentir.
 */
export const STATUS_OS_PADRAO = [
  { nome: 'Aguardando início', ordem: 1, cor: '#3B82F6', icone: 'FolderOpen', isFinal: false },
  { nome: 'Em execução', ordem: 2, cor: '#F97316', icone: 'Wrench', isFinal: false },
  { nome: 'Finalizada parcialmente', ordem: 3, cor: '#EAB308', icone: 'CircleDashed', isFinal: false },
  { nome: 'Finalizada totalmente', ordem: 4, cor: '#10B981', icone: 'CheckCircle2', isFinal: true },
  { nome: 'Cancelada', ordem: 5, cor: '#EF4444', icone: 'XCircle', isFinal: true },
] as const;

export const CATEGORIAS_OS_PADRAO = [
  { nome: 'Elétrica', icone: 'Zap', cor: '#EAB308' },
  { nome: 'Hidráulica', icone: 'Droplets', cor: '#3B82F6' },
  { nome: 'Estrutural', icone: 'Building2', cor: '#6B7280' },
  { nome: 'Jardinagem', icone: 'TreePine', cor: '#22C55E' },
  { nome: 'Limpeza', icone: 'Sparkles', cor: '#06B6D4' },
  { nome: 'Pintura', icone: 'Paintbrush', cor: '#EC4899' },
  { nome: 'Segurança', icone: 'Shield', cor: '#EF4444' },
  { nome: 'Outros', icone: 'MoreHorizontal', cor: '#8B5CF6' },
] as const;

export const PRIORIDADES_OS_PADRAO = [
  { nome: 'Baixa', nivel: 1, cor: '#22C55E', icone: 'ArrowDown' },
  { nome: 'Normal', nivel: 2, cor: '#3B82F6', icone: 'Minus' },
  { nome: 'Alta', nivel: 3, cor: '#F97316', icone: 'ArrowUp' },
  { nome: 'Urgente', nivel: 4, cor: '#EF4444', icone: 'AlertTriangle' },
] as const;

/** Cria os status da O.S. que faltarem nesta organização. */
export async function seedStatusOs(condominioId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const existentes = await db
    .select({ nome: osStatus.nome })
    .from(osStatus)
    .where(eq(osStatus.condominioId, condominioId));

  const jaTem = new Set(existentes.map((s) => s.nome.toLowerCase()));
  const faltando = STATUS_OS_PADRAO.filter((s) => !jaTem.has(s.nome.toLowerCase()));
  if (faltando.length === 0) return 0;

  await db.insert(osStatus).values(
    faltando.map((s) => ({
      condominioId,
      nome: s.nome,
      cor: s.cor,
      icone: s.icone,
      ordem: s.ordem,
      isFinal: s.isFinal,
      isPadrao: true,
    })),
  );

  return faltando.length;
}

/** Cria as categorias da O.S. que faltarem nesta organização. */
export async function seedCategoriasOs(condominioId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const existentes = await db
    .select({ nome: osCategorias.nome })
    .from(osCategorias)
    .where(eq(osCategorias.condominioId, condominioId));

  const jaTem = new Set(existentes.map((c) => c.nome.toLowerCase()));
  const faltando = CATEGORIAS_OS_PADRAO.filter((c) => !jaTem.has(c.nome.toLowerCase()));
  if (faltando.length === 0) return 0;

  await db.insert(osCategorias).values(
    faltando.map((c) => ({
      condominioId,
      nome: c.nome,
      icone: c.icone,
      cor: c.cor,
      isPadrao: true,
    })),
  );

  return faltando.length;
}

/** Cria as prioridades da O.S. que faltarem nesta organização. */
export async function seedPrioridadesOs(condominioId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const existentes = await db
    .select({ nome: osPrioridades.nome })
    .from(osPrioridades)
    .where(eq(osPrioridades.condominioId, condominioId));

  const jaTem = new Set(existentes.map((p) => p.nome.toLowerCase()));
  const faltando = PRIORIDADES_OS_PADRAO.filter((p) => !jaTem.has(p.nome.toLowerCase()));
  if (faltando.length === 0) return 0;

  await db.insert(osPrioridades).values(
    faltando.map((p) => ({
      condominioId,
      nome: p.nome,
      nivel: p.nivel,
      cor: p.cor,
      icone: p.icone,
      isPadrao: true,
    })),
  );

  return faltando.length;
}

/**
 * Deixa a organização pronta para uso: módulos, status, categorias e
 * prioridades.
 *
 * Falha aqui não invalida a organização recém-criada — ela existe, e rodar de
 * novo completa o que faltou. Por isso cada etapa é registrada e seguida.
 */
export async function prepararUnidade(condominioId: number): Promise<void> {
  const etapas: [string, () => Promise<number>][] = [
    ['módulos', () => seedModulosDoTenant(condominioId)],
    ['status da O.S.', () => seedStatusOs(condominioId)],
    ['categorias da O.S.', () => seedCategoriasOs(condominioId)],
    ['prioridades da O.S.', () => seedPrioridadesOs(condominioId)],
  ];

  for (const [nome, executar] of etapas) {
    try {
      await executar();
    } catch (erro) {
      console.error(`[unidade ${condominioId}] falha ao preparar ${nome}:`, erro);
    }
  }
}
