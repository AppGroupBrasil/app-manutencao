
import { z } from "zod";
import { getDb } from "../../db";
import { 
  membrosEquipe, 
  membroAcessos, 
  users, 
  compartilhamentosEquipe, 
  compartilhamentoVisualizacoes, 
  notificacoesVisualizacao
} from "../../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { publicProcedure, protectedProcedure, escopoProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro } from "../../_core/escopoRegistro";
import { getSessionCookieOptions } from "../../_core/cookies";
import { ENV } from "../../_core/env";

/** Rotas por `id`: o membro precisa ser de uma organização do solicitante. */
const membroProcedure = escopoProcedure(escopoPorRegistro({ id: direto(membrosEquipe) }));

export const equipeRouter = router({
  list: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(membrosEquipe)
        .where(and(
          eq(membrosEquipe.condominioId, input.condominioId),
          eq(membrosEquipe.ativo, true)
        ))
        .orderBy(membrosEquipe.nome);
    }),

  get: membroProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(membrosEquipe).where(eq(membrosEquipe.id, input.id)).limit(1);
      return result[0] || null;
    }),

  create: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      nome: z.string().min(1),
      whatsapp: z.string().min(1),
      descricao: z.string().optional(),
      cargo: z.string().optional(),
      fotoUrl: z.string().optional(),
      // Novos campos de permissÃµes
      email: z.string().email().optional(),
      senha: z.string().min(6).optional(),
      acessoTotal: z.boolean().optional(),
      permissoes: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Se tem email e senha, fazer hash da senha
      let senhaHash = null;
      if (input.email && input.senha) {
        const bcrypt = await import("bcryptjs");
        senhaHash = await bcrypt.hash(input.senha, 10);
      }
      
      const [result] = await db.insert(membrosEquipe).values({
        condominioId: input.condominioId,
        nome: input.nome,
        whatsapp: input.whatsapp,
        descricao: input.descricao || null,
        cargo: input.cargo || null,
        fotoUrl: input.fotoUrl || null,
        email: input.email || null,
        senha: senhaHash,
        acessoTotal: input.acessoTotal || false,
        permissoes: input.permissoes || [],
      }).returning();
      return { id: result.id };
    }),

  update: membroProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(1).optional(),
      whatsapp: z.string().min(1).optional(),
      descricao: z.string().optional(),
      cargo: z.string().optional(),
      fotoUrl: z.string().optional(),
      // Novos campos de permissÃµes
      email: z.string().email().optional().nullable(),
      senha: z.string().min(6).optional(),
      acessoTotal: z.boolean().optional(),
      permissoes: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, senha, permissoes, ...data } = input;
      
      // Preparar dados para atualizaÃ§Ã£o
      const updateData: any = { ...data };
      
      // Se tem nova senha, fazer hash
      if (senha) {
        const bcrypt = await import("bcryptjs");
        updateData.senha = await bcrypt.hash(senha, 10);
      }
      
      // Converter permissÃµes para JSON string
      if (permissoes !== undefined) {
        updateData.permissoes = permissoes;
      }
      
      await db.update(membrosEquipe).set(updateData).where(eq(membrosEquipe.id, id));
      return { success: true };
    }),

  delete: membroProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(membrosEquipe).set({ ativo: false }).where(eq(membrosEquipe.id, input.id));
      return { success: true };
    }),

  // Login de membro da equipe
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      senha: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Capturar informaÃ§Ãµes do acesso
      const userAgent = ctx.req.headers["user-agent"] || "";
      const ip = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() 
        || ctx.req.headers["x-real-ip"]?.toString() 
        || ctx.req.socket?.remoteAddress 
        || "";
      
      // Parsear User-Agent para extrair dispositivo, navegador e SO
      const parseUA = (ua: string) => {
        let dispositivo = "Desktop";
        let navegador = "Desconhecido";
        let sistemaOperacional = "Desconhecido";
        
        // Detectar dispositivo
        if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
          dispositivo = /iPad/i.test(ua) ? "Tablet" : "Mobile";
        }
        
        // Detectar navegador
        if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) navegador = "Chrome";
        else if (/Firefox/i.test(ua)) navegador = "Firefox";
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) navegador = "Safari";
        else if (/Edge|Edg/i.test(ua)) navegador = "Edge";
        else if (/Opera|OPR/i.test(ua)) navegador = "Opera";
        else if (/MSIE|Trident/i.test(ua)) navegador = "Internet Explorer";
        
        // Detectar SO
        if (/Windows/i.test(ua)) sistemaOperacional = "Windows";
        else if (/iPhone|iPad|iPod/i.test(ua)) sistemaOperacional = "iOS";
        else if (/Mac OS X|macOS/i.test(ua)) sistemaOperacional = "macOS";
        else if (/Linux/i.test(ua) && !/Android/i.test(ua)) sistemaOperacional = "Linux";
        else if (/Android/i.test(ua)) sistemaOperacional = "Android";
        
        return { dispositivo, navegador, sistemaOperacional };
      };
      
      const { dispositivo, navegador, sistemaOperacional } = parseUA(userAgent);
      
      // Buscar membro pelo email
      const result = await db.select().from(membrosEquipe)
        .where(and(
          eq(membrosEquipe.email, input.email),
          eq(membrosEquipe.ativo, true)
        ))
        .limit(1);
      
      if (!result[0]) {
        throw new Error("Email ou senha invÃ¡lidos");
      }
      
      const membro = result[0];
      
      // Verificar se tem senha cadastrada
      if (!membro.senha) {
        // Registrar tentativa de acesso falha
        await db.insert(membroAcessos).values({
          membroId: membro.id,
          condominioId: membro.condominioId,
          ip,
          userAgent,
          dispositivo,
          navegador,
          sistemaOperacional,
          tipoAcesso: "login",
          sucesso: false,
          motivoFalha: "Membro sem senha cadastrada",
        }).returning();
        throw new Error("Este membro nÃ£o possui acesso ao sistema");
      }
      
      // Verificar senha
      const bcrypt = await import("bcryptjs");
      const senhaValida = await bcrypt.compare(input.senha, membro.senha);
      
      if (!senhaValida) {
        // Registrar tentativa de acesso falha
        await db.insert(membroAcessos).values({
          membroId: membro.id,
          condominioId: membro.condominioId,
          ip,
          userAgent,
          dispositivo,
          navegador,
          sistemaOperacional,
          tipoAcesso: "login",
          sucesso: false,
          motivoFalha: "Senha invÃ¡lida",
        }).returning();
        throw new Error("Email ou senha invÃ¡lidos");
      }
      
      // Registrar acesso bem-sucedido
      await db.insert(membroAcessos).values({
        membroId: membro.id,
        condominioId: membro.condominioId,
        ip,
        userAgent,
        dispositivo,
        navegador,
        sistemaOperacional,
        tipoAcesso: "login",
        sucesso: true,
      });
      
      // Atualizar Ãºltimo acesso
      await db.update(membrosEquipe)
        .set({ ultimoAcesso: new Date() })
        .where(eq(membrosEquipe.id, membro.id));
      
      // Gerar token JWT para o membro
      const jwt = await import("jsonwebtoken");
      const token = jwt.default.sign(
        { 
          membroId: membro.id, 
          condominioId: membro.condominioId,
          nome: membro.nome,
          acessoTotal: membro.acessoTotal,
          permissoes: membro.permissoes || [],
          tipo: "membro_equipe"
        },
        ENV.cookieSecret,
        { expiresIn: "7d" }
      );
      
      // Setar cookie
      ctx.res.cookie("membro_token", token, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      });
      
      return { 
        success: true, 
        membro: {
          id: membro.id,
          nome: membro.nome,
          cargo: membro.cargo,
          fotoUrl: membro.fotoUrl,
          condominioId: membro.condominioId,
          acessoTotal: membro.acessoTotal,
          permissoes: membro.permissoes ? (typeof membro.permissoes === 'string' ? JSON.parse(membro.permissoes) : membro.permissoes) : [],
        }
      };
    }),

  // Logout de membro da equipe
  logout: publicProcedure
    .mutation(async ({ ctx }) => {
      ctx.res.clearCookie("membro_token", getSessionCookieOptions(ctx.req));
      return { success: true };
    }),

  // Verificar sessÃ£o do membro
  me: publicProcedure
    .query(async ({ ctx }) => {
      const token = ctx.req.cookies?.membro_token;
      if (!token) return null;
      
      try {
        const jwt = await import("jsonwebtoken");
        const decoded = jwt.default.verify(token, ENV.cookieSecret) as any;
        
        if (decoded.tipo !== "membro_equipe") return null;
        
        const db = await getDb();
        if (!db) return null;
        
        const result = await db.select().from(membrosEquipe)
          .where(and(
            eq(membrosEquipe.id, decoded.membroId),
            eq(membrosEquipe.ativo, true)
          ))
          .limit(1);
        
        if (!result[0]) return null;
        
        const membro = result[0];
        
        return {
          id: membro.id,
          nome: membro.nome,
          email: membro.email,
          cargo: membro.cargo,
          fotoUrl: membro.fotoUrl,
          condominioId: membro.condominioId,
          acessoTotal: membro.acessoTotal,
          permissoes: membro.permissoes ? (typeof membro.permissoes === 'string' ? JSON.parse(membro.permissoes) : membro.permissoes) : [],
        };
      } catch (error) {
        return null;
      }
    }),

  // HistÃ³rico de acessos do membro
  historicoAcessos: protectedProcedure
    .input(z.object({
      membroId: z.number(),
      pagina: z.number().default(1),
      limite: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { acessos: [], total: 0 };
      
      const offset = (input.pagina - 1) * input.limite;
      
      const acessos = await db.select().from(membroAcessos)
        .where(eq(membroAcessos.membroId, input.membroId))
        .orderBy(desc(membroAcessos.dataHora))
        .limit(input.limite)
        .offset(offset);
      
      const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(membroAcessos)
        .where(eq(membroAcessos.membroId, input.membroId));
      
      return {
        acessos,
        total: Number(count),
      };
    }),
    
  // Exportar histórico de acessos para PDF
  exportarHistoricoPDF: protectedProcedure
    .input(z.object({
      membroId: z.number(),
      membroNome: z.string(),
      periodo: z.string().optional(), // '7d', '30d', 'todos'
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let query = db.select().from(membroAcessos)
        .where(eq(membroAcessos.membroId, input.membroId))
        .orderBy(desc(membroAcessos.dataHora));
        
      if (input.periodo) {
        const dataLimite = new Date();
        if (input.periodo === '7d') {
          dataLimite.setDate(dataLimite.getDate() - 7);
          query = db.select().from(membroAcessos)
            .where(and(
              eq(membroAcessos.membroId, input.membroId),
              sql`${membroAcessos.dataHora} >= ${dataLimite}`
            ))
            .orderBy(desc(membroAcessos.dataHora));
        } else if (input.periodo === '30d') {
          dataLimite.setDate(dataLimite.getDate() - 30);
          query = db.select().from(membroAcessos)
            .where(and(
              eq(membroAcessos.membroId, input.membroId),
              sql`${membroAcessos.dataHora} >= ${dataLimite}`
            ))
            .orderBy(desc(membroAcessos.dataHora));
        }
      }
      
      const acessos = await query;
      
      // Usar PDFKit para gerar o PDF
      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ margin: 50 });
      
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      
      // Cabeçalho
      doc.fontSize(18).text(`Histórico de Acessos - ${input.membroNome}`, { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: "center" });
      doc.moveDown(2);
      
      // Tabela
      const tableTop = 150;
      doc.font("Helvetica-Bold");
      
      const headers = ["Data/Hora", "IP", "Dispositivo", "Tipo", "Status"];
      const colWidths = [120, 100, 120, 80, 80];
      
      let x = 50;
      let y = tableTop;
      
      // Cabeçalho da tabela
      doc.fontSize(10);
      headers.forEach((header, i) => {
        doc.text(header, x, y, { width: colWidths[i], align: "left" });
        x += colWidths[i];
      });
      
      doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
      y += 25;
      
      doc.font("Helvetica");
      
      // Linhas
      let rowCount = 0;
      for (const acesso of acessos) {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        
        const data = new Date(acesso.dataHora).toLocaleString('pt-BR');
        const status = acesso.sucesso ? "Sucesso" : "Falha";
        
        const rowData = [
          data,
          acesso.ip || "-",
          `${acesso.dispositivo} - ${acesso.navegador}`,
          acesso.tipoAcesso === "login" ? "Login" : "Acesso",
          status
        ];
        
        // Fundo alternado
        if (rowCount % 2 === 0) {
          doc.fillColor("#F9FAFB").rect(50, y - 3, 495, 18).fill();
        }
        
        // Fundo vermelho para falhas
        if (!acesso.sucesso) {
          doc.fillColor("#FEE2E2").rect(50, y - 3, 495, 18).fill();
        }
        
        doc.fillColor("#374151").fontSize(8);
        x = 55;
        rowData.forEach((data, i) => {
          doc.text(data, x, y, { width: colWidths[i], align: "left" });
          x += colWidths[i];
        });
        
        y += 18;
        rowCount++;
      }
      
      // RodapÃ©
      doc.fontSize(8).fillColor("#9CA3AF");
      doc.text("App ManutenÃ§Ã£o - Sistema de GestÃ£o de ManutenÃ§Ã£o", 50, 780, { align: "center" });
      
      doc.end();
      
      // Aguardar finalizaÃ§Ã£o
      await new Promise<void>((resolve) => doc.on("end", resolve));
      
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString("base64");
      
      return {
        filename: `historico-acessos-${input.membroNome.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`,
        data: base64,
        mimeType: "application/pdf",
      };
    }),

  // Enviar compartilhamento por email
  enviarCompartilhamento: protectedProcedure
    .input(z.object({
      membroId: z.number(),
      email: z.string().email(),
      nome: z.string(),
      tipo: z.enum(["vistoria", "manutencao", "ocorrencia", "checklist", "antes_depois"]),
      itemId: z.number(),
      itemTitulo: z.string(),
      itemDescricao: z.string().optional(),
      mensagemPersonalizada: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const { sendEmail } = await import("../../_core/email");
        
        const getTipoLabel = (tipo: string) => {
          switch (tipo) {
            case "vistoria": return "Vistoria";
            case "manutencao": return "ManutenÃ§Ã£o";
            case "ocorrencia": return "OcorrÃªncia";
            case "checklist": return "Checklist";
            case "antes_depois": return "Antes e Depois";
            default: return "Item";
          }
        };
        
        const tipoLabel = getTipoLabel(input.tipo);
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #EA580C 0%, #F97316 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
                  ðŸ“‹ ${tipoLabel} Compartilhada
                </h1>
              </div>
              
              <!-- Content -->
              <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
                  OlÃ¡ <strong>${input.nome}</strong>,
                </p>
                
                <p style="color: #6B7280; font-size: 14px; margin: 0 0 24px 0;">
                  Uma ${tipoLabel.toLowerCase()} foi compartilhada com vocÃª:
                </p>
                
                <!-- Item Card -->
                <div style="background: #FFF7ED; border-left: 4px solid #EA580C; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                  <h2 style="color: #EA580C; margin: 0 0 8px 0; font-size: 18px;">
                    ${input.itemTitulo}
                  </h2>
                  ${input.itemDescricao ? `
                  <p style="color: #6B7280; margin: 0; font-size: 14px;">
                    ${input.itemDescricao}
                  </p>
                  ` : ''}
                </div>
                
                ${input.mensagemPersonalizada ? `
                <!-- Mensagem Personalizada -->
                <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                  <p style="color: #374151; margin: 0; font-size: 14px; font-style: italic;">
                    "ðŸ’¬ ${input.mensagemPersonalizada}"
                  </p>
                </div>
                ` : ''}
                
                <p style="color: #9CA3AF; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
                  Este email foi enviado automaticamente pelo App ManutenÃ§Ã£o.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="text-align: center; padding: 20px;">
                <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                  App ManutenÃ§Ã£o - Sistema de GestÃ£o de ManutenÃ§Ã£o
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        const result = await sendEmail({
          to: input.email,
          subject: `${tipoLabel} compartilhada: ${input.itemTitulo}`,
          html: htmlContent,
        });
        
        return {
          sucesso: result.success,
          membroId: input.membroId,
          destinatario: input.email,
          erro: result.error || null,
        };
      } catch (error) {
        return {
          sucesso: false,
          membroId: input.membroId,
          destinatario: input.email,
          erro: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    }),

  // ==================== COMPARTILHAMENTOS COM RASTREAMENTO ====================
  
  // Criar compartilhamento com token para rastreamento
  criarCompartilhamento: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      destinatarioId: z.number(),
      destinatarioNome: z.string(),
      destinatarioEmail: z.string().email().optional(),
      destinatarioTelefone: z.string().optional(),
      tipoItem: z.enum(["vistoria", "manutencao", "ocorrencia", "checklist", "antes_depois", "ordem_servico", "tarefa_simples"]),
      itemId: z.number(),
      itemProtocolo: z.string().optional(),
      itemTitulo: z.string(),
      canalEnvio: z.enum(["email", "whatsapp", "ambos"]).default("email"),
      mensagem: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      
      // Definir expiraÃ§Ã£o (7 dias)
      const expiraEm = new Date();
      expiraEm.setDate(expiraEm.getDate() + 7);
      
      const [result] = await db.insert(compartilhamentosEquipe).values({
        condominioId: input.condominioId,
        remetenteId: ctx.user?.id,
        remetenteNome: ctx.user?.name || "Sistema",
        destinatarioId: input.destinatarioId,
        destinatarioNome: input.destinatarioNome,
        destinatarioEmail: input.destinatarioEmail,
        destinatarioTelefone: input.destinatarioTelefone,
        tipoItem: input.tipoItem,
        itemId: input.itemId,
        itemProtocolo: input.itemProtocolo,
        itemTitulo: input.itemTitulo,
        token,
        canalEnvio: input.canalEnvio,
        mensagem: input.mensagem,
        expiraEm,
      }).returning();
      
      return {
        id: result.id,
        token,
        linkVisualizacao: `/compartilhado/${token}`,
      };
    }),

  // Enviar compartilhamento por email com link rastreÃ¡vel
  enviarCompartilhamentoRastreavel: protectedProcedure
    .input(z.object({
      compartilhamentoId: z.number(),
      baseUrl: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar compartilhamento
      const [compartilhamento] = await db.select().from(compartilhamentosEquipe)
        .where(eq(compartilhamentosEquipe.id, input.compartilhamentoId))
        .limit(1);
      
      if (!compartilhamento) throw new Error("Compartilhamento nÃ£o encontrado");
      if (!compartilhamento.destinatarioEmail) throw new Error("DestinatÃ¡rio nÃ£o tem email cadastrado");
      
      const getTipoLabel = (tipo: string) => {
        switch (tipo) {
          case "vistoria": return "Vistoria";
          case "manutencao": return "ManutenÃ§Ã£o";
          case "ocorrencia": return "OcorrÃªncia";
          case "checklist": return "Checklist";
          case "antes_depois": return "Antes e Depois";
          case "ordem_servico": return "Ordem de ServiÃ§o";
          case "tarefa_simples": return "Tarefa";
          default: return "Item";
        }
      };
      
      const tipoLabel = getTipoLabel(compartilhamento.tipoItem);
      const linkVisualizacao = `${input.baseUrl}/compartilhado/${compartilhamento.token}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #EA580C 0%, #F97316 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
                ðŸ“‹ ${tipoLabel} Compartilhada
              </h1>
            </div>
            
            <!-- Content -->
            <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
                OlÃ¡ <strong>${compartilhamento.destinatarioNome}</strong>,
              </p>
              
              <p style="color: #6B7280; font-size: 14px; margin: 0 0 24px 0;">
                <strong>${compartilhamento.remetenteNome}</strong> compartilhou uma ${tipoLabel.toLowerCase()} com vocÃª:
              </p>
              
              <!-- Item Card -->
              <div style="background: #FFF7ED; border-left: 4px solid #EA580C; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h2 style="color: #EA580C; margin: 0 0 8px 0; font-size: 18px;">
                  ${compartilhamento.itemTitulo}
                </h2>
                ${compartilhamento.itemProtocolo ? `
                <p style="color: #6B7280; margin: 0; font-size: 14px;">
                  Protocolo: ${compartilhamento.itemProtocolo}
                </p>
                ` : ''}
              </div>
              
              ${compartilhamento.mensagem ? `
              <!-- Mensagem Personalizada -->
              <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="color: #374151; margin: 0; font-size: 14px; font-style: italic;">
                  "ðŸ’¬ ${compartilhamento.mensagem}"
                </p>
              </div>
              ` : ''}
              
              <!-- BotÃ£o de VisualizaÃ§Ã£o -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${linkVisualizacao}" style="display: inline-block; background: linear-gradient(135deg, #EA580C 0%, #F97316 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ðŸ‘ï¸ Visualizar ${tipoLabel}
                </a>
              </div>
              
              <p style="color: #9CA3AF; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
                Este link expira em 7 dias. O remetente serÃ¡ notificado quando vocÃª visualizar.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 20px;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                App ManutenÃ§Ã£o - Sistema de GestÃ£o de ManutenÃ§Ã£o
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const { sendEmail } = await import("../../_core/email");
      const result = await sendEmail({
        to: compartilhamento.destinatarioEmail,
        subject: `${tipoLabel} compartilhada: ${compartilhamento.itemTitulo}`,
        html: htmlContent,
      });
      
      // Atualizar status de envio
      await db.update(compartilhamentosEquipe)
        .set({ emailEnviado: result.success })
        .where(eq(compartilhamentosEquipe.id, input.compartilhamentoId));
      
      return {
        sucesso: result.success,
        erro: result.error || null,
      };
    }),

  // Registar visualizaÃ§Ã£o de compartilhamento (chamado pela pÃ¡gina pÃºblica)
  registarVisualizacao: publicProcedure
    .input(z.object({
      token: z.string(),
      ip: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar compartilhamento pelo token
      const [compartilhamento] = await db.select().from(compartilhamentosEquipe)
        .where(and(
          eq(compartilhamentosEquipe.token, input.token),
          eq(compartilhamentosEquipe.ativo, true)
        ))
        .limit(1);
      
      if (!compartilhamento) {
        return { sucesso: false, erro: "Compartilhamento nÃ£o encontrado ou expirado" };
      }
      
      // Verificar se expirou
      if (compartilhamento.expiraEm && new Date(compartilhamento.expiraEm) < new Date()) {
        return { sucesso: false, erro: "Este link expirou" };
      }
      
      // Detectar dispositivo e navegador
      const ua = input.userAgent || "";
      let dispositivo = "Desktop";
      let navegador = "Desconhecido";
      let sistemaOperacional = "Desconhecido";
      
      if (/iPhone|iPad|iPod/i.test(ua)) {
        dispositivo = "iOS";
        sistemaOperacional = "iOS";
      } else if (/Android/i.test(ua)) {
        dispositivo = "Android";
        sistemaOperacional = "Android";
      } else if (/Windows/i.test(ua)) {
        sistemaOperacional = "Windows";
      } else if (/Mac/i.test(ua)) {
        sistemaOperacional = "macOS";
      } else if (/Linux/i.test(ua)) {
        sistemaOperacional = "Linux";
      }
      
      if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) navegador = "Chrome";
      else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) navegador = "Safari";
      else if (/Firefox/i.test(ua)) navegador = "Firefox";
      else if (/Edge/i.test(ua)) navegador = "Edge";
      else if (/Opera|OPR/i.test(ua)) navegador = "Opera";
      
      // Registar visualizaÃ§Ã£o
      const [visualizacao] = await db.insert(compartilhamentoVisualizacoes).values({
        compartilhamentoId: compartilhamento.id,
        ip: input.ip,
        userAgent: input.userAgent,
        dispositivo,
        navegador,
        sistemaOperacional,
      }).returning();
      
      // Criar notificaÃ§Ã£o para o remetente
      if (compartilhamento.remetenteId) {
        await db.insert(notificacoesVisualizacao).values({
          compartilhamentoId: compartilhamento.id,
          visualizacaoId: visualizacao.id,
          usuarioId: compartilhamento.remetenteId,
        });
        
        // Enviar email de notificaÃ§Ã£o ao remetente
        const [remetente] = await db.select().from(users)
          .where(eq(users.id, compartilhamento.remetenteId))
          .limit(1);
        
        if (remetente?.email) {
          const getTipoLabel = (tipo: string) => {
            switch (tipo) {
              case "vistoria": return "Vistoria";
              case "manutencao": return "ManutenÃ§Ã£o";
              case "ocorrencia": return "OcorrÃªncia";
              case "checklist": return "Checklist";
              case "antes_depois": return "Antes e Depois";
              case "ordem_servico": return "Ordem de ServiÃ§o";
              case "tarefa_simples": return "Tarefa";
              default: return "Item";
            }
          };
          
          const tipoLabel = getTipoLabel(compartilhamento.tipoItem);
          const dataVisualizacao = new Date().toLocaleString("pt-BR", { 
            dateStyle: "short", 
            timeStyle: "short" 
          });
          
          const htmlNotificacao = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
                    âœ… Compartilhamento Visualizado
                  </h1>
                </div>
                
                <!-- Content -->
                <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
                    OlÃ¡ <strong>${remetente.name || "UsuÃ¡rio"}</strong>,
                  </p>
                  
                  <p style="color: #6B7280; font-size: 14px; margin: 0 0 24px 0;">
                    <strong>${compartilhamento.destinatarioNome}</strong> visualizou a ${tipoLabel.toLowerCase()} que vocÃª compartilhou:
                  </p>
                  
                  <!-- Item Card -->
                  <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                    <h2 style="color: #059669; margin: 0 0 8px 0; font-size: 18px;">
                      ${compartilhamento.itemTitulo}
                    </h2>
                    <p style="color: #6B7280; margin: 0; font-size: 14px;">
                      Visualizado em: ${dataVisualizacao}
                    </p>
                    <p style="color: #6B7280; margin: 8px 0 0 0; font-size: 14px;">
                      Dispositivo: ${dispositivo} | Navegador: ${navegador}
                    </p>
                  </div>
                  
                  <p style="color: #9CA3AF; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
                    Este email foi enviado automaticamente pelo App ManutenÃ§Ã£o.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; padding: 20px;">
                  <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                    App ManutenÃ§Ã£o - Sistema de GestÃ£o de ManutenÃ§Ã£o
                  </p>
                </div>
              </div>
            </body>
            </html>
          `;
          
          const { sendEmail } = await import("../../_core/email");
          await sendEmail({
            to: remetente.email,
            subject: `âœ… ${compartilhamento.destinatarioNome} visualizou: ${compartilhamento.itemTitulo}`,
            html: htmlNotificacao,
          });
          
          // Atualizar notificaÃ§Ã£o como email enviado
          await db.update(notificacoesVisualizacao)
            .set({ emailEnviado: true, emailEnviadoEm: new Date() })
            .where(eq(notificacoesVisualizacao.visualizacaoId, visualizacao.id));
        }
      }
      
      return {
        sucesso: true,
        compartilhamento: {
          tipoItem: compartilhamento.tipoItem,
          itemId: compartilhamento.itemId,
          itemTitulo: compartilhamento.itemTitulo,
          itemProtocolo: compartilhamento.itemProtocolo,
          remetenteNome: compartilhamento.remetenteNome,
        },
      };
    }),

  // Listar compartilhamentos enviados pelo usuÃ¡rio
  listarCompartilhamentos: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      pagina: z.number().default(1),
      porPagina: z.number().default(20),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { compartilhamentos: [], total: 0 };
      
      const offset = (input.pagina - 1) * input.porPagina;
      
      const compartilhamentos = await db.select().from(compartilhamentosEquipe)
        .where(and(
          eq(compartilhamentosEquipe.condominioId, input.condominioId),
          eq(compartilhamentosEquipe.remetenteId, ctx.user!.id)
        ))
        .orderBy(desc(compartilhamentosEquipe.createdAt))
        .limit(input.porPagina)
        .offset(offset);
      
      // Buscar visualizaÃ§Ãµes para cada compartilhamento
      const compartilhamentosComVisualizacoes = await Promise.all(
        compartilhamentos.map(async (c) => {
          const visualizacoes = await db.select().from(compartilhamentoVisualizacoes)
            .where(eq(compartilhamentoVisualizacoes.compartilhamentoId, c.id))
            .orderBy(desc(compartilhamentoVisualizacoes.dataVisualizacao));
          
          return {
            ...c,
            visualizacoes,
            totalVisualizacoes: visualizacoes.length,
            primeiraVisualizacao: visualizacoes[visualizacoes.length - 1]?.dataVisualizacao || null,
            ultimaVisualizacao: visualizacoes[0]?.dataVisualizacao || null,
          };
        })
      );
      
      const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(compartilhamentosEquipe)
        .where(and(
          eq(compartilhamentosEquipe.condominioId, input.condominioId),
          eq(compartilhamentosEquipe.remetenteId, ctx.user!.id)
        ));
      
      return {
        compartilhamentos: compartilhamentosComVisualizacoes,
        total: Number(count),
      };
    }),

  // Listar notificaÃ§Ãµes de visualizaÃ§Ã£o nÃ£o lidas
  listarNotificacoesVisualizacao: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      
      const notificacoes = await db.select({
        notificacao: notificacoesVisualizacao,
        compartilhamento: compartilhamentosEquipe,
        visualizacao: compartilhamentoVisualizacoes,
      })
        .from(notificacoesVisualizacao)
        .innerJoin(compartilhamentosEquipe, eq(notificacoesVisualizacao.compartilhamentoId, compartilhamentosEquipe.id))
        .innerJoin(compartilhamentoVisualizacoes, eq(notificacoesVisualizacao.visualizacaoId, compartilhamentoVisualizacoes.id))
        .where(and(
          eq(notificacoesVisualizacao.usuarioId, ctx.user!.id),
          eq(notificacoesVisualizacao.lida, false)
        ))
        .orderBy(desc(notificacoesVisualizacao.createdAt))
        .limit(50);
      
      return notificacoes;
    }),

  // Marcar notificaÃ§Ã£o como lida
  marcarNotificacaoLida: protectedProcedure
    .input(z.object({ notificacaoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(notificacoesVisualizacao)
        .set({ lida: true, lidaEm: new Date() })
        .where(eq(notificacoesVisualizacao.id, input.notificacaoId));
      
      return { sucesso: true };
    }),

  // Marcar todas as notificaÃ§Ãµes como lidas
  marcarTodasNotificacoesLidas: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(notificacoesVisualizacao)
        .set({ lida: true, lidaEm: new Date() })
        .where(and(
          eq(notificacoesVisualizacao.usuarioId, ctx.user!.id),
          eq(notificacoesVisualizacao.lida, false)
        ));
      
      return { sucesso: true };
    }),

  // Exportar compartilhamentos para Excel
  exportarExcel: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar compartilhamentos
      const compartilhamentos = await db.select({
        compartilhamento: compartilhamentosEquipe,
        membro: membrosEquipe,
      })
        .from(compartilhamentosEquipe)
        .leftJoin(membrosEquipe, eq(compartilhamentosEquipe.destinatarioId, membrosEquipe.id))
        .where(eq(compartilhamentosEquipe.condominioId, input.condominioId))
        .orderBy(desc(compartilhamentosEquipe.createdAt));
      
      // Buscar visualizaÃ§Ãµes para cada compartilhamento
      const compartilhamentosComVisualizacoes = await Promise.all(
        compartilhamentos.map(async (c) => {
          const visualizacoes = await db.select()
            .from(compartilhamentoVisualizacoes)
            .where(eq(compartilhamentoVisualizacoes.compartilhamentoId, c.compartilhamento.id));
          return {
            ...c.compartilhamento,
            destinatarioNome: c.membro?.nome || "Desconhecido",
            destinatarioEmail: c.membro?.email,
            totalVisualizacoes: visualizacoes.length,
            primeiraVisualizacao: visualizacoes.length > 0 ? visualizacoes[0].dataVisualizacao : null,
            ultimaVisualizacao: visualizacoes.length > 0 ? visualizacoes[visualizacoes.length - 1].dataVisualizacao : null,
          };
        })
      );
      
      // Gerar Excel usando exceljs
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      const worksheet = workbook.addWorksheet("Compartilhamentos");
      
      // CabeÃ§alho
      worksheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Tipo", key: "tipo", width: 15 },
        { header: "Protocolo", key: "protocolo", width: 20 },
        { header: "TÃ­tulo", key: "titulo", width: 30 },
        { header: "DestinatÃ¡rio", key: "destinatario", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Canal", key: "canal", width: 12 },
        { header: "Data Envio", key: "dataEnvio", width: 18 },
        { header: "VisualizaÃ§Ãµes", key: "visualizacoes", width: 14 },
        { header: "Status", key: "status", width: 15 },
        { header: "Ãšltima VisualizaÃ§Ã£o", key: "ultimaVisualizacao", width: 18 },
      ];
      
      // Estilo do cabeÃ§alho
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF6B00" },
      };
      
      // Dados
      compartilhamentosComVisualizacoes.forEach((c, index) => {
        const row = worksheet.addRow({
          id: c.id,
          tipo: c.tipoItem === "vistoria" ? "Vistoria" : c.tipoItem === "manutencao" ? "ManutenÃ§Ã£o" : c.tipoItem === "ocorrencia" ? "OcorrÃªncia" : "Checklist",
          protocolo: c.itemProtocolo || "-",
          titulo: c.itemTitulo || "-",
          destinatario: c.destinatarioNome,
          email: c.destinatarioEmail || "-",
          canal: c.canalEnvio === "email" ? "Email" : c.canalEnvio === "whatsapp" ? "WhatsApp" : "Ambos",
          dataEnvio: new Date(c.createdAt).toLocaleString("pt-BR"),
          visualizacoes: c.totalVisualizacoes,
          status: c.totalVisualizacoes > 0 ? "Visualizado" : "Pendente",
          ultimaVisualizacao: c.ultimaVisualizacao ? new Date(c.ultimaVisualizacao).toLocaleString("pt-BR") : "-",
        });
        
        // Cor de fundo alternada
        if (index % 2 === 1) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F5F5" },
          };
        }
        
        // Cor para status
        const statusCell = row.getCell("status");
        if (c.totalVisualizacoes > 0) {
          statusCell.font = { color: { argb: "FF22C55E" } };
        } else {
          statusCell.font = { color: { argb: "FFFBBF24" } };
        }
      });
      
      // Bordas
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });
      
      // Gerar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        data: Buffer.from(buffer as ArrayBuffer).toString("base64"),
        filename: `compartilhamentos_${new Date().toISOString().split("T")[0]}.xlsx`,
      };
    }),

  // Exportar compartilhamentos para PDF
  exportarPdf: protectedProcedure
    .input(z.object({ condominioId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar compartilhamentos
      const compartilhamentos = await db.select({
        compartilhamento: compartilhamentosEquipe,
        membro: membrosEquipe,
      })
        .from(compartilhamentosEquipe)
        .leftJoin(membrosEquipe, eq(compartilhamentosEquipe.destinatarioId, membrosEquipe.id))
        .where(eq(compartilhamentosEquipe.condominioId, input.condominioId))
        .orderBy(desc(compartilhamentosEquipe.createdAt));
      
      // Buscar visualizaÃ§Ãµes para cada compartilhamento
      const compartilhamentosComVisualizacoes = await Promise.all(
        compartilhamentos.map(async (c) => {
          const visualizacoes = await db.select()
            .from(compartilhamentoVisualizacoes)
            .where(eq(compartilhamentoVisualizacoes.compartilhamentoId, c.compartilhamento.id));
          return {
            ...c.compartilhamento,
            destinatarioNome: c.membro?.nome || "Desconhecido",
            destinatarioEmail: c.membro?.email,
            totalVisualizacoes: visualizacoes.length,
          };
        })
      );
      
      // EstatÃ­sticas
      const totalEnviados = compartilhamentosComVisualizacoes.length;
      const totalVisualizados = compartilhamentosComVisualizacoes.filter(c => c.totalVisualizacoes > 0).length;
      const totalPendentes = totalEnviados - totalVisualizados;
      const taxaVisualizacao = totalEnviados > 0 ? Math.round((totalVisualizados / totalEnviados) * 100) : 0;
      
      // Gerar PDF
      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];
      
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      
      // CabeÃ§alho
      doc.fontSize(20).fillColor("#FF6B00").text("RelatÃ³rio de Compartilhamentos", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#666666").text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, { align: "center" });
      doc.moveDown(1.5);
      
      // EstatÃ­sticas
      doc.fontSize(14).fillColor("#333333").text("Resumo", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#444444");
      doc.text(`Total Enviados: ${totalEnviados}`);
      doc.text(`Visualizados: ${totalVisualizados}`);
      doc.text(`Pendentes: ${totalPendentes}`);
      doc.text(`Taxa de VisualizaÃ§Ã£o: ${taxaVisualizacao}%`);
      doc.moveDown(1.5);
      
      // Tabela de compartilhamentos
      doc.fontSize(14).fillColor("#333333").text("Lista de Compartilhamentos", { underline: true });
      doc.moveDown(0.5);
      
      // CabeÃ§alho da tabela
      const tableTop = doc.y;
      const colWidths = [80, 120, 100, 80, 80, 60];
      const headers = ["Tipo", "DestinatÃ¡rio", "Protocolo", "Canal", "Data", "Status"];
      
      doc.fontSize(9).fillColor("#FFFFFF");
      doc.rect(40, tableTop, 515, 18).fill("#FF6B00");
      let xPos = 45;
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop + 5, { width: colWidths[i], align: "left" });
        xPos += colWidths[i];
      });
      
      // Linhas da tabela
      let yPos = tableTop + 20;
      doc.fillColor("#333333");
      
      compartilhamentosComVisualizacoes.slice(0, 30).forEach((c, index) => {
        if (yPos > 750) {
          doc.addPage();
          yPos = 50;
        }
        
        // Fundo alternado
        if (index % 2 === 1) {
          doc.rect(40, yPos - 2, 515, 16).fill("#F5F5F5");
          doc.fillColor("#333333");
        }
        
        xPos = 45;
        const tipo = c.tipoItem === "vistoria" ? "Vistoria" : c.tipoItem === "manutencao" ? "ManutenÃ§Ã£o" : c.tipoItem === "ocorrencia" ? "OcorrÃªncia" : "Checklist";
        const canal = c.canalEnvio === "email" ? "Email" : c.canalEnvio === "whatsapp" ? "WhatsApp" : "Ambos";
        const data = new Date(c.createdAt).toLocaleDateString("pt-BR");
        const status = c.totalVisualizacoes > 0 ? "Visualizado" : "Pendente";
        
        doc.fontSize(8);
        doc.text(tipo, xPos, yPos, { width: colWidths[0], align: "left" });
        xPos += colWidths[0];
        doc.text(c.destinatarioNome.substring(0, 20), xPos, yPos, { width: colWidths[1], align: "left" });
        xPos += colWidths[1];
        doc.text(c.itemProtocolo?.substring(0, 15) || "-", xPos, yPos, { width: colWidths[2], align: "left" });
        xPos += colWidths[2];
        doc.text(canal, xPos, yPos, { width: colWidths[3], align: "left" });
        xPos += colWidths[3];
        doc.text(data, xPos, yPos, { width: colWidths[4], align: "left" });
        xPos += colWidths[4];
        
        // Status com cor
        doc.fillColor(c.totalVisualizacoes > 0 ? "#22C55E" : "#FBBF24");
        doc.text(status, xPos, yPos, { width: colWidths[5], align: "left" });
        doc.fillColor("#333333");
        
        yPos += 16;
      });
      
      if (compartilhamentosComVisualizacoes.length > 30) {
        doc.moveDown(1);
        doc.fontSize(9).fillColor("#666666").text(`... e mais ${compartilhamentosComVisualizacoes.length - 30} compartilhamentos`, { align: "center" });
      }
      
      doc.end();
      
      return new Promise<{ data: string; filename: string }>((resolve) => {
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve({
            data: pdfBuffer.toString("base64"),
            filename: `compartilhamentos_${new Date().toISOString().split("T")[0]}.pdf`,
          });
        });
      });
    }),

  // Exportar histórico de acessos para Excel
  exportarHistoricoExcel: protectedProcedure
    .input(z.object({
      membroId: z.number(),
      membroNome: z.string(),
      periodo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let query = db.select().from(membroAcessos)
        .where(eq(membroAcessos.membroId, input.membroId))
        .orderBy(desc(membroAcessos.dataHora));

       if (input.periodo) {
        const dataLimite = new Date();
        if (input.periodo === '7d') {
          dataLimite.setDate(dataLimite.getDate() - 7);
          query = db.select().from(membroAcessos)
            .where(and(
              eq(membroAcessos.membroId, input.membroId),
              sql`${membroAcessos.dataHora} >= ${dataLimite}`
            ))
            .orderBy(desc(membroAcessos.dataHora));
        } else if (input.periodo === '30d') {
          dataLimite.setDate(dataLimite.getDate() - 30);
          query = db.select().from(membroAcessos)
            .where(and(
              eq(membroAcessos.membroId, input.membroId),
              sql`${membroAcessos.dataHora} >= ${dataLimite}`
            ))
            .orderBy(desc(membroAcessos.dataHora));
        }
      }

      const acessos = await query;

      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      const worksheet = workbook.addWorksheet("Acessos");

      worksheet.columns = [
        { header: "Data/Hora", key: "data", width: 20 },
        { header: "IP", key: "ip", width: 15 },
        { header: "Dispositivo", key: "dispositivo", width: 20 },
        { header: "Navegador", key: "navegador", width: 15 },
        { header: "Tipo", key: "tipo", width: 10 },
        { header: "Status", key: "status", width: 10 },
      ];

      acessos.forEach((a) => {
        worksheet.addRow({
            data: new Date(a.dataHora).toLocaleString('pt-BR'),
            ip: a.ip || "-",
            dispositivo: a.dispositivo,
            navegador: a.navegador,
            tipo: a.tipoAcesso,
            status: a.sucesso ? "Sucesso" : "Falha"
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return {
        data: Buffer.from(buffer as ArrayBuffer).toString("base64"),
        filename: `historico_acessos_${new Date().toISOString().split("T")[0]}.xlsx`,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  solicitarRecuperacaoSenha: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false, message: "Erro interno" };

        const [membro] = await db.select().from(membrosEquipe).where(eq(membrosEquipe.email, input.email)).limit(1);
        if (!membro) return { success: true }; 

        const crypto = await import("crypto");
        const token = crypto.randomBytes(32).toString("hex");
        const expira = new Date(Date.now() + 3600000); // 1h

        await db.update(membrosEquipe).set({
            resetToken: token,
            resetTokenExpira: expira
        }).where(eq(membrosEquipe.id, membro.id));

        // Enviar email com link de recuperação
        try {
            const { sendEmail } = await import("../../_core/email");
            const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || "https://app.appmanutencao.com.br";
            const resetLink = `${baseUrl}/recuperar-senha?token=${token}`;
            
            await sendEmail({
                to: input.email,
                subject: "Recuperação de Senha - App Manutenção",
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset="utf-8"></head>
                    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;">
                        <div style="max-width:600px;margin:0 auto;padding:20px;">
                            <div style="background:linear-gradient(135deg,#EA580C 0%,#F97316 100%);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
                                <h1 style="color:white;margin:0;font-size:24px;">🔐 Recuperação de Senha</h1>
                            </div>
                            <div style="background:white;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                                <p style="color:#374151;font-size:16px;">Olá <strong>${membro.nome}</strong>,</p>
                                <p style="color:#374151;font-size:16px;">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
                                <div style="text-align:center;margin:32px 0;">
                                    <a href="${resetLink}" style="background:linear-gradient(135deg,#EA580C,#F97316);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Redefinir Senha</a>
                                </div>
                                <p style="color:#6B7280;font-size:14px;">Este link é válido por <strong>1 hora</strong>. Se você não solicitou a recuperação de senha, ignore este email.</p>
                                <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;">
                                <p style="color:#9CA3AF;font-size:12px;text-align:center;">App Manutenção - Sistema de Gestão Condominial</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
            });
        } catch (emailError) {
            console.error("[Equipe] Erro ao enviar email de recuperação:", emailError);
        }

        return { success: true };
    }),

  validarTokenRecuperacao: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { valid: false, message: "Erro de banco de dados" };
        const [membro] = await db.select().from(membrosEquipe)
            .where(and(
                eq(membrosEquipe.resetToken, input.token),
                sql`${membrosEquipe.resetTokenExpira} > NOW()`
            )).limit(1);
        
        if (!membro) return { valid: false, message: "Link inválido ou expirado" };
        return { valid: true, nome: membro.nome, email: membro.email };
    }),

  redefinirSenha: publicProcedure
    .input(z.object({ token: z.string(), novaSenha: z.string().min(6) }))
    .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB Error");
         const [membro] = await db.select().from(membrosEquipe)
            .where(and(
                eq(membrosEquipe.resetToken, input.token),
                sql`${membrosEquipe.resetTokenExpira} > NOW()`
            )).limit(1);
        
        if (!membro) throw new Error("Token inválido ou expirado");

        const bcrypt = await import("bcryptjs");
        const hash = await bcrypt.hash(input.novaSenha, 10);

        await db.update(membrosEquipe).set({
            senha: hash,
            resetToken: null,
            resetTokenExpira: null
        }).where(eq(membrosEquipe.id, membro.id));

        return { success: true };
    }),
});

