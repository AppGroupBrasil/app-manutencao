import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { userFieldSettings } from "../../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Lista de todas as funções disponíveis (apenas funções implementadas)
export const FUNCOES_DISPONIVEIS = [
  // Funções Operacionais
  { key: "vistoria", label: "Vistoria", categoria: "operacional", icon: "ClipboardCheck" },
  { key: "manutencao", label: "Manutenção", categoria: "operacional", icon: "Wrench" },
  { key: "ocorrencia", label: "Ocorrência", categoria: "operacional", icon: "AlertTriangle" },
  { key: "checklist", label: "Checklist", categoria: "operacional", icon: "ListChecks" },
  { key: "antes_depois", label: "Antes e Depois", categoria: "operacional", icon: "ArrowRightLeft" },
  { key: "timeline", label: "Timeline", categoria: "operacional", icon: "Clock" },
  { key: "vencimentos", label: "Vencimentos", categoria: "operacional", icon: "CalendarClock" },
  { key: "ordem_servico", label: "Ordem de Serviço", categoria: "operacional", icon: "ClipboardList" },
  { key: "leitura_medidores", label: "Leitura de Medidores", categoria: "operacional", icon: "Gauge" },
  { key: "controle_pragas", label: "Controle de Pragas", categoria: "operacional", icon: "Bug" },
  { key: "jardinagem", label: "Jardinagem", categoria: "operacional", icon: "TreeDeciduous" },
];

// Definição dos campos disponíveis por tipo de modal e função
export const CAMPOS_DISPONIVEIS = {
  rapida: {
    vistoria: [
      { key: "titulo", label: "Título", required: true },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "gps", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "prazo_conclusao", label: "Prazo de Conclusão", required: false },
      { key: "nivel_urgencia", label: "Nível de Urgência", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital (Técnico + Solicitante)", required: false },
    ],
    manutencao: [
      { key: "titulo", label: "Título", required: true },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "gps", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "prazo_conclusao", label: "Prazo de Conclusão", required: false },
      { key: "nivel_urgencia", label: "Nível de Urgência", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital (Técnico + Solicitante)", required: false },
    ],
    ocorrencia: [
      { key: "titulo", label: "Título", required: true },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "gps", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "prazo_conclusao", label: "Prazo de Conclusão", required: false },
      { key: "nivel_urgencia", label: "Nível de Urgência", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital (Técnico + Solicitante)", required: false },
    ],
    checklist: [
      { key: "titulo", label: "Título", required: true },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "gps", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "prazo_conclusao", label: "Prazo de Conclusão", required: false },
      { key: "nivel_urgencia", label: "Nível de Urgência", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
    ],
    antes_depois: [
      { key: "titulo", label: "Título", required: true },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "status", label: "Status", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "gps", label: "GPS + Mapa", required: false },
      { key: "prazo_conclusao", label: "Prazo de Conclusão", required: false },
      { key: "nivel_urgencia", label: "Nível de Urgência", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital (Técnico + Solicitante)", required: false },
    ],
    timeline: [
      { key: "responsavel", label: "Responsável", required: true },
      { key: "local", label: "Local/Item", required: false },
      { key: "status", label: "Status", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "titulo", label: "Título", required: true },
      { key: "imagens", label: "Fotos", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "video", label: "Vídeo", required: false },
      { key: "audio", label: "Áudio/Gravação de Voz", required: false },
    ],
    // Novas funções operacionais
    inventario: [
      { key: "titulo", label: "Nome do Item", required: true },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local/Almoxarifado", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "quantidade", label: "Quantidade", required: false },
      { key: "unidade_medida", label: "Unidade de Medida", required: false },
      { key: "quantidade_minima", label: "Quantidade Mínima", required: false },
      { key: "valor_unitario", label: "Valor Unitário", required: false },
      { key: "fornecedor", label: "Fornecedor", required: false },
      { key: "codigo_produto", label: "Código do Produto", required: false },
      { key: "data_validade", label: "Data de Validade", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
    ],
    leitura_medidores: [
      { key: "titulo", label: "Identificação do Medidor", required: true },
      { key: "tipo_medidor", label: "Tipo (Água/Gás/Energia)", required: false },
      { key: "leitura_atual", label: "Leitura Atual", required: true },
      { key: "leitura_anterior", label: "Leitura Anterior", required: false },
      { key: "consumo", label: "Consumo", required: false },
      { key: "local", label: "Local", required: false },
      { key: "imagens", label: "Foto do Medidor", required: false },
      { key: "gps", label: "GPS + Mapa", required: false },
      { key: "data_leitura", label: "Data da Leitura", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
    ],
    inspecao_seguranca: [
      { key: "titulo", label: "Título", required: true },
      { key: "tipo_equipamento", label: "Tipo de Equipamento", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "gps", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "data_validade", label: "Data de Validade", required: false },
      { key: "proxima_inspecao", label: "Próxima Inspeção", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "conforme", label: "Conforme/Não Conforme", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
    ],
    controle_pragas: [
      { key: "titulo", label: "Título", required: true },
      { key: "tipo_servico", label: "Tipo de Serviço", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "gps", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "data_aplicacao", label: "Data da Aplicação", required: false },
      { key: "proxima_aplicacao", label: "Próxima Aplicação", required: false },
      { key: "fornecedor", label: "Empresa/Fornecedor", required: false },
      { key: "produtos_utilizados", label: "Produtos Utilizados", required: false },
      { key: "custo", label: "Custo", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
    ],
    limpeza: [
      { key: "titulo", label: "Título", required: true },
      { key: "tipo_limpeza", label: "Tipo de Limpeza", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local/Área", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "gps", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "data_realizacao", label: "Data de Realização", required: false },
      { key: "recorrencia", label: "Recorrência", required: false },
      { key: "produtos_utilizados", label: "Produtos Utilizados", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
    ],
    jardinagem: [
      { key: "titulo", label: "Título", required: true },
      { key: "tipo_servico", label: "Tipo de Serviço", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local/Área", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "gps", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "data_realizacao", label: "Data de Realização", required: false },
      { key: "recorrencia", label: "Recorrência", required: false },
      { key: "plantas_especies", label: "Plantas/Espécies", required: false },
      { key: "produtos_utilizados", label: "Produtos Utilizados", required: false },
      { key: "custo", label: "Custo", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
    ],
    // Novas funções financeiras
    orcamentos: [
      { key: "titulo", label: "Título/Descrição", required: true },
      { key: "fornecedor", label: "Fornecedor", required: false },
      { key: "valor_total", label: "Valor Total", required: false },
      { key: "validade", label: "Validade do Orçamento", required: false },
      { key: "descricao", label: "Descrição Detalhada", required: false },
      { key: "itens", label: "Itens do Orçamento", required: false },
      { key: "status", label: "Status", required: false },
      { key: "aprovado_por", label: "Aprovado Por", required: false },
      { key: "data_aprovacao", label: "Data de Aprovação", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
    ],
    ordem_compra: [
      { key: "titulo", label: "Título/Descrição", required: true },
      { key: "fornecedor", label: "Fornecedor", required: false },
      { key: "itens", label: "Itens da Compra", required: false },
      { key: "valor_total", label: "Valor Total", required: false },
      { key: "forma_pagamento", label: "Forma de Pagamento", required: false },
      { key: "prazo_entrega", label: "Prazo de Entrega", required: false },
      { key: "status", label: "Status", required: false },
      { key: "aprovado_por", label: "Aprovado Por", required: false },
      { key: "solicitante", label: "Solicitante", required: false },
      { key: "centro_custo", label: "Centro de Custo", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
    ],
    contratos: [
      { key: "titulo", label: "Título/Nome do Contrato", required: true },
      { key: "fornecedor", label: "Fornecedor/Empresa", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "tipo_contrato", label: "Tipo de Contrato", required: false },
      { key: "valor_mensal", label: "Valor Mensal", required: false },
      { key: "valor_total", label: "Valor Total", required: false },
      { key: "data_inicio", label: "Data de Início", required: false },
      { key: "data_fim", label: "Data de Término", required: false },
      { key: "renovacao_automatica", label: "Renovação Automática", required: false },
      { key: "status", label: "Status", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
    ],
    // Vencimentos
    vencimentos: [
      { key: "titulo", label: "Título", required: true },
      { key: "descricao", label: "Descrição", required: false },
      { key: "data_vencimento", label: "Data de Vencimento", required: true },
      { key: "valor", label: "Valor", required: false },
      { key: "categoria", label: "Categoria", required: false },
      { key: "fornecedor", label: "Fornecedor", required: false },
      { key: "status", label: "Status", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
    ],
    // Ordens de Serviço
    ordem_servico: [
      { key: "titulo", label: "Título", required: true },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "status", label: "Status", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "prazo_conclusao", label: "Prazo de Conclusão", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "observacoes", label: "Observações", required: false },
    ],
  },
  completa: {
    vistoria: [
      { key: "titulo", label: "Título", required: true },
      { key: "subtitulo", label: "Subtítulo", required: false },
      { key: "tipo", label: "Tipo de Vistoria", required: false },
      { key: "categoria", label: "Categoria", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "localizacao_texto", label: "Localização (texto)", required: false },
      { key: "data_agendada", label: "Data Agendada", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "imagens", label: "Galeria de Fotos", required: false },
      { key: "edicao_imagem", label: "Editor de Imagem", required: false },
      { key: "controle_tempo", label: "Controle de Tempo", required: false },
      { key: "geolocalizacao", label: "GPS + Mapa", required: false },
      { key: "prazo_conclusao", label: "Prazo de Conclusão", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital (Funcionário + Solicitante)", required: false },
    ],
    manutencao: [
      { key: "titulo", label: "Título", required: true },
      { key: "subtitulo", label: "Subtítulo", required: false },
      { key: "tipo", label: "Tipo de Manutenção", required: false },
      { key: "categoria", label: "Categoria", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "localizacao_texto", label: "Localização (texto)", required: false },
      { key: "fornecedor", label: "Fornecedor", required: false },
      { key: "data_agendada", label: "Data Agendada", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "imagens", label: "Galeria de Fotos", required: false },
      { key: "edicao_imagem", label: "Editor de Imagem", required: false },
      { key: "controle_tempo", label: "Controle de Tempo", required: false },
      { key: "geolocalizacao", label: "GPS + Mapa", required: false },
      { key: "prazo_conclusao", label: "Prazo de Conclusão", required: false },
      { key: "nivel_urgencia", label: "Nível de Urgência", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital (Funcionário + Solicitante)", required: false },
    ],
    ocorrencia: [
      { key: "titulo", label: "Título", required: true },
      { key: "subtitulo", label: "Subtítulo", required: false },
      { key: "tipo", label: "Tipo de Ocorrência", required: false },
      { key: "categoria", label: "Categoria", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "localizacao_texto", label: "Localização (texto)", required: false },
      { key: "data_agendada", label: "Data Agendada", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "imagens", label: "Galeria de Fotos", required: false },
      { key: "edicao_imagem", label: "Editor de Imagem", required: false },
      { key: "geolocalizacao", label: "GPS + Mapa", required: false },
      { key: "prazo_conclusao", label: "Prazo de Conclusão", required: false },
      { key: "nivel_urgencia", label: "Nível de Urgência", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital (Funcionário + Solicitante)", required: false },
    ],
    checklist: [
      { key: "titulo", label: "Título", required: true },
      { key: "subtitulo", label: "Subtítulo", required: false },
      { key: "tipo", label: "Tipo de Checklist", required: false },
      { key: "categoria", label: "Categoria", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "localizacao", label: "Localização", required: false },
      { key: "data_agendada", label: "Data Agendada", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "itensChecklist", label: "Itens do Checklist", required: false },
      { key: "imagens", label: "Galeria de Fotos", required: false },
      { key: "geolocalizacao", label: "GPS + Mapa", required: false },
      { key: "prazo_conclusao", label: "Prazo de Conclusão", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital (Funcionário + Solicitante)", required: false },
    ],
    antes_depois: [
      { key: "titulo", label: "Título", required: true },
      { key: "descricao", label: "Descrição", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "status", label: "Status", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "local", label: "Local", required: false },
      { key: "nivel_urgencia", label: "Nível de Urgência", required: false },
      { key: "imagens_antes", label: "Fotos Antes", required: false },
      { key: "imagens_depois", label: "Fotos Depois", required: false },
      { key: "geolocalizacao", label: "GPS + Mapa", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital (Funcionário + Solicitante)", required: false },
    ],
    timeline: [
      { key: "titulo", label: "Título", required: true },
      { key: "responsavel", label: "Responsável", required: true },
      { key: "local", label: "Local/Item", required: false },
      { key: "status", label: "Status", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "imagens", label: "Galeria de Fotos", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital (Funcionário + Solicitante)", required: false },
    ],
    // Novas funções operacionais - versão completa
    inventario: [
      { key: "titulo", label: "Nome do Item", required: true },
      { key: "codigo_produto", label: "Código do Produto", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "categoria", label: "Categoria", required: false },
      { key: "local", label: "Local/Almoxarifado", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "quantidade", label: "Quantidade", required: false },
      { key: "unidade_medida", label: "Unidade de Medida", required: false },
      { key: "quantidade_minima", label: "Quantidade Mínima", required: false },
      { key: "quantidade_maxima", label: "Quantidade Máxima", required: false },
      { key: "valor_unitario", label: "Valor Unitário", required: false },
      { key: "valor_total", label: "Valor Total", required: false },
      { key: "fornecedor", label: "Fornecedor", required: false },
      { key: "data_validade", label: "Data de Validade", required: false },
      { key: "lote", label: "Lote", required: false },
      { key: "data_entrada", label: "Data de Entrada", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "observacoes", label: "Observações", required: false },
    ],
    leitura_medidores: [
      { key: "titulo", label: "Identificação do Medidor", required: true },
      { key: "tipo_medidor", label: "Tipo (Água/Gás/Energia)", required: false },
      { key: "numero_medidor", label: "Número do Medidor", required: false },
      { key: "leitura_atual", label: "Leitura Atual", required: true },
      { key: "leitura_anterior", label: "Leitura Anterior", required: false },
      { key: "consumo", label: "Consumo", required: false },
      { key: "unidade_medida", label: "Unidade de Medida", required: false },
      { key: "local", label: "Local", required: false },
      { key: "unidade_consumidora", label: "Unidade Consumidora", required: false },
      { key: "imagens", label: "Foto do Medidor", required: false },
      { key: "geolocalizacao", label: "GPS + Mapa", required: false },
      { key: "data_leitura", label: "Data da Leitura", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "historico", label: "Histórico de Leituras", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
    ],
    inspecao_seguranca: [
      { key: "titulo", label: "Título", required: true },
      { key: "tipo_equipamento", label: "Tipo de Equipamento", required: false },
      { key: "numero_serie", label: "Número de Série", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "geolocalizacao", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "data_fabricacao", label: "Data de Fabricação", required: false },
      { key: "data_validade", label: "Data de Validade", required: false },
      { key: "proxima_inspecao", label: "Próxima Inspeção", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "conforme", label: "Conforme/Não Conforme", required: false },
      { key: "itens_verificados", label: "Itens Verificados", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "observacoes", label: "Observações", required: false },
    ],
    controle_pragas: [
      { key: "titulo", label: "Título", required: true },
      { key: "tipo_servico", label: "Tipo de Serviço", required: false },
      { key: "tipo_praga", label: "Tipo de Praga", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "geolocalizacao", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "data_aplicacao", label: "Data da Aplicação", required: false },
      { key: "proxima_aplicacao", label: "Próxima Aplicação", required: false },
      { key: "fornecedor", label: "Empresa/Fornecedor", required: false },
      { key: "produtos_utilizados", label: "Produtos Utilizados", required: false },
      { key: "dosagem", label: "Dosagem", required: false },
      { key: "area_tratada", label: "Área Tratada (m²)", required: false },
      { key: "custo", label: "Custo", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "certificado", label: "Certificado/Laudo", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "observacoes", label: "Observações", required: false },
    ],
    limpeza: [
      { key: "titulo", label: "Título", required: true },
      { key: "tipo_limpeza", label: "Tipo de Limpeza", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local/Área", required: false },
      { key: "area_metros", label: "Área (m²)", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "geolocalizacao", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "equipe", label: "Equipe", required: false },
      { key: "data_realizacao", label: "Data de Realização", required: false },
      { key: "hora_inicio", label: "Hora de Início", required: false },
      { key: "hora_fim", label: "Hora de Término", required: false },
      { key: "recorrencia", label: "Recorrência", required: false },
      { key: "produtos_utilizados", label: "Produtos Utilizados", required: false },
      { key: "equipamentos", label: "Equipamentos Utilizados", required: false },
      { key: "custo", label: "Custo", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "observacoes", label: "Observações", required: false },
    ],
    jardinagem: [
      { key: "titulo", label: "Título", required: true },
      { key: "tipo_servico", label: "Tipo de Serviço", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "local", label: "Local/Área", required: false },
      { key: "area_metros", label: "Área (m²)", required: false },
      { key: "imagens", label: "Fotos", required: false },
      { key: "geolocalizacao", label: "GPS + Mapa", required: false },
      { key: "status", label: "Status", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "equipe", label: "Equipe", required: false },
      { key: "data_realizacao", label: "Data de Realização", required: false },
      { key: "recorrencia", label: "Recorrência", required: false },
      { key: "plantas_especies", label: "Plantas/Espécies", required: false },
      { key: "produtos_utilizados", label: "Produtos Utilizados", required: false },
      { key: "irrigacao", label: "Sistema de Irrigação", required: false },
      { key: "equipamentos", label: "Equipamentos Utilizados", required: false },
      { key: "custo", label: "Custo", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "qrcode", label: "QR Code/Código de Barras", required: false },
      { key: "observacoes", label: "Observações", required: false },
    ],
    // Novas funções financeiras - versão completa
    orcamentos: [
      { key: "titulo", label: "Título/Descrição", required: true },
      { key: "numero_orcamento", label: "Número do Orçamento", required: false },
      { key: "fornecedor", label: "Fornecedor", required: false },
      { key: "cnpj_fornecedor", label: "CNPJ Fornecedor", required: false },
      { key: "contato_fornecedor", label: "Contato do Fornecedor", required: false },
      { key: "itens", label: "Itens do Orçamento", required: false },
      { key: "valor_subtotal", label: "Subtotal", required: false },
      { key: "desconto", label: "Desconto", required: false },
      { key: "valor_total", label: "Valor Total", required: false },
      { key: "forma_pagamento", label: "Forma de Pagamento", required: false },
      { key: "condicoes_pagamento", label: "Condições de Pagamento", required: false },
      { key: "prazo_entrega", label: "Prazo de Entrega", required: false },
      { key: "validade", label: "Validade do Orçamento", required: false },
      { key: "descricao", label: "Descrição Detalhada", required: false },
      { key: "status", label: "Status", required: false },
      { key: "aprovado_por", label: "Aprovado Por", required: false },
      { key: "data_aprovacao", label: "Data de Aprovação", required: false },
      { key: "centro_custo", label: "Centro de Custo", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "comparar_orcamentos", label: "Comparar com Outros", required: false },
    ],
    ordem_compra: [
      { key: "titulo", label: "Título/Descrição", required: true },
      { key: "numero_ordem", label: "Número da Ordem", required: false },
      { key: "fornecedor", label: "Fornecedor", required: false },
      { key: "cnpj_fornecedor", label: "CNPJ Fornecedor", required: false },
      { key: "contato_fornecedor", label: "Contato do Fornecedor", required: false },
      { key: "itens", label: "Itens da Compra", required: false },
      { key: "valor_subtotal", label: "Subtotal", required: false },
      { key: "desconto", label: "Desconto", required: false },
      { key: "frete", label: "Frete", required: false },
      { key: "valor_total", label: "Valor Total", required: false },
      { key: "forma_pagamento", label: "Forma de Pagamento", required: false },
      { key: "condicoes_pagamento", label: "Condições de Pagamento", required: false },
      { key: "prazo_entrega", label: "Prazo de Entrega", required: false },
      { key: "local_entrega", label: "Local de Entrega", required: false },
      { key: "status", label: "Status", required: false },
      { key: "aprovado_por", label: "Aprovado Por", required: false },
      { key: "data_aprovacao", label: "Data de Aprovação", required: false },
      { key: "solicitante", label: "Solicitante", required: false },
      { key: "centro_custo", label: "Centro de Custo", required: false },
      { key: "orcamento_vinculado", label: "Orçamento Vinculado", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
    ],
    contratos: [
      { key: "titulo", label: "Título/Nome do Contrato", required: true },
      { key: "numero_contrato", label: "Número do Contrato", required: false },
      { key: "fornecedor", label: "Fornecedor/Empresa", required: false },
      { key: "cnpj_fornecedor", label: "CNPJ Fornecedor", required: false },
      { key: "contato_fornecedor", label: "Contato do Fornecedor", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "objeto_contrato", label: "Objeto do Contrato", required: false },
      { key: "tipo_contrato", label: "Tipo de Contrato", required: false },
      { key: "valor_mensal", label: "Valor Mensal", required: false },
      { key: "valor_total", label: "Valor Total", required: false },
      { key: "forma_pagamento", label: "Forma de Pagamento", required: false },
      { key: "dia_vencimento", label: "Dia do Vencimento", required: false },
      { key: "data_inicio", label: "Data de Início", required: false },
      { key: "data_fim", label: "Data de Término", required: false },
      { key: "prazo_vigencia", label: "Prazo de Vigência", required: false },
      { key: "renovacao_automatica", label: "Renovação Automática", required: false },
      { key: "aviso_vencimento", label: "Aviso de Vencimento", required: false },
      { key: "multa_rescisao", label: "Multa por Rescisão", required: false },
      { key: "indice_reajuste", label: "Índice de Reajuste", required: false },
      { key: "status", label: "Status", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
      { key: "historico_aditivos", label: "Histórico de Aditivos", required: false },
    ],
    // Vencimentos - versão completa
    vencimentos: [
      { key: "titulo", label: "Título", required: true },
      { key: "subtitulo", label: "Subtítulo", required: false },
      { key: "descricao", label: "Descrição", required: false },
      { key: "data_vencimento", label: "Data de Vencimento", required: true },
      { key: "valor", label: "Valor", required: false },
      { key: "categoria", label: "Categoria", required: false },
      { key: "fornecedor", label: "Fornecedor", required: false },
      { key: "forma_pagamento", label: "Forma de Pagamento", required: false },
      { key: "recorrencia", label: "Recorrência", required: false },
      { key: "status", label: "Status", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "centro_custo", label: "Centro de Custo", required: false },
      { key: "anexos", label: "Anexos (PDF/Doc)", required: false },
      { key: "observacoes", label: "Observações", required: false },
      { key: "tags", label: "Tags/Etiquetas", required: false },
    ],
    // Ordens de Serviço - versão completa
    ordem_servico: [
      { key: "titulo", label: "Título", required: true },
      { key: "descricao", label: "Descrição", required: false },
      { key: "responsavel", label: "Responsável", required: false },
      { key: "categoria", label: "Categoria", required: false },
      { key: "prioridade", label: "Prioridade", required: false },
      { key: "status", label: "Status", required: false },
      { key: "tipo", label: "Tipo de Serviço", required: false },
      { key: "local", label: "Localização", required: false },
      { key: "geolocalizacao", label: "GPS + Mapa", required: false },
      { key: "prazo_conclusao", label: "Prazo de Conclusão", required: false },
      { key: "imagens", label: "Galeria de Fotos", required: false },
      { key: "assinatura_digital", label: "Assinatura Digital (Funcionário + Solicitante)", required: false },
    ],
  },
};

// Função para gerar configuração padrão
// Para funções rápidas: apenas titulo, imagens, descricao e status habilitados por padrão
// Para funções completas: todos habilitados por padrão
function getDefaultConfig(modalType: "rapida" | "completa", functionType: string): Record<string, boolean> {
  const campos = CAMPOS_DISPONIVEIS[modalType][functionType as keyof typeof CAMPOS_DISPONIVEIS["rapida"]];
  if (!campos) return {};
  
  // Campos padrão para funções rápidas
  const camposRapidaPadrao = ["titulo", "imagens", "descricao", "status"];
  
  const config: Record<string, boolean> = {};
  for (const campo of campos) {
    if (modalType === "rapida") {
      // Para funções rápidas: apenas 4 campos habilitados por padrão
      // Campos obrigatórios sempre habilitados
      config[campo.key] = campo.required || camposRapidaPadrao.includes(campo.key);
    } else {
      // Para funções completas: todos habilitados por padrão
      config[campo.key] = true;
    }
  }
  return config;
}

// Lista de todos os tipos de função disponíveis
const FUNCTION_TYPES = [
  "vistoria", "manutencao", "ocorrencia", "checklist", "antes_depois", "timeline",
  "inventario", "leitura_medidores", "inspecao_seguranca", "controle_pragas",
  "limpeza", "jardinagem", "orcamentos", "ordem_compra", "contratos",
  "vencimentos", "ordem_servico"
] as const;

export const fieldSettingsRouter = router({
  // Buscar configuração de campos para um tipo específico
  get: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      modalType: z.enum(["rapida", "completa"]),
      functionType: z.enum(FUNCTION_TYPES),
    }))
    .query(async ({ ctx, input }) => {
      const camposResult = CAMPOS_DISPONIVEIS[input.modalType]?.[input.functionType as keyof typeof CAMPOS_DISPONIVEIS["rapida"]] || [];
      
      try {
        const db = await getDb();
        if (!db) {
          // Sem BD, retorna só os campos com config padrão
          return {
            config: getDefaultConfig(input.modalType, input.functionType),
            campos: camposResult,
          };
        }
        
        const userId = ctx.user?.id;
        
        if (!userId) {
          return {
            config: getDefaultConfig(input.modalType, input.functionType),
            campos: camposResult,
          };
        }

        const [settings] = await db
          .select()
          .from(userFieldSettings)
          .where(
            and(
              eq(userFieldSettings.userId, userId),
              eq(userFieldSettings.condominioId, input.condominioId),
              eq(userFieldSettings.modalType, input.modalType),
              eq(userFieldSettings.functionType, input.functionType as any)
            )
          );

        return {
          config: settings?.fieldsConfig || getDefaultConfig(input.modalType, input.functionType),
          campos: camposResult,
        };
      } catch (error) {
        console.error("[FieldSettings.get] Erro:", error);
        // Em caso de erro no BD, retorna config padrão com os campos
        return {
          config: getDefaultConfig(input.modalType, input.functionType),
          campos: camposResult,
        };
      }
    }),

  // Salvar configuração de campos
  save: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      modalType: z.enum(["rapida", "completa"]),
      functionType: z.enum(FUNCTION_TYPES),
      fieldsConfig: z.record(z.string(), z.boolean()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const userId = ctx.user?.id;
      
      if (!userId) {
        throw new Error("Usuário não autenticado");
      }

      // Verificar se já existe uma configuração
      const [existing] = await db
        .select()
        .from(userFieldSettings)
        .where(
          and(
            eq(userFieldSettings.userId, userId),
            eq(userFieldSettings.condominioId, input.condominioId),
            eq(userFieldSettings.modalType, input.modalType),
            eq(userFieldSettings.functionType, input.functionType as any)
          )
        );

      if (existing) {
        // Atualizar
        await db
          .update(userFieldSettings)
          .set({ 
            fieldsConfig: input.fieldsConfig,
            updatedAt: new Date(),
          })
          .where(eq(userFieldSettings.id, existing.id));
      } else {
        // Inserir
        await db.insert(userFieldSettings).values({
          userId,
          condominioId: input.condominioId,
          modalType: input.modalType,
          functionType: input.functionType as any,
          fieldsConfig: input.fieldsConfig,
        });
      }

      return { success: true };
    }),

  // Resetar para configuração padrão
  reset: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
      modalType: z.enum(["rapida", "completa"]),
      functionType: z.enum(FUNCTION_TYPES),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const userId = ctx.user?.id;
      
      if (!userId) {
        throw new Error("Usuário não autenticado");
      }

      // Deletar configuração existente (volta ao padrão)
      await db
        .delete(userFieldSettings)
        .where(
          and(
            eq(userFieldSettings.userId, userId),
            eq(userFieldSettings.condominioId, input.condominioId),
            eq(userFieldSettings.modalType, input.modalType),
            eq(userFieldSettings.functionType, input.functionType as any)
          )
        );

      return { 
        success: true,
        config: getDefaultConfig(input.modalType, input.functionType),
      };
    }),

  // Listar todas as configurações do usuário para um condomínio
  listAll: protectedProcedure
    .input(z.object({
      condominioId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const userId = ctx.user?.id;
      
      if (!userId) {
        return [];
      }

      const settings = await db
        .select()
        .from(userFieldSettings)
        .where(
          and(
            eq(userFieldSettings.userId, userId),
            eq(userFieldSettings.condominioId, input.condominioId)
          )
        );

      return settings;
    }),

  // Obter lista de campos disponíveis
  getCamposDisponiveis: protectedProcedure
    .input(z.object({
      modalType: z.enum(["rapida", "completa"]),
      functionType: z.enum(FUNCTION_TYPES),
    }))
    .query(({ input }) => {
      return CAMPOS_DISPONIVEIS[input.modalType][input.functionType as keyof typeof CAMPOS_DISPONIVEIS["rapida"]] || [];
    }),

  // Obter lista de funções disponíveis
  getFuncoesDisponiveis: protectedProcedure
    .query(() => {
      return FUNCOES_DISPONIVEIS;
    }),
});
