# Personalização por cliente

Um único código-base atende todos os clientes. O que muda entre eles é
**dado** (módulos ligados, vocabulário, marca) e, no caso raro de código
exclusivo, um **módulo restrito** que só existe para os tenants autorizados.

Regra que sustenta tudo: **nunca** escreva `if (condominioId === 7)` dentro de
um módulo compartilhado. Ou o comportamento vira configuração, ou vira módulo
restrito.

## O que todo cliente novo recebe

Um pacote só, igual para todos: o sistema de manutenção inteiro
(`modulosPadrao()`), menos as especialidades marcadas com `padrao: false`
(leitura de medidores, controle de pragas, jardinagem) e menos o legado de
condomínio, que nem aparece no catálogo.

Não existe mais pacote por segmento. A diferença entre uma rede de creches e uma
metalúrgica passou a ser **vocabulário** (`labelsDoSegmento`), não conjunto de
funções — a lista por segmento era herança de quando o produto era um sistema de
condomínio, e ninguém sabia justificar por que um deles tinha votação e o outro
não.

Toda unidade nasce pronta: `prepararUnidade()` grava módulos, status da O.S.,
categorias e prioridades na criação. Antes cada cadastro nascia na primeira vez
que alguém abria a tela, e duas unidades do mesmo cliente podiam acabar
diferentes.

## Escada de customização

Quando um cliente pede algo, resolva no degrau mais baixo possível:

1. **Vocabulário** — o cliente quer outro nome para algo que já existe.
   Grave em `condominios.labels`. Nenhuma linha de código.
2. **Configuração de campos** — quer campos diferentes num formulário existente.
   Use `fieldSettings` / `funcoesPersonalizadas` (construtor de formulários).
3. **Ligar/desligar módulo** — quer algo que já existe no catálogo.
   Ligue em `condominio_funcoes` pela tela de configuração.
4. **Módulo novo genérico** — serve para mais de um cliente.
   Entra no registry como público, desligado para quem não pediu.
5. **Módulo restrito** — só faz sentido para um cliente.
   Entra no registry com `visibilidade: 'restrito'`.
6. **Fork do repositório** — nunca.

Marcas no registry, além de `visibilidade`:

- `padrao: false` — existe no catálogo, nasce desligado.
- `legado: true` — fora do catálogo e de qualquer pacote. É o que sobrou do
  sistema de condomínio (votações, classificados, moradores, revista, caronas…).
  Fica no repositório até haver certeza de que ninguém quer.

## Como funciona o isolamento

Três perguntas independentes:

- **O módulo existe para este cliente?** — `shared/modules/registry.ts`.
  Módulo restrito a outro tenant não aparece nem no catálogo de configuração.
- **O módulo está ligado para este cliente?** — tabela `condominio_funcoes`,
  resolvida em `server/_core/modules.ts`.
- **Este registro é deste cliente?** — `server/_core/escopoRegistro.ts`.
  Sem isso, `getById({ id })` leria o registro de qualquer organização.

O bloqueio acontece no servidor. Esconder o item no menu é só conforto visual —
quem chamar a rota direto recebe `FORBIDDEN`.

### Escopo por registro

Cada router declara de que tabela vem cada id do input:

```ts
const vistoriaProcedure = moduloProcedure(
  "vistorias",
  escopoPorRegistro(
    { id: direto(vistorias), vistoriaId: direto(vistorias) },
    { removeImagem: { id: via(vistoriaImagens, "vistoriaId", vistorias) } },
  ),
);
```

`direto` é para tabela com `condominioId`. `via` resolve pelo pai, para tabelas
filhas (imagens, anexos, itens). O segundo argumento cobre rotas em que o mesmo
campo aponta para outra tabela — em `ordensServico`, por exemplo, `id` é a OS na
maioria das rotas mas é a categoria em `updateCategoria`.

A chave do override pode ser o nome da procedure (`removeImagem`) ou o caminho
completo (`foto.delete`), útil quando dois routers do mesmo arquivo têm rotas
homônimas.

Detalhes que importam:

- A validação é contra **todas** as organizações do usuário, não contra a ativa.
  Um síndico com duas organizações abre registros das duas sem trocar de
  contexto.
- Ids dentro de arrays também são verificados (`reorder({ fotos: [{ id }] })`),
  em uma consulta só por campo.
- Registro inexistente não vira FORBIDDEN: segue para o handler devolver o "não
  encontrado" de sempre.
- `admin_master` não passa por esta checagem.
- `direto()` e `via()` validam a configuração no carregamento do módulo. Apontar
  para uma tabela sem `condominioId` derruba o boot e quebra o teste
  `routersCarregam.test.ts`, em vez de virar um 500 na primeira chamada.

Ao adicionar uma rota nova que receba id, inclua o campo no mapa. O que não
estiver mapeado não é verificado.

Tabelas que pendem do pai em **dois** saltos (`opcoes_votacao` → `votacoes` →
`revistas`) não são suportadas por `via`, que faz um salto só. Nesses casos o
escopo vem de outro campo do mesmo input — em `votacao.votar`, o `votacaoId`.

## Hierarquia de acesso do cliente

`condominios.sindicoId` guarda **um** dono por organização. Isso basta para
"administradora com várias organizações", mas não para um cliente que precisa de
um gestor-chefe sobre todas as unidades **e** um gestor por unidade — só um dos
dois caberia na coluna.

`usuario_condominios` (`userId`, `condominioId`, `papel`) acrescenta o segundo
caminho de acesso. `server/_core/tenant.ts` soma dono ∪ vínculos ativos, e
`ownership.ts` aceita as duas origens. Papéis em `shared/const.ts`:

- `chefe` — vinculado a todas as unidades do cliente; alterna entre elas pelo
  seletor (`x-condominio-id`), uma por vez.
- `gestor` — vinculado só à sua unidade.

Abaixo dos dois continuam os `funcionarios`, que já eram por unidade.

Vínculo com `ativo: false` não concede acesso: é a forma de desligar um gestor
sem apagar o histórico dele.

## Quem acessa o quê

`vistorias`, `manutencoes`, `ocorrencias` e `checklists` aceitam usuário
(síndico/admin) **ou** funcionário — é o que o painel do funcionário consome.
Os demais módulos seguem exclusivos de usuário.

Como as colunas `userId` apontam para `users`, ação de funcionário grava
`userId: null` com o nome preservado (`server/_core/autor.ts`). Sem isso, o id
do funcionário apontaria para o usuário errado.

## Configurar módulos de um cliente

Tela em `/admin/modulos` (`client/src/components/ModulosConfig.tsx`). Mostra só o
catálogo visível daquela organização, acumula as alterações e grava tudo num
request. Quem administra mais de uma organização troca pelo seletor no topo.

Rede de unidades: marque **"Aplicar a todas as organizações"** antes de salvar.
`funcoesCondominio.atualizarMultiplas` recebe `organizacoesIds` e valida cada
alvo (pertence à identidade autenticada **e** tem direito de configurar) antes
de gravar qualquer um — uma unidade fora do alcance recusa o lote inteiro, em
vez de deixar a rede metade configurada.

Desligar um módulo tira o cartão da tela **e** fecha a rota. As telas do gestor
(`AdminDashboard`, `AdminManutencoes`) e o painel de pendências consultam
`temModulo` do `useBootstrap` antes de renderizar o cartão e antes de disparar a
consulta: função desligada não vira chamada que o servidor recusaria.

O calendário (`calendario`) e a faixa de chamados em aberto
(`painel-pendencias`) também são módulos — antes eram fixos na tela. Cliente que
quer apenas O.S. desliga o resto e fica só com o que pediu.

## Criar um módulo exclusivo de um cliente

1. Descubra o `id` do tenant (`condominios.id`).
2. Declare no registry, em `shared/modules/registry.ts`, na seção
   "MÓDULOS EXCLUSIVOS DE CLIENTE":

```ts
{
  id: 'checagem-detalhada',
  nome: 'Checagem Detalhada',
  categoria: 'operacional',
  descricao: 'Checagem com observação e edição de imagem',
  visibilidade: 'restrito',
  tenants: [7],
}
```

3. Crie o router em `server/modules/checagemDetalhada/router.ts` usando a
   procedure do módulo:

```ts
import { moduloUserProcedure, router } from '../../_core/trpc';

const checagemProcedure = moduloUserProcedure('checagem-detalhada');

export const checagemRouter = router({
  list: checagemProcedure
    .input(z.object({ condominioId: z.number() }))
    .query(async ({ ctx }) => {
      // ctx.condominioId já vem validado contra a identidade autenticada
    }),
});
```

4. Registre em `server/routers.ts`.
5. Ligue para o cliente: `funcoesCondominio.toggle` ou insert em
   `condominio_funcoes`.

Resultado: o módulo vive no repositório principal — recebe refactor, checagem
de tipos e correção de segurança junto com o resto — e continua invisível para
todos os outros clientes.

## Vocabulário por cliente

`condominios.labels` sobrescreve chaves de i18n. Para uma metalúrgica:

```json
{
  "menu.inspections": "Inspeções de Solda",
  "menu.maintenance": "Ordens de Produção"
}
```

O client aplica isso sobre o idioma corrente em `useBootstrap`. As chaves são
as mesmas de `client/src/i18n/locales/*.json`.

## Segmentos

`condominios.segmento` define o **vocabulário sugerido** na abertura do cliente
(`generico`, `condominio`, `metalurgia`, `oficina`, `academia`, `facilities`,
`educacional`). Os termos ficam em `VOCABULARIO_POR_SEGMENTO`
(`shared/vocabulario.ts`) e entram como `labels` da organização — a plataforma
pode ajustar qualquer um antes de salvar.

Módulos não dependem do segmento: o pacote é o mesmo para todos, e a partir daí
quem manda é `condominio_funcoes`.

## Ordem de implantação

A inversão do default (de "tudo ligado" para "opt-in") exige preparar o banco
antes de subir a aplicação:

1. `pnpm db:materializar-modulos -- --dry-run` — conferir a saída.
2. `pnpm db:materializar-modulos` — aplica colunas, índices e materialização.
3. Subir a versão da aplicação.

O script é idempotente e faz tudo na ordem certa (DDL → deduplicação → índice
único → materialização). `drizzle/0040_tenant_modules.sql` contém o mesmo DDL,
para quem preferir aplicar por fora.

Ele grava explicitamente o que cada organização já enxergava: organização que
nunca foi configurada recebe todos os módulos públicos **ligados** (preserva o
comportamento antigo); organização já configurada recebe os módulos novos
**desligados** (não ganha função sem pedir).

Se a aplicação subir antes do script, nada quebra: sem a coluna `segmento` o
servidor registra o erro e mantém o comportamento antigo (todos os módulos do
pacote `condominio`). Mas rode o script — é ele que torna o opt-in real.

## Comportamento sob falha

- **Banco indisponível ou migration pendente:** o portão de módulo não bloqueia.
  A falha aparece no handler, com a mensagem certa, em vez de virar um
  "módulo não disponível" enganoso. Módulo restrito a outro cliente continua
  bloqueado — essa checagem é estática, vem do registry.
- **Bootstrap sem resposta no client:** nada é escondido no menu; o servidor
  continua sendo a autoridade.
- **Conta sem organização:** `system.bootstrap` devolve `tenant: null` em vez
  de erro.
- **Cache:** a habilitação é cacheada 30s por processo. Com várias réplicas,
  ligar/desligar um módulo leva até 30s para valer em todas.

## Organização ativa

Quem administra mais de uma organização define a ativa pelo cabeçalho
`x-condominio-id` (o client envia a partir de `localStorage.condominio_ativo`).
O servidor ignora o valor se não pertencer ao usuário. Sem seleção, usa a
primeira organização.

`admin_master` acessa qualquer organização e não passa pelo portão de módulos —
é a conta de suporte da plataforma.

## Onde fica cada coisa

| Arquivo | Papel |
| --- | --- |
| `shared/modules/registry.ts` | Catálogo: quais módulos existem e para quem |
| `server/_core/modules.ts` | Habilitação por tenant, cache, seed |
| `server/_core/tenant.ts` | Quais tenants a identidade autenticada acessa |
| `usuario_condominios` | Vínculo gestor-chefe / gestor de unidade |
| `server/_core/escopoRegistro.ts` | Valida que o id recebido é da organização |
| `server/_core/autor.ts` | Autoria de usuário ou funcionário em timelines |
| `server/_core/trpc.ts` | `tenantProcedure`, `moduloProcedure`, `moduloUserProcedure` |
| `client/src/components/ModulosConfig.tsx` | Tela de ligar/desligar módulos |
| `client/src/hooks/useBootstrap.ts` | Módulos, marca e vocabulário no client |
| `scripts/db/materializar-modulos.ts` | Migração de dados da virada |
