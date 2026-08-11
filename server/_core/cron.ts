import { Express, Request, Response } from "express";
import { getDb } from "../db";
import { vencimentos, vencimentoAlertas, vencimentoEmails, vencimentoNotificacoes, condominios, membrosEquipe } from "../../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { sendBulkEmail } from "./email";

// Chave secreta para autenticar chamadas do cron job
const CRON_SECRET = process.env.CRON_SECRET;
const EM_PRODUCAO = process.env.NODE_ENV === 'production';

// Sem chave em produção, o disparo de alertas fica desligado — antes daqui isto
// era um `throw` na importação, e uma variável esquecida no servidor derrubava o
// sistema inteiro no boot em vez de desligar só os alertas.
if (!CRON_SECRET && EM_PRODUCAO) {
  console.error(
    '[CRON] CRON_SECRET ausente: o processamento de alertas de vencimento fica ' +
      'desligado até a variável ser definida no servidor.',
  );
}

const DEV_CRON_SECRET = 'dev-cron-secret'; // Fallback apenas para desenvolvimento local

export function registerCronRoutes(app: Express) {
  // Endpoint para processar alertas de vencimentos automaticamente
  // Este endpoint é chamado por um cron job externo
  app.get("/api/cron/processar-alertas", async (req: Request, res: Response) => {
    try {
      // Verificar autenticação via header ou query param
      const authHeader = req.headers["x-cron-secret"] as string;
      const querySecret = req.query.secret as string;

      if (!CRON_SECRET && EM_PRODUCAO) {
        return res.status(503).json({
          error: "Processamento de alertas desligado: CRON_SECRET não configurado.",
        });
      }

      const effectiveSecret = CRON_SECRET || DEV_CRON_SECRET;

      if (authHeader !== effectiveSecret && querySecret !== effectiveSecret) {
        console.log("[CRON] Tentativa de acesso não autorizada");
        return res.status(401).json({ error: "Não autorizado" });
      }
      
      console.log("[CRON] Iniciando processamento de alertas de vencimentos...");
      
      const db = await getDb();
      if (!db) {
        console.error("[CRON] Database não disponível");
        return res.status(500).json({ error: "Database não disponível" });
      }
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      // Buscar todos os condomínios ativos
      const todosCondominios = await db.select().from(condominios);
      
      let totalEnviados = 0;
      let totalErros = 0;
      const resultados: { condominioId: number; nome: string; enviados: number; erros: number }[] = [];
      
      for (const condominio of todosCondominios) {
        try {
          // Buscar alertas pendentes para este condomínio
          const alertas = await db.select({
            alerta: vencimentoAlertas,
            vencimento: vencimentos,
          })
            .from(vencimentoAlertas)
            .innerJoin(vencimentos, eq(vencimentoAlertas.vencimentoId, vencimentos.id))
            .where(and(
              eq(vencimentoAlertas.ativo, true),
              eq(vencimentoAlertas.enviado, false),
              eq(vencimentos.status, 'ativo'),
              eq(vencimentos.condominioId, condominio.id)
            ));
          
          // Filtrar alertas que devem ser enviados hoje
          const diasAntecedencia: Record<string, number> = {
            'na_data': 0,
            'um_dia_antes': 1,
            'uma_semana_antes': 7,
            'quinze_dias_antes': 15,
            'um_mes_antes': 30,
          };
          
          const alertasParaEnviar = alertas.filter(({ alerta, vencimento }) => {
            const dataVencimento = new Date(vencimento.dataVencimento);
            dataVencimento.setHours(0, 0, 0, 0);
            
            const diasAntes = diasAntecedencia[alerta.tipoAlerta] || 0;
            const dataAlerta = new Date(dataVencimento);
            dataAlerta.setDate(dataAlerta.getDate() - diasAntes);
            
            return dataAlerta <= hoje;
          });
          
          if (alertasParaEnviar.length === 0) {
            resultados.push({ condominioId: condominio.id, nome: condominio.nome, enviados: 0, erros: 0 });
            continue;
          }
          
          // Obter e-mails da tabela vencimentoEmails
          const emailsVencimento = await db.select().from(vencimentoEmails)
            .where(and(
              eq(vencimentoEmails.condominioId, condominio.id),
              eq(vencimentoEmails.ativo, true)
            ));
          
          // Obter e-mails dos membros da equipe cadastrados no sistema
          const membrosComEmail = await db.select({
            email: membrosEquipe.email,
            nome: membrosEquipe.nome,
          }).from(membrosEquipe)
            .where(and(
              eq(membrosEquipe.condominioId, condominio.id),
              eq(membrosEquipe.ativo, true),
              isNotNull(membrosEquipe.email)
            ));
          
          // Combinar e-mails (sem duplicatas)
          const emailsSet = new Set<string>();
          emailsVencimento.forEach(e => emailsSet.add(e.email.toLowerCase()));
          membrosComEmail.forEach(m => {
            if (m.email) emailsSet.add(m.email.toLowerCase());
          });
          
          const todosEmails = Array.from(emailsSet);
          
          if (todosEmails.length === 0) {
            console.log(`[CRON] Condomínio ${condominio.nome}: Nenhum e-mail configurado`);
            resultados.push({ condominioId: condominio.id, nome: condominio.nome, enviados: 0, erros: 0 });
            continue;
          }
          
          console.log(`[CRON] Condomínio ${condominio.nome}: ${todosEmails.length} destinatários (${emailsVencimento.length} config + ${membrosComEmail.filter(m => m.email).length} membros)`);
          
          let enviados = 0;
          let erros = 0;
          
          for (const { alerta, vencimento } of alertasParaEnviar) {
            try {
              const dataVenc = new Date(vencimento.dataVencimento);
              const diffTime = dataVenc.getTime() - hoje.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              const tipoLabel = vencimento.tipo === 'contrato' ? 'Contrato' : vencimento.tipo === 'servico' ? 'Serviço' : 'Manutenção';
              const alertaLabel: Record<string, string> = {
                'na_data': 'VENCE HOJE',
                'um_dia_antes': 'Vence amanhã',
                'uma_semana_antes': 'Vence em 1 semana',
                'quinze_dias_antes': 'Vence em 15 dias',
                'um_mes_antes': 'Vence em 1 mês',
              };
              const statusLabel = diffDays < 0 ? `VENCIDO há ${Math.abs(diffDays)} dias` : alertaLabel[alerta.tipoAlerta] || `vence em ${diffDays} dias`;
              
              const assunto = `[⚠️ Alerta de Vencimento] ${tipoLabel}: ${vencimento.titulo} - ${statusLabel}`;
              const conteudo = `
Olá,

Este é um alerta automático sobre o seguinte vencimento:

📄 Título: ${vencimento.titulo}
📌 Tipo: ${tipoLabel}
📅 Data de Vencimento: ${dataVenc.toLocaleDateString('pt-BR')}
⏰ Status: ${statusLabel}
${vencimento.fornecedor ? `🏢 Fornecedor: ${vencimento.fornecedor}` : ''}
${vencimento.descricao ? `\n📝 Descrição: ${vencimento.descricao}` : ''}
${vencimento.observacoes ? `\n💬 Observações: ${vencimento.observacoes}` : ''}

---
Este e-mail foi enviado automaticamente pelo Sistema de Gestão.
Para gerenciar suas notificações, acesse a Agenda de Vencimentos no painel.
              `.trim();
              
              // Enviar e-mail para todos os destinatários (membros + emails configurados)
              await sendBulkEmail(todosEmails, assunto, { text: conteudo });
              
              // Marcar alerta como enviado
              await db.update(vencimentoAlertas)
                .set({ enviado: true, dataEnvio: new Date() })
                .where(eq(vencimentoAlertas.id, alerta.id));
              
              // Registrar notificação para cada destinatário
              for (const email of todosEmails) {
                await db.insert(vencimentoNotificacoes).values({
                  vencimentoId: vencimento.id,
                  alertaId: alerta.id,
                  emailDestinatario: email,
                  assunto,
                  conteudo,
                  status: 'enviado',
                });
              }
              
              enviados++;
              totalEnviados++;
              console.log(`[CRON] Alerta enviado: ${vencimento.titulo} (${tipoLabel})`);
            } catch (error) {
              erros++;
              totalErros++;
              console.error(`[CRON] Erro ao enviar alerta para ${vencimento.titulo}:`, error);
            }
          }
          
          resultados.push({ condominioId: condominio.id, nome: condominio.nome, enviados, erros });
        } catch (error) {
          console.error(`[CRON] Erro ao processar condomínio ${condominio.nome}:`, error);
          totalErros++;
        }
      }
      
      console.log(`[CRON] Processamento concluído: ${totalEnviados} alertas enviados, ${totalErros} erros`);
      
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        totalEnviados,
        totalErros,
        condominiosProcessados: todosCondominios.length,
        resultados,
      });
    } catch (error) {
      console.error("[CRON] Erro geral no processamento de alertas:", error);
      return res.status(500).json({ 
        error: "Erro ao processar alertas", 
        message: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });
  
  // Endpoint de health check para o cron
  app.get("/api/cron/health", (req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "cron-alertas-vencimentos"
    });
  });
}
