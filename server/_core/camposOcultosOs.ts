import { eq } from "drizzle-orm";
import { osConfiguracoes } from "../../drizzle/schema";
import { IDS_CAMPOS_OCULTAVEIS_OS } from "../../shared/camposOcultaveisOs";
import { getDb } from "../db";

/**
 * Os blocos da O.S. que este cliente escondeu.
 *
 * Fica num lugar só porque tem três leitores — o `bootstrap`, que alimenta as
 * telas; a página pública do QR, que abre sem login; e o gerador de PDF. Cada
 * um lendo por conta própria, bastava esquecer o filtro num deles para um
 * bloco removido do produto voltar a aparecer só ali.
 *
 * Devolve vazio quando não há configuração ou banco: nada é escondido por
 * falta de resposta, que é sempre o lado seguro do erro.
 */
export async function camposOcultosDaUnidade(condominioId: number): Promise<string[]> {
  const db = await getDb();
  if (!db || !condominioId) return [];

  try {
    const [config] = await db
      .select({ campos: osConfiguracoes.camposOcultos })
      .from(osConfiguracoes)
      .where(eq(osConfiguracoes.condominioId, condominioId))
      .limit(1);

    // Filtrado contra o catálogo: id que saiu do produto continua gravado nas
    // contas antigas, e devolvê-lo faria a tela procurar um bloco que não
    // existe mais.
    return (config?.campos ?? []).filter((id) => IDS_CAMPOS_OCULTAVEIS_OS.includes(id));
  } catch (erro) {
    /**
     * Falhar aqui não pode derrubar quem chama.
     *
     * O `bootstrap` é a primeira chamada da aplicação: sem ele não há menu,
     * rota nem tela. Se a coluna `camposOcultos` não existir — banco que ficou
     * para trás da migração, restauração de backup antigo —, uma consulta
     * quebrada aqui deixaria o sistema inteiro inacessível para trocar a
     * ordem de lugar de um campo. Sem a lista, a ordem aparece completa, que é
     * exatamente como era antes desta função existir.
     */
    console.error("[os] falha ao ler os campos ocultos da unidade", condominioId, erro);
    return [];
  }
}
