import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { InsertUser, users, vencimentos, vencimentoAlertas, vencimentoEmails, vencimentoNotificacoes, InsertVencimento, InsertVencimentoAlerta, InsertVencimentoEmail, InsertVencimentoNotificacao, configuracoesFinanceiras } from "../drizzle/schema";
import { ENV } from './_core/env';
import { desc, and, lte, gte, sql, eq } from "drizzle-orm";
import { sendEmail } from "./_core/email";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Lazily create the drizzle instance with postgres.js connection.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, {
        max: 10,
        idle_timeout: 60,
        connect_timeout: 30,
      });
      _db = drizzle(_client, { schema });
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _client = null;
    }
  }
  return _db;
}

/**
 * Helper que garante que o DB está disponível ou lança erro.
 * Elimina a necessidade de `if (!db) throw/return` em cada router.
 */
export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

/** Acesso ao client postgres.js raw (para DDL/migrações) */
export function getRawClient() {
  return _client;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot upsert user: database not available");
  }

  try {
    // Verificar se o usuário já existe
    const [existingUser] = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    const isNewUser = !existingUser;
    
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
    
    // Se é um novo usuário, enviar notificação por e-mail
    if (isNewUser) {
      enviarNotificacaoNovoCadastro(user.name || 'Não informado', user.email || 'Não informado');
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

// Função para enviar notificação de novo cadastro
async function enviarNotificacaoNovoCadastro(nome: string, email: string) {
  try {
    const db = await getDb();
    if (!db) return;
    
    // Buscar configurações financeiras
    const [config] = await db.select().from(configuracoesFinanceiras).limit(1);
    
    if (!config || !config.notificarNovoCadastro || !config.emailNotificacaoCadastro) {
      return; // Notificação desativada ou e-mail não configurado
    }
    
    const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    
    await sendEmail({
      to: config.emailNotificacaoCadastro,
      subject: '🎉 Novo Cadastro no App Manutenção',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Novo Cadastro!</h1>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
              Um novo usuário acabou de se cadastrar no App Manutenção:
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f97316;">
              <p style="margin: 0 0 10px 0;"><strong>Nome:</strong> ${nome}</p>
              <p style="margin: 0 0 10px 0;"><strong>E-mail:</strong> ${email}</p>
              <p style="margin: 0;"><strong>Data/Hora:</strong> ${dataHora}</p>
            </div>
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
              Acesse o painel administrativo para ver mais detalhes do novo usuário.
            </p>
          </div>
        </div>
      `,
    });
    
    console.log('[Notificação] E-mail de novo cadastro enviado para:', config.emailNotificacaoCadastro);
  } catch (error) {
    console.error('[Notificação] Erro ao enviar e-mail de novo cadastro:', error);
    // Não lançar erro para não afetar o fluxo de cadastro
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: { email: string; name: string; senha: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Gerar openId único para utilizadores locais
  const openId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  const [result] = await db.insert(users).values({
    openId,
    email: data.email,
    name: data.name,
    senha: data.senha,
    loginMethod: 'local',
    role: 'sindico',
    lastSignedIn: new Date(),
  }).returning({ id: users.id });

  return result.id;
}

export async function updateUserPassword(userId: number, senhaHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ senha: senhaHash }).where(eq(users.id, userId));
}

export async function setUserResetToken(userId: number, token: string, expira: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ resetToken: token, resetTokenExpira: expira }).where(eq(users.id, userId));
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function clearUserResetToken(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ resetToken: null, resetTokenExpira: null }).where(eq(users.id, userId));
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ==================== VENCIMENTOS ====================

export async function createVencimento(data: InsertVencimento) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(vencimentos).values(data).returning({ id: vencimentos.id });
  return result.id;
}

export async function updateVencimento(id: number, data: Partial<InsertVencimento>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(vencimentos).set(data).where(eq(vencimentos.id, id));
}

export async function deleteVencimento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete related records first
  await db.delete(vencimentoAlertas).where(eq(vencimentoAlertas.vencimentoId, id));
  await db.delete(vencimentoNotificacoes).where(eq(vencimentoNotificacoes.vencimentoId, id));
  await db.delete(vencimentos).where(eq(vencimentos.id, id));
}

export async function getVencimentosByCondominioAndTipo(condominioId: number, tipo: 'contrato' | 'servico' | 'manutencao') {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(vencimentos)
    .where(and(eq(vencimentos.condominioId, condominioId), eq(vencimentos.tipo, tipo)))
    .orderBy(desc(vencimentos.dataVencimento));
}

export async function getVencimentoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(vencimentos).where(eq(vencimentos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getVencimentosProximos(condominioId: number, dias: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  
  return db.select().from(vencimentos)
    .where(and(
      eq(vencimentos.condominioId, condominioId),
      gte(vencimentos.dataVencimento, hoje),
      lte(vencimentos.dataVencimento, limite),
      eq(vencimentos.status, 'ativo')
    ))
    .orderBy(vencimentos.dataVencimento);
}

export async function getVencimentosVencidos(condominioId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const hoje = new Date();
  
  return db.select().from(vencimentos)
    .where(and(
      eq(vencimentos.condominioId, condominioId),
      lte(vencimentos.dataVencimento, hoje),
      eq(vencimentos.status, 'ativo')
    ))
    .orderBy(desc(vencimentos.dataVencimento));
}

export async function getVencimentoStats(condominioId: number) {
  const db = await getDb();
  if (!db) return { total: 0, proximos: 0, vencidos: 0, contratos: 0, servicos: 0, manutencoes: 0 };
  
  const hoje = new Date();
  const em30dias = new Date();
  em30dias.setDate(em30dias.getDate() + 30);
  
  const todos = await db.select().from(vencimentos)
    .where(and(eq(vencimentos.condominioId, condominioId), eq(vencimentos.status, 'ativo')));
  
  const vencidos = todos.filter(v => new Date(v.dataVencimento) < hoje);
  const proximos = todos.filter(v => {
    const data = new Date(v.dataVencimento);
    return data >= hoje && data <= em30dias;
  });
  
  return {
    total: todos.length,
    proximos: proximos.length,
    vencidos: vencidos.length,
    contratos: todos.filter(v => v.tipo === 'contrato').length,
    servicos: todos.filter(v => v.tipo === 'servico').length,
    manutencoes: todos.filter(v => v.tipo === 'manutencao').length,
  };
}

// ==================== ALERTAS DE VENCIMENTOS ====================

export async function createVencimentoAlerta(data: InsertVencimentoAlerta) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(vencimentoAlertas).values(data).returning({ id: vencimentoAlertas.id });
  return result.id;
}

export async function getAlertasByVencimento(vencimentoId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(vencimentoAlertas)
    .where(eq(vencimentoAlertas.vencimentoId, vencimentoId));
}

export async function updateVencimentoAlerta(id: number, data: Partial<InsertVencimentoAlerta>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(vencimentoAlertas).set(data).where(eq(vencimentoAlertas.id, id));
}

export async function deleteAlertasByVencimento(vencimentoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(vencimentoAlertas).where(eq(vencimentoAlertas.vencimentoId, vencimentoId));
}

export async function getAlertasPendentes() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    alerta: vencimentoAlertas,
    vencimento: vencimentos,
  })
    .from(vencimentoAlertas)
    .innerJoin(vencimentos, eq(vencimentoAlertas.vencimentoId, vencimentos.id))
    .where(and(
      eq(vencimentoAlertas.ativo, true),
      eq(vencimentoAlertas.enviado, false),
      eq(vencimentos.status, 'ativo')
    ));
}

// ==================== E-MAILS DE VENCIMENTOS ====================

export async function createVencimentoEmail(data: InsertVencimentoEmail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(vencimentoEmails).values(data).returning({ id: vencimentoEmails.id });
  return result.id;
}

export async function getEmailsByCondominio(condominioId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(vencimentoEmails)
    .where(eq(vencimentoEmails.condominioId, condominioId));
}

export async function updateVencimentoEmail(id: number, data: Partial<InsertVencimentoEmail>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(vencimentoEmails).set(data).where(eq(vencimentoEmails.id, id));
}

export async function deleteVencimentoEmail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(vencimentoEmails).where(eq(vencimentoEmails.id, id));
}

// ==================== NOTIFICAÇÕES DE VENCIMENTOS ====================

export async function createVencimentoNotificacao(data: InsertVencimentoNotificacao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(vencimentoNotificacoes).values(data).returning({ id: vencimentoNotificacoes.id });
  return result.id;
}

export async function getNotificacoesByVencimento(vencimentoId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(vencimentoNotificacoes)
    .where(eq(vencimentoNotificacoes.vencimentoId, vencimentoId))
    .orderBy(desc(vencimentoNotificacoes.createdAt));
}

// ==================== ALERTAS AUTOMÁTICOS DE VENCIMENTOS ====================

export async function getAlertasParaEnviar() {
  const db = await getDb();
  if (!db) return [];
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  // Buscar todos os alertas não enviados com seus vencimentos
  const alertas = await db.select({
    alerta: vencimentoAlertas,
    vencimento: vencimentos,
  })
    .from(vencimentoAlertas)
    .innerJoin(vencimentos, eq(vencimentoAlertas.vencimentoId, vencimentos.id))
    .where(and(
      eq(vencimentoAlertas.ativo, true),
      eq(vencimentoAlertas.enviado, false),
      eq(vencimentos.status, 'ativo')
    ));
  
  // Filtrar alertas que devem ser enviados hoje
  return alertas.filter(({ alerta, vencimento }) => {
    const dataVencimento = new Date(vencimento.dataVencimento);
    dataVencimento.setHours(0, 0, 0, 0);
    
    const diasAntecedencia = {
      'na_data': 0,
      'um_dia_antes': 1,
      'uma_semana_antes': 7,
      'quinze_dias_antes': 15,
      'um_mes_antes': 30,
    };
    
    const diasAntes = diasAntecedencia[alerta.tipoAlerta as keyof typeof diasAntecedencia] || 0;
    const dataAlerta = new Date(dataVencimento);
    dataAlerta.setDate(dataAlerta.getDate() - diasAntes);
    
    // Verificar se a data do alerta já passou ou é hoje
    return dataAlerta <= hoje;
  });
}

export async function marcarAlertaComoEnviado(alertaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(vencimentoAlertas)
    .set({ enviado: true, dataEnvio: new Date() })
    .where(eq(vencimentoAlertas.id, alertaId));
}

export async function getAllVencimentosByCondominio(condominioId: number, filtros?: {
  tipo?: 'contrato' | 'servico' | 'manutencao';
  status?: 'ativo' | 'vencido' | 'renovado' | 'cancelado';
  dataInicio?: Date;
  dataFim?: Date;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(vencimentos)
    .where(eq(vencimentos.condominioId, condominioId));
  
  // Aplicar filtros adicionais se fornecidos
  const conditions = [eq(vencimentos.condominioId, condominioId)];
  
  if (filtros?.tipo) {
    conditions.push(eq(vencimentos.tipo, filtros.tipo));
  }
  if (filtros?.status) {
    conditions.push(eq(vencimentos.status, filtros.status));
  }
  if (filtros?.dataInicio) {
    conditions.push(gte(vencimentos.dataVencimento, filtros.dataInicio));
  }
  if (filtros?.dataFim) {
    conditions.push(lte(vencimentos.dataVencimento, filtros.dataFim));
  }
  
  return db.select().from(vencimentos)
    .where(and(...conditions))
    .orderBy(vencimentos.dataVencimento);
}

// Estatísticas de vencimentos para dashboard
export async function getVencimentosPorMes(condominioId: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    mes: sql<number>`EXTRACT(MONTH FROM data_vencimento)`,
    total: sql<number>`COUNT(*)`,
    vencidos: sql<number>`SUM(CASE WHEN data_vencimento < CURRENT_DATE AND status = 'ativo' THEN 1 ELSE 0 END)`,
    ativos: sql<number>`SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END)`,
  }).from(vencimentos)
    .where(and(
      eq(vencimentos.condominioId, condominioId),
      sql`EXTRACT(YEAR FROM data_vencimento) = ${ano}`
    ))
    .groupBy(sql`EXTRACT(MONTH FROM data_vencimento)`)
    .orderBy(sql`EXTRACT(MONTH FROM data_vencimento)`);
  
  return result;
}

export async function getVencimentosPorCategoria(condominioId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    tipo: vencimentos.tipo,
    total: sql<number>`COUNT(*)`,
    vencidos: sql<number>`SUM(CASE WHEN data_vencimento < CURRENT_DATE AND status = 'ativo' THEN 1 ELSE 0 END)`,
    ativos: sql<number>`SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END)`,
    valorTotal: sql<number>`COALESCE(SUM(valor), 0)`,
  }).from(vencimentos)
    .where(eq(vencimentos.condominioId, condominioId))
    .groupBy(vencimentos.tipo);
  
  return result;
}

export async function getVencimentosPorStatus(condominioId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    status: vencimentos.status,
    total: sql<number>`COUNT(*)`,
    valorTotal: sql<number>`COALESCE(SUM(valor), 0)`,
  }).from(vencimentos)
    .where(eq(vencimentos.condominioId, condominioId))
    .groupBy(vencimentos.status);
  
  return result;
}

export async function getProximosVencimentos(condominioId: number, dias: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const hoje = new Date();
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + dias);
  
  return db.select().from(vencimentos)
    .where(and(
      eq(vencimentos.condominioId, condominioId),
      eq(vencimentos.status, 'ativo'),
      gte(vencimentos.dataVencimento, hoje),
      lte(vencimentos.dataVencimento, dataLimite)
    ))
    .orderBy(vencimentos.dataVencimento);
}

export async function getEstatisticasGeraisVencimentos(condominioId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const hoje = new Date();
  const proximos30 = new Date();
  proximos30.setDate(proximos30.getDate() + 30);
  
  const result = await db.select({
    total: sql<number>`COUNT(*)`,
    ativos: sql<number>`SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END)`,
    vencidos: sql<number>`SUM(CASE WHEN data_vencimento < CURRENT_DATE AND status = 'ativo' THEN 1 ELSE 0 END)`,
    proximos30dias: sql<number>`SUM(CASE WHEN data_vencimento >= CURRENT_DATE AND data_vencimento <= CURRENT_DATE + INTERVAL '30 days' AND status = 'ativo' THEN 1 ELSE 0 END)`,
    valorTotalAtivo: sql<number>`COALESCE(SUM(CASE WHEN status = 'ativo' THEN valor ELSE 0 END), 0)`,
    contratos: sql<number>`SUM(CASE WHEN tipo = 'contrato' THEN 1 ELSE 0 END)`,
    servicos: sql<number>`SUM(CASE WHEN tipo = 'servico' THEN 1 ELSE 0 END)`,
    manutencoes: sql<number>`SUM(CASE WHEN tipo = 'manutencao' THEN 1 ELSE 0 END)`,
  }).from(vencimentos)
    .where(eq(vencimentos.condominioId, condominioId));
  
  return result[0] || null;
}

export async function getEvolucaoVencimentos(condominioId: number, meses: number = 12) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    ano: sql<number>`EXTRACT(YEAR FROM data_vencimento)`,
    mes: sql<number>`EXTRACT(MONTH FROM data_vencimento)`,
    total: sql<number>`COUNT(*)`,
    contratos: sql<number>`SUM(CASE WHEN tipo = 'contrato' THEN 1 ELSE 0 END)`,
    servicos: sql<number>`SUM(CASE WHEN tipo = 'servico' THEN 1 ELSE 0 END)`,
    manutencoes: sql<number>`SUM(CASE WHEN tipo = 'manutencao' THEN 1 ELSE 0 END)`,
    valorTotal: sql<number>`COALESCE(SUM(valor), 0)`,
  }).from(vencimentos)
    .where(and(
      eq(vencimentos.condominioId, condominioId),
      sql`data_vencimento >= CURRENT_DATE - INTERVAL '${sql.raw(String(meses))} months'`
    ))
    .groupBy(sql`EXTRACT(YEAR FROM data_vencimento)`, sql`EXTRACT(MONTH FROM data_vencimento)`)
    .orderBy(sql`EXTRACT(YEAR FROM data_vencimento)`, sql`EXTRACT(MONTH FROM data_vencimento)`);
  
  return result;
}

// TODO: add feature queries here as your schema grows.


// ==================== FUNÇÕES POR CONDOMÍNIO ====================
import { condominioFuncoes, FUNCOES_DISPONIVEIS, InsertCondominioFuncao } from "../drizzle/schema";

export async function getFuncoesCondominio(condominioId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select()
    .from(condominioFuncoes)
    .where(eq(condominioFuncoes.condominioId, condominioId));
  
  return result;
}

export async function getFuncoesHabilitadas(condominioId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return FUNCOES_DISPONIVEIS.map(f => f.id); // Se não há DB, retorna todas habilitadas
  
  const result = await db.select()
    .from(condominioFuncoes)
    .where(and(
      eq(condominioFuncoes.condominioId, condominioId),
      eq(condominioFuncoes.habilitada, true)
    ));
  
  // Se não há registros, significa que todas estão habilitadas por padrão
  if (result.length === 0) {
    return FUNCOES_DISPONIVEIS.map(f => f.id);
  }
  
  return result.map(r => r.funcaoId);
}

export async function setFuncaoHabilitada(condominioId: number, funcaoId: string, habilitada: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar se já existe registro
  const existing = await db.select()
    .from(condominioFuncoes)
    .where(and(
      eq(condominioFuncoes.condominioId, condominioId),
      eq(condominioFuncoes.funcaoId, funcaoId)
    ));
  
  if (existing.length > 0) {
    // Atualizar
    await db.update(condominioFuncoes)
      .set({ habilitada })
      .where(and(
        eq(condominioFuncoes.condominioId, condominioId),
        eq(condominioFuncoes.funcaoId, funcaoId)
      ));
  } else {
    // Inserir
    await db.insert(condominioFuncoes).values({
      condominioId,
      funcaoId,
      habilitada,
    });
  }
  
  return { condominioId, funcaoId, habilitada };
}

export async function setMultiplasFuncoesHabilitadas(condominioId: number, funcoes: { funcaoId: string; habilitada: boolean }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const funcao of funcoes) {
    await setFuncaoHabilitada(condominioId, funcao.funcaoId, funcao.habilitada);
  }
  
  return { condominioId, updated: funcoes.length };
}

export async function inicializarFuncoesCondominio(condominioId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar se já existem registros
  const existing = await db.select()
    .from(condominioFuncoes)
    .where(eq(condominioFuncoes.condominioId, condominioId));
  
  if (existing.length > 0) {
    return { condominioId, initialized: false, message: "Funções já inicializadas" };
  }
  
  // Criar registros para todas as funções (todas habilitadas por padrão)
  for (const funcao of FUNCOES_DISPONIVEIS) {
    await db.insert(condominioFuncoes).values({
      condominioId,
      funcaoId: funcao.id,
      habilitada: true,
    });
  }
  
  return { condominioId, initialized: true, count: FUNCOES_DISPONIVEIS.length };
}
