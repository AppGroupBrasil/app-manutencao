import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { 
  revistas, 
  condominios, 
  mensagensSindico, 
  avisos, 
  eventos, 
  funcionarios, 
  telefonesUteis, 
  anunciantes, 
  realizacoes, 
  melhorias, 
  aquisicoes, 
  albuns, 
  fotos, 
  votacoes, 
  classificados, 
  achadosPerdidos, 
  caronas, 
  dicasSeguranca, 
  regrasNormas, 
  comunicados, 
  paginasCustom, 
  secoes, 
  antesDepois, 
  linksUteis, 
  anuncios, 
  votos, 
  opcoesVotacao,
  publicidades,
  manutencoes,
  vistorias,
  ocorrencias,
  checklists,
  checklistItens,
  manutencaoImagens,
  vistoriaImagens,
  ocorrenciaImagens,
  checklistImagens,
  manutencaoTimeline,
  vistoriaTimeline,
  ocorrenciaTimeline 
} from "../../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateRevistaPDF } from "../../pdfGenerator";

export const revistaRouter = router({
    list: protectedProcedure
      .input(z.object({ condominioId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(revistas)
          .where(eq(revistas.condominioId, input.condominioId))
          .orderBy(desc(revistas.createdAt));
      }),

    get: publicProcedure
      .input(z.object({ id: z.number().optional(), shareLink: z.string().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        let result;
        if (input.id) {
          result = await db.select().from(revistas).where(eq(revistas.id, input.id)).limit(1);
        } else if (input.shareLink) {
          result = await db.select().from(revistas).where(eq(revistas.shareLink, input.shareLink)).limit(1);
        }
        return result?.[0] || null;
      }),

    // Obter revista completa com todos os dados (público)
    // OTIMIZAÇÃO: Uso de Promise.all para carregar dados em paralelo
    getPublicFull: publicProcedure
      .input(z.object({ shareLink: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        // Buscar revista
        const [revista] = await db.select().from(revistas)
          .where(eq(revistas.shareLink, input.shareLink)).limit(1);
        if (!revista) return null;
        
        // Buscar condomínio
        const [condominio] = await db.select().from(condominios)
          .where(eq(condominios.id, revista.condominioId)).limit(1);
        
        // =================================================================================
        // OTIMIZAÇÃO PROFISSIONAL: Executar todas as consultas independentes em paralelo
        // Isso reduz drásticamente o tempo de carregamento da revista digital
        // =================================================================================
        const [
          [mensagemSindico],
          avisosData,
          eventosData,
          funcionariosData,
          telefonesData,
          anunciantesData,
          realizacoesData,
          melhoriasData,
          aquisicoesData,
          albunsData,
          votacoesData,
          classificadosData,
          achadosPerdidosData,
          caronasData,
          dicasSegurancaData,
          regrasData,
          comunicadosData,
          paginasCustomData,
          manutencoesData,
          vistoriasData,
          ocorrenciasData,
          checklistsData
        ] = await Promise.all([
          // 1. Mensagem Síndico
          db.select().from(mensagensSindico).where(eq(mensagensSindico.revistaId, revista.id)).limit(1),
          // 2. Avisos
          db.select().from(avisos).where(eq(avisos.revistaId, revista.id)),
          // 3. Eventos
          db.select().from(eventos).where(eq(eventos.revistaId, revista.id)),
          // 4. Funcionários
          db.select().from(funcionarios).where(eq(funcionarios.condominioId, revista.condominioId)),
          // 5. Telefones
          db.select().from(telefonesUteis).where(eq(telefonesUteis.revistaId, revista.id)),
          // 6. Anunciantes
          db.select().from(anunciantes).where(and(eq(anunciantes.condominioId, revista.condominioId), eq(anunciantes.status, "ativo"))),
          // 7. Realizações
          db.select().from(realizacoes).where(eq(realizacoes.revistaId, revista.id)),
          // 8. Melhorias
          db.select().from(melhorias).where(eq(melhorias.revistaId, revista.id)),
          // 9. Aquisições
          db.select().from(aquisicoes).where(eq(aquisicoes.revistaId, revista.id)),
          // 10. Álbuns (Necessário para buscar fotos depois)
          db.select().from(albuns).where(eq(albuns.condominioId, revista.condominioId)),
          // 11. Votações
          db.select().from(votacoes).where(and(eq(votacoes.revistaId, revista.id), eq(votacoes.status, "ativa"))),
          // 12. Classificados
          db.select().from(classificados).where(and(eq(classificados.condominioId, revista.condominioId), eq(classificados.status, "aprovado"))),
          // 13. Achados
          db.select().from(achadosPerdidos).where(and(eq(achadosPerdidos.condominioId, revista.condominioId), eq(achadosPerdidos.status, "aberto"))),
          // 14. Caronas
          db.select().from(caronas).where(and(eq(caronas.condominioId, revista.condominioId), eq(caronas.status, "ativa"))),
          // 15. Dicas
          db.select().from(dicasSeguranca).where(eq(dicasSeguranca.condominioId, revista.condominioId)),
          // 16. Regras
          db.select().from(regrasNormas).where(eq(regrasNormas.condominioId, revista.condominioId)),
          // 17. Comunicados
          db.select().from(comunicados).where(eq(comunicados.revistaId, revista.id)),
          // 18. Páginas Custom
          db.select().from(paginasCustom).where(eq(paginasCustom.condominioId, revista.condominioId)),
          // 19. Manutenções
          db.select().from(manutencoes).where(eq(manutencoes.condominioId, revista.condominioId)),
          // 20. Vistorias
          db.select().from(vistorias).where(eq(vistorias.condominioId, revista.condominioId)),
          // 21. Ocorrências
          db.select().from(ocorrencias).where(eq(ocorrencias.condominioId, revista.condominioId)),
          // 22. Checklists
          db.select().from(checklists).where(eq(checklists.condominioId, revista.condominioId))
        ]);
        
        // Buscar fotos de todos os álbuns do condomínio (depende de albunsData)
        const albumIds = albunsData.map(a => a.id);
        
        // Buscar imagens de cada tipo em paralelo
        const manutencaoIds = manutencoesData.map(m => m.id);
        const vistoriaIds = vistoriasData.map(v => v.id);
        const ocorrenciaIds = ocorrenciasData.map(o => o.id);
        const checklistIds = checklistsData.map(c => c.id);
        
        const [fotosData, manutencaoImagensData, vistoriaImagensData, ocorrenciaImagensData, checklistImagensData] = await Promise.all([
          albumIds.length > 0 
            ? db.select().from(fotos).where(inArray(fotos.albumId, albumIds))
            : Promise.resolve([]),
          manutencaoIds.length > 0
            ? db.select().from(manutencaoImagens).where(inArray(manutencaoImagens.manutencaoId, manutencaoIds))
            : Promise.resolve([]),
          vistoriaIds.length > 0
            ? db.select().from(vistoriaImagens).where(inArray(vistoriaImagens.vistoriaId, vistoriaIds))
            : Promise.resolve([]),
          ocorrenciaIds.length > 0
            ? db.select().from(ocorrenciaImagens).where(inArray(ocorrenciaImagens.ocorrenciaId, ocorrenciaIds))
            : Promise.resolve([]),
          checklistIds.length > 0
            ? db.select().from(checklistImagens).where(inArray(checklistImagens.checklistId, checklistIds))
            : Promise.resolve([]),
        ]);

        // Agrupar imagens por item
        const manutencaoImagensMap = new Map<number, typeof manutencaoImagensData>();
        manutencaoImagensData.forEach(img => {
          const arr = manutencaoImagensMap.get(img.manutencaoId) || [];
          arr.push(img);
          manutencaoImagensMap.set(img.manutencaoId, arr);
        });
        const vistoriaImagensMap = new Map<number, typeof vistoriaImagensData>();
        vistoriaImagensData.forEach(img => {
          const arr = vistoriaImagensMap.get(img.vistoriaId) || [];
          arr.push(img);
          vistoriaImagensMap.set(img.vistoriaId, arr);
        });
        const ocorrenciaImagensMap = new Map<number, typeof ocorrenciaImagensData>();
        ocorrenciaImagensData.forEach(img => {
          const arr = ocorrenciaImagensMap.get(img.ocorrenciaId) || [];
          arr.push(img);
          ocorrenciaImagensMap.set(img.ocorrenciaId, arr);
        });
        const checklistImagensMap = new Map<number, typeof checklistImagensData>();
        checklistImagensData.forEach(img => {
          const arr = checklistImagensMap.get(img.checklistId) || [];
          arr.push(img);
          checklistImagensMap.set(img.checklistId, arr);
        });

        // Enriquecer dados com imagens
        const manutencoesComImagens = manutencoesData.map(m => ({
          ...m,
          imagens: manutencaoImagensMap.get(m.id) || [],
        }));
        const vistoriasComImagens = vistoriasData.map(v => ({
          ...v,
          imagens: vistoriaImagensMap.get(v.id) || [],
        }));
        const ocorrenciasComImagens = ocorrenciasData.map(o => ({
          ...o,
          imagens: ocorrenciaImagensMap.get(o.id) || [],
        }));
        const checklistsComImagens = checklistsData.map(c => ({
          ...c,
          imagens: checklistImagensMap.get(c.id) || [],
        }));
        
        return {
          revista,
          condominio,
          mensagemSindico,
          avisos: avisosData,
          eventos: eventosData,
          funcionarios: funcionariosData,
          telefones: telefonesData,
          anunciantes: anunciantesData,
          realizacoes: realizacoesData,
          melhorias: melhoriasData,
          aquisicoes: aquisicoesData,
          albuns: albunsData,
          fotos: fotosData,
          votacoes: votacoesData,
          classificados: classificadosData,
          achadosPerdidos: achadosPerdidosData,
          caronas: caronasData,
          dicasSeguranca: dicasSegurancaData,
          regras: regrasData,
          comunicados: comunicadosData,
          paginasCustom: paginasCustomData,
          manutencoes: manutencoesComImagens,
          vistorias: vistoriasComImagens,
          ocorrencias: ocorrenciasComImagens,
          checklists: checklistsComImagens,
          seccoesOcultas: [] as string[], // Sem tabela de secções ocultas por enquanto
        };
      }),

    // Obter item individual da revista (público) - para QR codes
    getPublicItem: publicProcedure
      .input(z.object({
        shareLink: z.string(),
        tipo: z.enum(["manutencao", "vistoria", "ocorrencia", "checklist", "antes_depois"]),
        itemId: z.number()
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        // Verificar que a revista existe
        const [revista] = await db.select().from(revistas)
          .where(eq(revistas.shareLink, input.shareLink)).limit(1);
        if (!revista) return null;

        // Buscar condomínio
        const [condominio] = await db.select().from(condominios)
          .where(eq(condominios.id, revista.condominioId)).limit(1);

        let item: any = null;
        let imagens: any[] = [];
        let timeline: any[] = [];
        let checklistItensData: any[] = [];

        switch (input.tipo) {
          case "manutencao": {
            const [m] = await db.select().from(manutencoes)
              .where(and(eq(manutencoes.id, input.itemId), eq(manutencoes.condominioId, revista.condominioId)))
              .limit(1);
            if (m) {
              item = m;
              [imagens, timeline] = await Promise.all([
                db.select().from(manutencaoImagens).where(eq(manutencaoImagens.manutencaoId, m.id)),
                db.select().from(manutencaoTimeline).where(eq(manutencaoTimeline.manutencaoId, m.id)).orderBy(desc(manutencaoTimeline.createdAt))
              ]);
            }
            break;
          }
          case "vistoria": {
            const [v] = await db.select().from(vistorias)
              .where(and(eq(vistorias.id, input.itemId), eq(vistorias.condominioId, revista.condominioId)))
              .limit(1);
            if (v) {
              item = v;
              [imagens, timeline] = await Promise.all([
                db.select().from(vistoriaImagens).where(eq(vistoriaImagens.vistoriaId, v.id)),
                db.select().from(vistoriaTimeline).where(eq(vistoriaTimeline.vistoriaId, v.id)).orderBy(desc(vistoriaTimeline.createdAt))
              ]);
            }
            break;
          }
          case "ocorrencia": {
            const [o] = await db.select().from(ocorrencias)
              .where(and(eq(ocorrencias.id, input.itemId), eq(ocorrencias.condominioId, revista.condominioId)))
              .limit(1);
            if (o) {
              item = o;
              [imagens, timeline] = await Promise.all([
                db.select().from(ocorrenciaImagens).where(eq(ocorrenciaImagens.ocorrenciaId, o.id)),
                db.select().from(ocorrenciaTimeline).where(eq(ocorrenciaTimeline.ocorrenciaId, o.id)).orderBy(desc(ocorrenciaTimeline.createdAt))
              ]);
            }
            break;
          }
          case "checklist": {
            const [c] = await db.select().from(checklists)
              .where(and(eq(checklists.id, input.itemId), eq(checklists.condominioId, revista.condominioId)))
              .limit(1);
            if (c) {
              item = c;
              [imagens, checklistItensData] = await Promise.all([
                db.select().from(checklistImagens).where(eq(checklistImagens.checklistId, c.id)),
                db.select().from(checklistItens).where(eq(checklistItens.checklistId, c.id))
              ]);
            }
            break;
          }
          case "antes_depois": {
            const [ad] = await db.select().from(antesDepois)
              .where(and(eq(antesDepois.id, input.itemId), eq(antesDepois.revistaId, revista.id)))
              .limit(1);
            if (ad) {
              item = ad;
            }
            break;
          }
        }

        if (!item) return null;

        return {
          item,
          imagens,
          timeline,
          checklistItens: checklistItensData,
          condominio: condominio ? { nome: condominio.nome, logoUrl: condominio.logoUrl } : null,
          revista: { titulo: revista.titulo, edicao: revista.edicao }
        };
      }),

    create: protectedProcedure
      .input(z.object({
        condominioId: z.number(),
        titulo: z.string().min(1),
        subtitulo: z.string().optional(),
        edicao: z.string().optional(),
        capaUrl: z.string().optional(),
        templateId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const shareLink = nanoid(10);
        const [result] = await db.insert(revistas).values({
          ...input,
          shareLink,
        }).returning();
        return { id: Number(result.id), shareLink };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        subtitulo: z.string().optional(),
        edicao: z.string().optional(),
        capaUrl: z.string().optional(),
        status: z.enum(["rascunho", "publicada", "arquivada"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        if (data.status === "publicada") {
          (data as any).publicadaEm = new Date();
        }
        await db.update(revistas).set(data).where(eq(revistas.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Excluir todas as dependências primeiro (tabelas que referenciam revistas)
        // Baseado na consulta: melhorias, aquisicoes, votacoes, realizacoes, avisos, eventos, anuncios, antes_depois, telefones_uteis, links_uteis, mensagens_sindico, secoes, comunicados
        await db.delete(secoes).where(eq(secoes.revistaId, input.id));
        await db.delete(mensagensSindico).where(eq(mensagensSindico.revistaId, input.id));
        await db.delete(avisos).where(eq(avisos.revistaId, input.id));
        await db.delete(comunicados).where(eq(comunicados.revistaId, input.id));
        await db.delete(eventos).where(eq(eventos.revistaId, input.id));
        await db.delete(antesDepois).where(eq(antesDepois.revistaId, input.id));
        await db.delete(linksUteis).where(eq(linksUteis.revistaId, input.id));
        await db.delete(telefonesUteis).where(eq(telefonesUteis.revistaId, input.id));
        await db.delete(melhorias).where(eq(melhorias.revistaId, input.id));
        await db.delete(aquisicoes).where(eq(aquisicoes.revistaId, input.id));
        await db.delete(realizacoes).where(eq(realizacoes.revistaId, input.id));
        await db.delete(anuncios).where(eq(anuncios.revistaId, input.id));
        
        // Excluir votações e suas dependências (votos e opções)
        const votacoesRevista = await db.select({ id: votacoes.id }).from(votacoes).where(eq(votacoes.revistaId, input.id));
        for (const votacao of votacoesRevista) {
          await db.delete(votos).where(eq(votos.votacaoId, votacao.id));
          await db.delete(opcoesVotacao).where(eq(opcoesVotacao.votacaoId, votacao.id));
        }
        await db.delete(votacoes).where(eq(votacoes.revistaId, input.id));
        
        // Agora excluir a revista
        await db.delete(revistas).where(eq(revistas.id, input.id));
        return { success: true };
      }),

    // Gerar PDF da revista
    generatePDF: publicProcedure
      .input(z.object({ 
        id: z.number().optional(), 
        shareLink: z.string().optional(),
        estilo: z.enum(['classico', 'moderno', 'minimalista', 'elegante', 'corporativo']).optional()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar revista por ID ou shareLink
        let revistaResult;
        if (input.shareLink) {
          revistaResult = await db.select().from(revistas).where(eq(revistas.shareLink, input.shareLink)).limit(1);
        } else if (input.id) {
          revistaResult = await db.select().from(revistas).where(eq(revistas.id, input.id)).limit(1);
        } else {
          throw new Error("ID ou shareLink é obrigatório");
        }
        const revista = revistaResult[0];
        if (!revista) throw new Error("Revista não encontrada");
        
        // Buscar condomínio
        const condominioResult = await db.select().from(condominios).where(eq(condominios.id, revista.condominioId)).limit(1);
        const condominio = condominioResult[0];
        if (!condominio) throw new Error("Condomínio não encontrado");
        
        // =========================================================
        // OTIMIZAÇÃO: Carregamento paralelo para geração do PDF
        // =========================================================
        const [
          [mensagem],
          avisosResult,
          eventosResult,
          funcionariosResult,
          telefonesResult,
          anunciantesResult,
          comunicadosResult,
          regrasResult,
          dicasResult,
          realizacoesResult,
          melhoriasResult,
          aquisicoesResult,
          publicidadesResult,
          classificadosResult,
          caronasResult,
          achadosResult
        ] = await Promise.all([
          db.select().from(mensagensSindico).where(eq(mensagensSindico.revistaId, revista.id)).limit(1),
          db.select().from(avisos).where(eq(avisos.revistaId, revista.id)),
          db.select().from(eventos).where(eq(eventos.revistaId, revista.id)),
          db.select().from(funcionarios).where(eq(funcionarios.condominioId, revista.condominioId)),
          db.select().from(telefonesUteis).where(eq(telefonesUteis.revistaId, revista.id)),
          db.select().from(anunciantes).where(and(eq(anunciantes.condominioId, revista.condominioId), eq(anunciantes.status, "ativo"))),
          db.select().from(comunicados).where(eq(comunicados.revistaId, revista.id)),
          db.select().from(regrasNormas).where(eq(regrasNormas.condominioId, revista.condominioId)),
          db.select().from(dicasSeguranca).where(eq(dicasSeguranca.condominioId, revista.condominioId)),
          db.select().from(realizacoes).where(eq(realizacoes.revistaId, revista.id)),
          db.select().from(melhorias).where(eq(melhorias.revistaId, revista.id)),
          db.select().from(aquisicoes).where(eq(aquisicoes.revistaId, revista.id)),
          db.select().from(publicidades).where(eq(publicidades.condominioId, revista.condominioId)),
          db.select().from(classificados).where(and(eq(classificados.condominioId, revista.condominioId), eq(classificados.status, "aprovado"))),
          db.select().from(caronas).where(and(eq(caronas.condominioId, revista.condominioId), eq(caronas.status, "ativa"))),
          db.select().from(achadosPerdidos).where(and(eq(achadosPerdidos.condominioId, revista.condominioId), eq(achadosPerdidos.status, "aberto")))
        ]);
        
        // Gerar PDF
        const pdfBuffer = await generateRevistaPDF({
          titulo: revista.titulo,
          subtitulo: revista.subtitulo || undefined,
          edicao: revista.edicao || "Edição Especial",
          condominioNome: condominio.nome,
          condominioLogo: condominio.logoUrl || undefined,
          estilo: input.estilo || 'classico',
          mensagemSindico: mensagem ? {
            titulo: mensagem.titulo || "Mensagem do Síndico",
            mensagem: mensagem.mensagem || "",
            nomeSindico: mensagem.nomeSindico || "Síndico",
            fotoSindico: mensagem.fotoSindicoUrl || undefined,
            assinatura: mensagem.assinatura || undefined,
          } : undefined,
          avisos: avisosResult.map(a => ({
            titulo: a.titulo,
            conteudo: a.conteudo || "",
            tipo: a.tipo || "informativo",
          })),
          eventos: eventosResult.map(e => ({
            titulo: e.titulo,
            descricao: e.descricao || undefined,
            dataEvento: e.dataEvento?.toISOString() || new Date().toISOString(),
            horario: e.horaInicio || undefined,
            local: e.local || undefined,
          })),
          funcionarios: funcionariosResult.map(f => ({
            nome: f.nome,
            cargo: f.cargo || "Funcionário",
            turno: undefined,
            fotoUrl: f.fotoUrl || undefined,
          })),
          telefones: telefonesResult.map(t => ({
            nome: t.nome,
            numero: t.telefone,
          })),
          anunciantes: anunciantesResult.map(a => ({
            nome: a.nome,
            descricao: a.descricao || undefined,
            categoria: a.categoria,
            telefone: a.telefone || undefined,
            whatsapp: a.whatsapp || undefined,
            logoUrl: a.logoUrl || undefined,
          })),
          comunicados: comunicadosResult.map(c => ({
            titulo: c.titulo,
            conteudo: c.descricao || "",
            tipo: "geral",
            dataPublicacao: c.createdAt?.toISOString(),
          })),
          regras: regrasResult.map(r => ({
            titulo: r.titulo,
            descricao: r.conteudo || "",
            categoria: r.categoria || undefined,
          })),
          dicasSeguranca: dicasResult.map(d => ({
            titulo: d.titulo,
            descricao: d.conteudo || "",
            categoria: d.categoria || undefined,
          })),
          realizacoes: realizacoesResult.map(r => ({
            titulo: r.titulo,
            descricao: r.descricao || "",
            dataRealizacao: r.dataRealizacao?.toISOString(),
          })),
          melhorias: melhoriasResult.map(m => ({
            titulo: m.titulo,
            descricao: m.descricao || "",
            status: m.status || undefined,
            previsao: m.dataImplementacao?.toISOString() || undefined,
          })),
          aquisicoes: aquisicoesResult.map(a => ({
            titulo: a.titulo,
            descricao: a.descricao || "",
            valor: a.valor ? Number(a.valor) : undefined,
            dataAquisicao: a.dataAquisicao?.toISOString(),
          })),
          publicidade: publicidadesResult.map(p => ({
            titulo: p.titulo,
            descricao: p.descricao || undefined,
            imagemUrl: p.imagemUrl || undefined,
            link: p.linkUrl || undefined,
          })),
          classificados: classificadosResult.map(c => ({
            titulo: c.titulo,
            descricao: c.descricao || "",
            preco: c.preco ? Number(c.preco) : undefined,
            contato: c.contato || undefined,
          })),
          caronas: caronasResult.map(c => ({
            origem: c.origem,
            destino: c.destino,
            horario: c.dataCarona?.toISOString() || undefined,
            contato: c.contato || undefined,
          })),
          achadosPerdidos: achadosResult.map(a => ({
            titulo: a.titulo,
            descricao: a.descricao || undefined,
            local: a.localEncontrado || undefined,
            tipo: a.tipo,
          })),
        });
        
        // Retornar PDF como base64
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `${revista.titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${revista.edicao?.replace(/[^a-zA-Z0-9]/g, '_') || 'revista'}.pdf`,
        };
      }),
});
