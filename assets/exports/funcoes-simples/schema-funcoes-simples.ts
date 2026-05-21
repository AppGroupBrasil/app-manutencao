/**
 * Schema para Funções Simples
 * 
 * Adicione este código ao seu arquivo drizzle/schema.ts
 * Depois execute: pnpm db:push
 */

import { mysqlTable, int, varchar, text, datetime, json, boolean, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ==================== TAREFAS SIMPLES ====================
// Tabela principal para registros rápidos de vistorias, manutenções, ocorrências e antes/depois

export const tarefasSimples = mysqlTable("tarefas_simples", {
  id: int("id").primaryKey().autoincrement(),
  condominioId: int("condominio_id").notNull(), // FK para sua tabela de organizações
  userId: int("user_id"), // FK para tabela de usuários (opcional)
  funcionarioId: int("funcionario_id"), // FK para tabela de funcionários (opcional)
  
  // Tipo de tarefa
  tipo: mysqlEnum("tipo", ["vistoria", "manutencao", "ocorrencia", "antes_depois"]).notNull(),
  
  // Protocolo único auto-gerado (formato: VIS-AAMMDD-HHMMSS-XXX)
  protocolo: varchar("protocolo", { length: 50 }).notNull(),
  
  // Campos opcionais
  titulo: varchar("titulo", { length: 255 }),
  descricao: text("descricao"),
  
  // Imagens em base64 ou URLs
  imagens: json("imagens").$type<string[]>().default([]),
  
  // Localização GPS
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  endereco: text("endereco"),
  
  // Status do sistema
  status: mysqlEnum("status", ["rascunho", "enviado", "concluido"]).default("rascunho"),
  
  // Status personalizado pelo usuário
  statusPersonalizado: varchar("status_personalizado", { length: 100 }),
  
  // Timestamps
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
  enviadoEm: datetime("enviado_em"),
  concluidoEm: datetime("concluido_em"),
});

// ==================== STATUS PERSONALIZADOS ====================
// Tabela para status customizáveis pelo usuário

export const statusPersonalizados = mysqlTable("status_personalizados", {
  id: int("id").primaryKey().autoincrement(),
  condominioId: int("condominio_id").notNull(), // FK para sua tabela de organizações
  userId: int("user_id"), // FK para tabela de usuários (quem criou)
  
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 20 }).default("#F97316"), // Cor em hex
  icone: varchar("icone", { length: 50 }), // Nome do ícone Lucide
  ordem: int("ordem").default(0),
  ativo: boolean("ativo").default(true),
  
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
});

// ==================== TIPOS TYPESCRIPT ====================

export type TarefaSimples = typeof tarefasSimples.$inferSelect;
export type NewTarefaSimples = typeof tarefasSimples.$inferInsert;
export type StatusPersonalizado = typeof statusPersonalizados.$inferSelect;
export type NewStatusPersonalizado = typeof statusPersonalizados.$inferInsert;

export type TipoTarefa = "vistoria" | "manutencao" | "ocorrencia" | "antes_depois";
export type StatusTarefa = "rascunho" | "enviado" | "concluido";
