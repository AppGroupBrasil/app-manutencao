/**
 * Dispara um e-mail de teste usando o template real de alerta de vencimento.
 *
 * Serve para responder uma pergunta só: o envio de e-mail está funcionando
 * neste ambiente? Usa o mesmo caminho do alerta de verdade — mesma chave, mesmo
 * remetente, mesmo template — então um teste que chega prova o alerta que
 * chega.
 *
 *   pnpm testar-email destinatario@dominio.com
 */
import { sendAlertaVencimentoEmail } from "../server/_core/email";

async function main() {
  const destinatario = process.argv[2]?.trim();
  if (!destinatario || !destinatario.includes("@")) {
    throw new Error("Uso: pnpm testar-email destinatario@dominio.com");
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY não está definida neste ambiente — sem ela nenhum e-mail sai.",
    );
  }

  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 5);

  const resultado = await sendAlertaVencimentoEmail({
    destinatarios: [destinatario],
    titulo: "TESTE — Contrato de manutenção de elevadores",
    tipo: "Contrato",
    dataVencimento: vencimento,
    diasRestantes: 5,
    descricao:
      "Este é um envio de teste do App Manutenção, para confirmar que os alertas de vencimento chegam. Nenhum contrato real está vencendo.",
    organizacao: "Envio de teste",
    fornecedor: "Fornecedor de exemplo",
  });

  if (!resultado.success) {
    throw new Error(`Falhou: ${resultado.error ?? "motivo não informado"}`);
  }

  console.log(`E-mail de teste enviado para ${destinatario}.`);
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
