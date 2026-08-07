import { moduloUserProcedure, router } from "../../_core/trpc";
import { direto, escopoPorRegistro, via } from "../../_core/escopoRegistro";
import { z } from "zod";
import { getDb } from "../../db";
import { eventos, revistas, moradores, notificacoes } from "../../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// Exige o modulo "eventos" habilitado. Estas entidades pendem da revista,
// entao o tenant e resolvido pela revista dona do registro.
const eventoProcedure = moduloUserProcedure(
  "eventos",
  escopoPorRegistro(
    {
      revistaId: direto(revistas),
      id: via(eventos, "revistaId", revistas),
      eventoId: via(eventos, "revistaId", revistas),
    },
    {},
  ),
);

export const eventoRouter = router({
  list: eventoProcedure
    .input(z.object({ revistaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(eventos)
        .where(eq(eventos.revistaId, input.revistaId))
        .orderBy(desc(eventos.dataEvento));
    }),

  create: eventoProcedure
    .input(z.object({
      revistaId: z.number(),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      dataEvento: z.date().optional(),
      horaInicio: z.string().optional(),
      horaFim: z.string().optional(),
      local: z.string().optional(),
      imagemUrl: z.string().optional(),
      tipo: z.enum(["agendado", "realizado"]).optional(),
      nomeResponsavel: z.string().optional(),
      whatsappResponsavel: z.string().optional(),
      lembreteAntecedencia: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(eventos).values({
        ...input,
        lembreteEnviado: false,
      }).returning();
      return { id: Number(result.id) };
    }),

  update: eventoProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1).optional(),
      descricao: z.string().optional(),
      dataEvento: z.date().optional(),
      horaInicio: z.string().optional(),
      horaFim: z.string().optional(),
      local: z.string().optional(),
      imagemUrl: z.string().optional(),
      tipo: z.enum(["agendado", "realizado"]).optional(),
      nomeResponsavel: z.string().optional(),
      whatsappResponsavel: z.string().optional(),
      lembreteAntecedencia: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      // Se a data do evento mudou, resetar o lembrete
      if (data.dataEvento) {
        (data as any).lembreteEnviado = false;
      }
      await db.update(eventos).set(data).where(eq(eventos.id, id));
      return { success: true };
    }),

  delete: eventoProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(eventos).where(eq(eventos.id, input.id));
      return { success: true };
    }),

  // Buscar eventos que precisam de lembrete
  getPendingReminders: eventoProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      
      const now = new Date();
      const allEventos = await db.select().from(eventos)
        .where(and(
          eq(eventos.lembreteEnviado, false),
          eq(eventos.tipo, "agendado")
        ));
      
      // Filtrar eventos cujo lembrete deve ser enviado
      return allEventos.filter(evento => {
        if (!evento.dataEvento || !evento.lembreteAntecedencia) return false;
        const dataEvento = new Date(evento.dataEvento);
        const diasAntecedencia = evento.lembreteAntecedencia;
        const dataLembrete = new Date(dataEvento);
        dataLembrete.setDate(dataLembrete.getDate() - diasAntecedencia);
        return now >= dataLembrete && now < dataEvento;
      });
    }),

  // Enviar lembretes para um evento
  sendReminder: eventoProcedure
    .input(z.object({ eventoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar o evento
      const [evento] = await db.select().from(eventos)
        .where(eq(eventos.id, input.eventoId));
      
      if (!evento) throw new Error("Evento não encontrado");
      if (evento.lembreteEnviado) return { success: true, message: "Lembrete já enviado" };
      
      // Buscar a revista para obter o condomínio
      const [revista] = await db.select().from(revistas)
        .where(eq(revistas.id, evento.revistaId));
      
      if (!revista) throw new Error("Revista não encontrada");
      
      // Buscar todos os moradores do condomínio
      const moradoresList = await db.select().from(moradores)
        .where(eq(moradores.condominioId, revista.condominioId));
      
      // Criar notificações para moradores vinculados a utilizadores
      const dataFormatada = evento.dataEvento 
        ? new Date(evento.dataEvento).toLocaleDateString('pt-BR')
        : 'data a definir';
      
      for (const morador of moradoresList) {
        if (morador.usuarioId) {
          await db.insert(notificacoes).values({
            userId: morador.usuarioId,
            tipo: "evento",
            titulo: `Lembrete: ${evento.titulo}`,
            mensagem: `O evento "${evento.titulo}" acontecerá em ${dataFormatada}${evento.local ? ` no ${evento.local}` : ''}.`,
            link: `/dashboard/eventos`,
          }).returning();
        }
      }
      
      // Marcar lembrete como enviado
      await db.update(eventos)
        .set({ lembreteEnviado: true })
        .where(eq(eventos.id, input.eventoId));
      
      return { 
        success: true, 
        message: `Lembrete enviado para ${moradoresList.filter(m => m.usuarioId).length} moradores` 
      };
    }),

  // Enviar todos os lembretes pendentes
  sendAllPendingReminders: eventoProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const now = new Date();
      const allEventos = await db.select().from(eventos)
        .where(and(
          eq(eventos.lembreteEnviado, false),
          eq(eventos.tipo, "agendado")
        ));
      
      let enviados = 0;
      
      for (const evento of allEventos) {
        if (!evento.dataEvento || !evento.lembreteAntecedencia) continue;
        
        const dataEvento = new Date(evento.dataEvento);
        const diasAntecedencia = evento.lembreteAntecedencia;
        const dataLembrete = new Date(dataEvento);
        dataLembrete.setDate(dataLembrete.getDate() - diasAntecedencia);
        
        if (now >= dataLembrete && now < dataEvento) {
          // Buscar a revista para obter o condomínio
          const [revista] = await db.select().from(revistas)
            .where(eq(revistas.id, evento.revistaId));
          
          if (!revista) continue;
          
          // Buscar todos os moradores do condomínio
          const moradoresList = await db.select().from(moradores)
            .where(eq(moradores.condominioId, revista.condominioId));
          
          const dataFormatada = new Date(evento.dataEvento).toLocaleDateString('pt-BR');
          
          for (const morador of moradoresList) {
            if (morador.usuarioId) {
              await db.insert(notificacoes).values({
                userId: morador.usuarioId,
                tipo: "evento",
                titulo: `Lembrete: ${evento.titulo}`,
                mensagem: `O evento "${evento.titulo}" acontecerá em ${dataFormatada}${evento.local ? ` no ${evento.local}` : ''}.`,
                link: `/dashboard/eventos`,
              }).returning();
            }
          }
          
          // Marcar lembrete como enviado
          await db.update(eventos)
            .set({ lembreteEnviado: true })
            .where(eq(eventos.id, evento.id));
          
          enviados++;
        }
      }
      
      return { success: true, enviados };
    }),
});
