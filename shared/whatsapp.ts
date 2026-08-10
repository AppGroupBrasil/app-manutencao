/**
 * Link de conversa do WhatsApp.
 *
 * O `wa.me` exige o número só com dígitos e com código do país; qualquer
 * parêntese, traço ou espaço faz o link abrir em branco. Como no Brasil quase
 * ninguém digita o 55, ele entra aqui quando falta.
 *
 * O link abre **uma conversa por vez** — não existe envio para vários por este
 * caminho, e é por isso que as telas listam as pessoas em vez de oferecer um
 * botão de "enviar para todos".
 */
const DDI_BRASIL = "55";

/** Só dígitos, com o 55 na frente quando o número é claramente nacional. */
export function normalizarWhatsapp(valor?: string | null): string | null {
  if (!valor) return null;

  const digitos = valor.replace(/\D/g, "");
  if (digitos.length < 10) return null;

  // 10 ou 11 dígitos = DDD + número, sem país.
  if (digitos.length <= 11) return `${DDI_BRASIL}${digitos}`;
  return digitos;
}

/** Mostra como o usuário reconhece: (11) 99999-9999. */
export function formatarWhatsapp(valor?: string | null): string {
  const numero = normalizarWhatsapp(valor);
  if (!numero) return "";

  const semDdi = numero.startsWith(DDI_BRASIL) ? numero.slice(2) : numero;
  if (semDdi.length === 11) {
    return `(${semDdi.slice(0, 2)}) ${semDdi.slice(2, 7)}-${semDdi.slice(7)}`;
  }
  if (semDdi.length === 10) {
    return `(${semDdi.slice(0, 2)}) ${semDdi.slice(2, 6)}-${semDdi.slice(6)}`;
  }
  return numero;
}

/**
 * Endereço da conversa. Sem número, abre o WhatsApp para a pessoa escolher o
 * contato na própria agenda.
 */
export function linkWhatsapp(mensagem: string, numero?: string | null): string {
  const destino = normalizarWhatsapp(numero);
  const texto = encodeURIComponent(mensagem);
  return destino ? `https://wa.me/${destino}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
