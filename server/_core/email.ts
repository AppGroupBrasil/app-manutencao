/**
 * Email Service - Resend API (principal) com fallback SMTP
 */

import { Resend } from 'resend';

// Inicializar cliente Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Verifica se o serviço de email está configurado
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Envia um email via Resend API
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  if (!resend) {
    console.warn('[Email] Resend API Key não configurada. Email não enviado:', options.subject);
    return {
      success: false,
      error: 'Resend API Key não configurada',
    };
  }

  try {
    const defaultFromName = process.env.SMTP_FROM_NAME || 'App Manutenção';
    const defaultFrom = process.env.SMTP_FROM_EMAIL || 'no-reply@appmanutencao.com.br';

    const fromAddress = options.from || `${defaultFromName} <${defaultFrom}>`;

    const emailPayload: any = {
      from: fromAddress,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
    };

    if (options.text) emailPayload.text = options.text;
    if (options.html) emailPayload.html = options.html;
    if (options.replyTo) emailPayload.replyTo = options.replyTo;

    const result = await resend.emails.send(emailPayload);

    if (result.error) {
      console.error('[Email] Erro ao enviar:', result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    console.log('[Email] Enviado com sucesso:', result.data?.id);
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Email] Erro ao enviar:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Testa a conexão com Resend
 */
export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: 'Resend API Key não configurada',
    };
  }

  try {
    // Tenta enviar um email de teste para o endereço de teste do Resend
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'delivered@resend.dev',
      subject: 'Teste de Conexão',
      html: '<p>Teste de conexão com Resend</p>',
    });

    if (result.error) {
      console.error('[Email] Erro na verificação Resend:', result.error.message);
      return {
        success: false,
        error: result.error.message,
      };
    }

    console.log('[Email] Conexão Resend verificada com sucesso');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Email] Erro na verificação Resend:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Envia email de notificação para múltiplos destinatários
 */
export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  content: { text?: string; html?: string },
  options?: { from?: string; replyTo?: string }
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Enviar em lotes de 50 para evitar limites
  const batchSize = 50;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    for (const recipient of batch) {
      const result = await sendEmail({
        to: recipient,
        subject,
        text: content.text,
        html: content.html,
        from: options?.from,
        replyTo: options?.replyTo,
      });

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`${recipient}: ${result.error}`);
      }
    }

    // Pequena pausa entre lotes para respeitar rate limits
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Envia email de alerta de vencimento com template HTML bonito
 */
export async function sendAlertaVencimentoEmail(params: {
  destinatarios: string[];
  titulo: string;
  tipo: string;
  dataVencimento: Date;
  diasRestantes: number;
  descricao?: string;
  organizacao?: string;
  fornecedor?: string;
}): Promise<EmailResult> {
  const { destinatarios, titulo, tipo, dataVencimento, diasRestantes, descricao, organizacao, fornecedor } = params;

  const dataFormatada = dataVencimento.toLocaleDateString('pt-BR');

  // Determina a cor e urgência baseado nos dias restantes
  let urgencia = 'normal';
  let corUrgencia = '#f97316'; // laranja
  if (diasRestantes <= 0) {
    urgencia = 'VENCIDO';
    corUrgencia = '#dc2626'; // vermelho
  } else if (diasRestantes <= 7) {
    urgencia = 'URGENTE';
    corUrgencia = '#dc2626'; // vermelho
  } else if (diasRestantes <= 15) {
    urgencia = 'ATENÇÃO';
    corUrgencia = '#f59e0b'; // amarelo
  }

  const subject = diasRestantes <= 0
    ? `🚨 VENCIDO: ${titulo}`
    : `⚠️ Alerta de Vencimento: ${titulo} (${diasRestantes} dias)`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${corUrgencia} 0%, #ea580c 100%); padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">
          ${diasRestantes <= 0 ? '🚨' : '⚠️'} Alerta de Vencimento
        </h1>
      </div>

      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <div style="display: inline-block; background: ${corUrgencia}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 15px;">
            ${urgencia}
          </div>

          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">
            ${titulo}
          </h2>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">Tipo:</td>
              <td style="padding: 8px 0; font-weight: 500;">${tipo}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Data de Vencimento:</td>
              <td style="padding: 8px 0; font-weight: 500;">${dataFormatada}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Dias Restantes:</td>
              <td style="padding: 8px 0; font-weight: bold; color: ${corUrgencia};">
                ${diasRestantes <= 0 ? 'VENCIDO' : `${diasRestantes} dias`}
              </td>
            </tr>
            ${organizacao ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Organização:</td>
              <td style="padding: 8px 0;">${organizacao}</td>
            </tr>
            ` : ''}
            ${fornecedor ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Fornecedor:</td>
              <td style="padding: 8px 0;">${fornecedor}</td>
            </tr>
            ` : ''}
          </table>

          ${descricao ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Descrição:</p>
            <p style="margin: 0; color: #374151;">${descricao}</p>
          </div>
          ` : ''}
        </div>

        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
          Este email foi enviado automaticamente pelo sistema App Manutenção.
        </p>
      </div>
    </body>
    </html>
  `;

  // Enviar para todos os destinatários
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const recipient of destinatarios) {
    const result = await sendEmail({
      to: recipient,
      subject,
      html,
    });

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(`${recipient}: ${result.error}`);
    }
  }

  // Retornar resultado geral
  if (results.failed === 0) {
    return {
      success: true,
      messageId: `${results.sent} emails enviados`,
    };
  } else if (results.sent > 0) {
    return {
      success: true,
      messageId: `${results.sent} enviados, ${results.failed} falharam`,
      error: results.errors.join('; '),
    };
  } else {
    return {
      success: false,
      error: `Todos falharam: ${results.errors.join('; ')}`,
    };
  }
}

/**
 * Templates de email para notificações
 */
export const emailTemplates = {
  compartilhamentoTimeline: (params: { nomeDestinatario: string; nomeRemetente: string; titulo: string; protocolo: string; linkVisualizacao: string }) => {
    const { nomeDestinatario, nomeRemetente, titulo, protocolo, linkVisualizacao } = params;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Timeline Compartilhada</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Protocolo: ${protocolo}</p>
        </div>
        <div style="background: white; padding: 25px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #4b5563; margin: 0 0 15px 0;">Olá <strong>${nomeDestinatario}</strong>,</p>
          <p style="color: #4b5563; margin: 0 0 20px 0;"><strong>${nomeRemetente}</strong> compartilhou uma timeline com você:</p>
          <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 0 0 25px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #c2410c; margin: 0 0 5px 0; font-size: 16px;">${titulo}</h3>
            <p style="color: #9a3412; margin: 0; font-size: 13px;">Protocolo: ${protocolo}</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${linkVisualizacao}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">Visualizar Timeline</a>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin: 25px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Este email foi enviado automaticamente pelo sistema App Manutenção.
          </p>
        </div>
      </body>
      </html>
    `;
  },

  notificacao: (params: { condominioNome: string; titulo: string; mensagem: string }) => {
    const { condominioNome, titulo, mensagem } = params;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${condominioNome}</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">${titulo}</h2>
          <div style="background: white; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${mensagem}</div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            Este email foi enviado automaticamente pelo sistema App Manutenção.
          </p>
        </div>
      </body>
      </html>
    `;
    
    return {
      subject: `${condominioNome} - ${titulo}`,
      html,
      text: `${condominioNome}\n\n${titulo}\n\n${mensagem}`,
    };
  },

  notificacaoTimeline: (params: {
    nomeDestinatario: string;
    tipoEvento: string;
    titulo: string;
    protocolo: string;
    statusAnterior?: string;
    statusNovo?: string;
    descricaoEvento?: string;
    linkVisualizacao: string;
    nomeAlterador?: string;
  }) => {
    const { nomeDestinatario, tipoEvento, titulo, protocolo, statusAnterior, statusNovo, descricaoEvento, linkVisualizacao, nomeAlterador } = params;
    
    const tipoEventoLabel: Record<string, string> = {
      mudanca_status: 'Mudança de Status',
      atualizacao: 'Atualização',
      nova_imagem: 'Nova Imagem Adicionada',
      comentario: 'Novo Comentário',
      compartilhamento: 'Compartilhamento',
      criacao: 'Timeline Criada',
      finalizacao: 'Timeline Finalizada',
    };
    
    const tipoLabel = tipoEventoLabel[tipoEvento] || tipoEvento;
    
    const corEvento: Record<string, string> = {
      mudanca_status: '#3b82f6',
      atualizacao: '#f97316',
      nova_imagem: '#10b981',
      comentario: '#8b5cf6',
      compartilhamento: '#06b6d4',
      criacao: '#22c55e',
      finalizacao: '#6366f1',
    };
    
    const cor = corEvento[tipoEvento] || '#f97316';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
        <div style="background: linear-gradient(135deg, ${cor} 0%, ${cor}dd 100%); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🔔 ${tipoLabel}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Protocolo: ${protocolo}</p>
        </div>
        <div style="background: white; padding: 25px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #4b5563; margin: 0 0 15px 0;">Olá <strong>${nomeDestinatario}</strong>,</p>
          <p style="color: #4b5563; margin: 0 0 20px 0;">Houve uma atualização na timeline que você está acompanhando:</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 0 0 20px 0; border-radius: 10px;">
            <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">${titulo}</h3>
            <p style="color: #64748b; margin: 0 0 5px 0; font-size: 13px;">Protocolo: <strong>${protocolo}</strong></p>
            ${nomeAlterador ? `<p style="color: #64748b; margin: 0; font-size: 13px;">Alterado por: <strong>${nomeAlterador}</strong></p>` : ''}
          </div>
          
          ${statusAnterior && statusNovo ? `
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 0 0 20px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>Status alterado:</strong><br>
              <span style="color: #dc2626; text-decoration: line-through;">${statusAnterior}</span>
              →
              <span style="color: #16a34a; font-weight: bold;">${statusNovo}</span>
            </p>
          </div>
          ` : ''}
          
          ${descricaoEvento ? `
          <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin: 0 0 20px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #854d0e; margin: 0; font-size: 14px;">
              <strong>Detalhes:</strong><br>
              ${descricaoEvento}
            </p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${linkVisualizacao}" style="display: inline-block; background: linear-gradient(135deg, ${cor} 0%, ${cor}dd 100%); color: white; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);">Ver Timeline Completa</a>
          </div>
          
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin: 25px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Este email foi enviado automaticamente pelo sistema App Manutenção.<br>
            Para alterar suas preferências de notificação, acesse as configurações da timeline.
          </p>
        </div>
      </body>
      </html>
    `;
  },
};

/**
 * Envia email de resumo diário de vencimentos
 */
export async function sendResumoDiarioVencimentos(params: {
  destinatario: string;
  vencimentosHoje: Array<{ titulo: string; tipo: string }>;
  vencimentosProximos: Array<{ titulo: string; tipo: string; diasRestantes: number }>;
  vencimentosAtrasados: Array<{ titulo: string; tipo: string; diasAtraso: number }>;
}): Promise<EmailResult> {
  const { destinatario, vencimentosHoje, vencimentosProximos, vencimentosAtrasados } = params;

  const dataHoje = new Date().toLocaleDateString('pt-BR');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">
          📋 Resumo Diário de Vencimentos
        </h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">
          ${dataHoje}
        </p>
      </div>

      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        
        ${vencimentosAtrasados.length > 0 ? `
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="color: #dc2626; margin: 0 0 10px 0; font-size: 16px;">
            🚨 Vencidos (${vencimentosAtrasados.length})
          </h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${vencimentosAtrasados.map(v => `
              <li style="margin-bottom: 5px;">
                <strong>${v.titulo}</strong> - ${v.tipo} 
                <span style="color: #dc2626;">(${v.diasAtraso} dias de atraso)</span>
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}

        ${vencimentosHoje.length > 0 ? `
        <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="color: #d97706; margin: 0 0 10px 0; font-size: 16px;">
            ⚠️ Vencem Hoje (${vencimentosHoje.length})
          </h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${vencimentosHoje.map(v => `
              <li style="margin-bottom: 5px;">
                <strong>${v.titulo}</strong> - ${v.tipo}
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}

        ${vencimentosProximos.length > 0 ? `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="color: #16a34a; margin: 0 0 10px 0; font-size: 16px;">
            📅 Próximos Vencimentos (${vencimentosProximos.length})
          </h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${vencimentosProximos.map(v => `
              <li style="margin-bottom: 5px;">
                <strong>${v.titulo}</strong> - ${v.tipo}
                <span style="color: #6b7280;">(em ${v.diasRestantes} dias)</span>
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}

        ${vencimentosAtrasados.length === 0 && vencimentosHoje.length === 0 && vencimentosProximos.length === 0 ? `
        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="color: #16a34a; font-size: 18px; margin: 0;">
            ✅ Nenhum vencimento pendente!
          </p>
        </div>
        ` : ''}

        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
          Este email foi enviado automaticamente pelo sistema App Manutenção.
        </p>
      </div>
    </body>
    </html>
  `;

  const totalVencimentos = vencimentosAtrasados.length + vencimentosHoje.length + vencimentosProximos.length;
  const subject = totalVencimentos > 0
    ? `📋 Resumo: ${vencimentosAtrasados.length} vencidos, ${vencimentosHoje.length} hoje, ${vencimentosProximos.length} próximos`
    : '✅ Resumo: Nenhum vencimento pendente';

  return sendEmail({
    to: destinatario,
    subject,
    html,
  });
}


/**
 * Envia o e-mail de recuperação de senha.
 *
 * Recebe o link pronto: quem chama sabe para qual tela o token vale — gestor e
 * funcionário caem em `/redefinir-senha/<token>`, membro de equipe na tela
 * dele. Montar o endereço aqui dentro foi o que fez o e-mail do membro apontar
 * para a tela errada.
 *
 * Ninguém envia senha por e-mail: a senha fica guardada como hash e não é
 * recuperável. O link deixa a pessoa cadastrar uma nova, e vale por 1 hora.
 */
export async function sendRecuperacaoSenhaEmail(params: {
  destinatario: string;
  nome: string;
  linkRecuperacao: string;
}): Promise<EmailResult> {
  const { destinatario, nome, linkRecuperacao } = params;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
        <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 28px;">🔐</span>
        </div>
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
          Recuperação de Senha
        </h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
          App Manutenção
        </p>
      </div>

      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
          Olá <strong>${nome}</strong>,
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 25px 0;">
          Recebemos uma solicitação para redefinir a senha da sua conta no App Manutenção. 
          Se você não fez esta solicitação, pode ignorar este email com segurança.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${linkRecuperacao}" 
             style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">
            Redefinir Minha Senha
          </a>
        </div>

        <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 10px; margin: 25px 0;">
          <p style="color: #92400e; font-size: 13px; margin: 0;">
            <strong>⚠️ Atenção:</strong> Este link é válido por <strong>1 hora</strong>. 
            Após esse período, você precisará solicitar uma nova recuperação.
          </p>
        </div>

        <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
          Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
        </p>
        <p style="color: #6b7280; font-size: 11px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 6px; margin: 10px 0 0 0;">
          ${linkRecuperacao}
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin: 0;">
          Este email foi enviado automaticamente pelo sistema App Manutenção.<br>
          Por favor, não responda a este email.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Olá ${nome},

Recebemos uma solicitação para redefinir a senha da sua conta no App Manutenção.

Para redefinir sua senha, acesse o link abaixo:
${linkRecuperacao}

Este link é válido por 1 hora.

Se você não solicitou a recuperação de senha, ignore este email.

---
App Manutenção
  `.trim();

  return sendEmail({
    to: destinatario,
    subject: '🔐 Recuperação de Senha - App Manutenção',
    html,
    text,
  });
}
