/**
 * Verificação pós-deploy, de fora do servidor.
 *
 * Cobre o que quebra silencioso: processo no ar mas com migração falhada,
 * frontend servido sem os assets, rota pública do QR Code fora do ar. Não
 * substitui abrir o sistema e clicar — substitui descobrir pelo cliente.
 *
 *   pnpm smoke https://appmanutencao.com.br
 */
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");

interface Verificacao {
  nome: string;
  executar: () => Promise<string>;
}

async function pegar(caminho: string, init?: RequestInit): Promise<Response> {
  const resposta = await fetch(`${base}${caminho}`, {
    redirect: "follow",
    ...init,
  });
  return resposta;
}

const verificacoes: Verificacao[] = [
  {
    nome: "saúde do processo e das migrações",
    executar: async () => {
      const r = await pegar("/api/saude");
      const corpo = (await r.json()) as {
        ok: boolean;
        migracoes: { situacao: string; erro: string | null };
      };
      if (!r.ok || !corpo.ok) {
        throw new Error(
          `HTTP ${r.status}, migrações: ${corpo?.migracoes?.situacao} ${corpo?.migracoes?.erro ?? ""}`,
        );
      }
      return `migrações ${corpo.migracoes.situacao}`;
    },
  },
  {
    nome: "página inicial",
    executar: async () => {
      const r = await pegar("/");
      const html = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (!html.includes('id="root"')) throw new Error("HTML sem a raiz do app");
      return `HTTP ${r.status}`;
    },
  },
  {
    nome: "assets do frontend",
    executar: async () => {
      const html = await (await pegar("/")).text();
      // Em produção é `/assets/index-hash.js`; em dev o Vite serve o módulo
      // direto. Qualquer um serve: o que se testa é o arquivo chegar.
      const script = html.match(/<script[^>]+src="(\/[^"]+)"/)?.[1];
      if (!script) throw new Error("nenhum script referenciado no HTML");
      const r = await pegar(script);
      if (!r.ok) throw new Error(`${script} devolveu HTTP ${r.status}`);
      return script;
    },
  },
  {
    nome: "rota pública do QR Code",
    executar: async () => {
      const entrada = encodeURIComponent(JSON.stringify({ json: { token: "smoke-inexistente" } }));
      const r = await pegar(`/api/trpc/qrcode.obterPorToken?input=${entrada}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Token inexistente devolve null — o que importa é a rota responder.
      return "respondeu";
    },
  },
  {
    nome: "rota autenticada recusa anônimo",
    executar: async () => {
      const entrada = encodeURIComponent(JSON.stringify({ json: { condominioId: 1 } }));
      const r = await pegar(`/api/trpc/ordensServico.list?input=${entrada}`);
      if (r.status === 200) throw new Error("rota de O.S. respondeu sem sessão");
      return `HTTP ${r.status}`;
    },
  },
];

async function main() {
  console.log(`Verificando ${base}\n`);
  let falhas = 0;

  for (const v of verificacoes) {
    try {
      const detalhe = await v.executar();
      console.log(`  ok   ${v.nome} — ${detalhe}`);
    } catch (erro) {
      falhas++;
      console.error(`  FALHA ${v.nome} — ${erro instanceof Error ? erro.message : erro}`);
    }
  }

  console.log(
    falhas === 0
      ? "\nTudo respondendo."
      : `\n${falhas} verificação(ões) falharam.`,
  );
  process.exit(falhas === 0 ? 0 : 1);
}

main();
