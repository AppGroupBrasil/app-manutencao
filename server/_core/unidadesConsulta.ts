/**
 * Unidades que uma consulta soma, a partir do que a pessoa marcou na tela.
 *
 * O seletor do painel deixa marcar uma, três ou todas as unidades. O client
 * manda os ids marcados; aqui eles viram a lista que as consultas usam — sempre
 * cruzada com o alcance da identidade autenticada, nunca aceita como veio.
 *
 * Três coisas saem da lista antes de a consulta rodar: unidade fora do alcance
 * (é tentativa de ler o cliente vizinho), unidade suspensa (ninguém abre os
 * registros dela) e unidade sem a função ligada (o calendário nunca mostra o
 * que a unidade não contratou, e somar não muda isso).
 */
import { z } from 'zod';
import type { TrpcContext } from './context';
import { unidadesNaoBloqueadas } from './bloqueio';
import { isModuloHabilitado } from './modules';

/** O que o client informa sobre o alcance desejado da consulta. */
export interface EscolhaDeUnidades {
  /** Ids marcados no seletor. Vazio ou ausente: só a unidade da tela. */
  unidades?: number[];
  /** "Quero a rede inteira que eu alcanço", sem listar id por id. */
  todasUnidades?: boolean;
}

type CtxUnidades = Pick<TrpcContext, 'tenant'> & { condominioId: number };

/**
 * Ids que a consulta deve varrer. Nunca devolve vazio: sem nada sobrando,
 * volta a unidade da tela — que é a que o portão de módulo já liberou nesta
 * requisição.
 */
export async function unidadesDaConsulta(
  ctx: CtxUnidades,
  escolha: EscolhaDeUnidades,
  moduloId?: string,
): Promise<number[]> {
  const daTela = [ctx.condominioId];

  // A conta da plataforma alcança a base inteira: somar a rede dela juntaria
  // clientes diferentes na mesma tela. Ela segue por organização.
  if (ctx.tenant.isMaster()) return daTela;

  // Sem repetidos: o id duplicado vira `IN (1,1)` e, pior, uma chave de cache
  // diferente para o mesmo conjunto.
  const pedidas = [
    ...new Set((escolha.unidades ?? []).filter((id) => Number.isInteger(id) && id > 0)),
  ];
  if (pedidas.length === 0 && !escolha.todasUnidades) return daTela;

  const alcance = await ctx.tenant.ids();
  const escolhidas =
    pedidas.length > 0 ? pedidas.filter((id) => alcance.includes(id)) : alcance;
  if (escolhidas.length === 0) return daTela;

  const liberadas = await unidadesNaoBloqueadas(escolhidas);
  if (!moduloId) return liberadas.length > 0 ? liberadas : daTela;

  const comAFuncao: number[] = [];
  for (const id of liberadas) {
    if (await isModuloHabilitado(id, moduloId)) comAFuncao.push(id);
  }
  return comAFuncao.length > 0 ? comAFuncao : daTela;
}

/**
 * Campo de input das consultas que somam mais de uma unidade.
 *
 * O teto existe para não transformar a lista marcada num `IN` de mil ids: uma
 * rede grande tem dezenas de unidades, não centenas.
 */
export const unidadesSelecionadas = z.array(z.number().int().positive()).max(100).optional();
