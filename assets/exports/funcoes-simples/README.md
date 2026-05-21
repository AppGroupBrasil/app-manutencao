# Funções Simples - Módulo de Registro Rápido

Sistema de registro rápido para vistorias, manutenções, ocorrências e antes/depois com design premium laranja.

## Funcionalidades

- **Vistoria Simples**: Registro rápido de vistorias com foto e localização
- **Manutenção Simples**: Registro rápido de manutenções realizadas
- **Ocorrência Simples**: Registro rápido de ocorrências e problemas
- **Antes/Depois Simples**: Registro rápido de comparativos visuais

## Características

- ✅ Todos os campos são **opcionais** (nenhum obrigatório)
- ✅ **Protocolo automático** gerado no formato: `VIS-AAMMDD-HHMMSS-XXX`
- ✅ **Upload de múltiplas imagens**
- ✅ **Captura automática de GPS** com endereço
- ✅ **Status personalizáveis** pelo usuário
- ✅ **Salvamento como rascunho** antes do envio
- ✅ **Envio em lote** de todos os rascunhos
- ✅ **Design premium** com cores laranja/preto/branco
- ✅ **Histórico completo** com filtros por tipo e status

## Arquivos Incluídos

```
exports/funcoes-simples/
├── README.md                      # Este arquivo
├── schema-funcoes-simples.ts      # Tabelas do banco de dados (Drizzle ORM)
├── routers-funcoes-simples.ts     # Rotas tRPC completas
├── TarefasSimplesModal.tsx        # Modal de criação (React)
├── HistoricoTarefasSimples.tsx    # Página de histórico (React)
└── tarefasSimples.test.ts         # Testes Vitest
```

## Instalação

### 1. Schema do Banco de Dados

Copie o conteúdo de `schema-funcoes-simples.ts` para o seu arquivo `drizzle/schema.ts`:

```typescript
// No seu drizzle/schema.ts, adicione:
import { mysqlTable, int, varchar, text, datetime, json, boolean, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// Cole as definições de tarefasSimples e statusPersonalizados
```

Execute a migração:

```bash
pnpm db:push
```

### 2. Rotas tRPC

Copie o conteúdo de `routers-funcoes-simples.ts` para o seu arquivo `server/routers.ts`:

```typescript
// No seu server/routers.ts, adicione:
import { tarefasSimples, statusPersonalizados } from "../drizzle/schema";

// Cole as rotas tarefasSimplesRouter e statusPersonalizadosRouter

// No appRouter, adicione:
export const appRouter = router({
  // ... suas outras rotas
  tarefasSimples: tarefasSimplesRouter,
  statusPersonalizados: statusPersonalizadosRouter,
});
```

### 3. Componentes React

Copie os arquivos para suas pastas:

```bash
# Modal de criação
cp TarefasSimplesModal.tsx client/src/components/

# Página de histórico
cp HistoricoTarefasSimples.tsx client/src/pages/
```

### 4. Rotas do App

Adicione a rota no seu `App.tsx`:

```typescript
import HistoricoTarefasSimples from "./pages/HistoricoTarefasSimples";

// Na função Router, adicione:
<Route path="/dashboard/funcoes-simples" component={HistoricoTarefasSimples} />
```

### 5. Menu Lateral (Opcional)

Adicione ao seu menu lateral:

```typescript
{
  id: "funcoes-simples",
  label: "Funções Simples",
  icon: Zap,
  items: [
    { icon: Zap, label: "Histórico de Registros", path: "/dashboard/funcoes-simples" },
    { icon: ClipboardCheck, label: "Vistoria Simples", path: "/dashboard/funcoes-simples?tipo=vistoria" },
    { icon: Wrench, label: "Manutenção Simples", path: "/dashboard/funcoes-simples?tipo=manutencao" },
    { icon: AlertTriangle, label: "Ocorrência Simples", path: "/dashboard/funcoes-simples?tipo=ocorrencia" },
    { icon: ArrowLeftRight, label: "Antes/Depois Simples", path: "/dashboard/funcoes-simples?tipo=antes_depois" },
  ]
}
```

## Dependências

Certifique-se de ter instalado:

```bash
pnpm add lucide-react date-fns sonner
```

## Uso do Modal

```tsx
import { TarefasSimplesModal } from "@/components/TarefasSimplesModal";

function MeuComponente() {
  const [modalAberto, setModalAberto] = useState(false);
  
  return (
    <>
      <Button onClick={() => setModalAberto(true)}>
        Nova Tarefa Simples
      </Button>
      
      <TarefasSimplesModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        condominioId={1} // ID da sua organização
        tipoInicial="vistoria" // Tipo inicial (opcional)
        onSuccess={() => {
          // Callback após envio bem-sucedido
        }}
      />
    </>
  );
}
```

## Formato do Protocolo

O protocolo é gerado automaticamente no formato:

```
{PREFIXO}-{AAMMDD}-{HHMMSS}-{XXX}
```

Onde:
- **PREFIXO**: VIS (Vistoria), MAN (Manutenção), OCO (Ocorrência), A&D (Antes/Depois)
- **AAMMDD**: Ano, mês e dia
- **HHMMSS**: Hora, minuto e segundo
- **XXX**: Número aleatório de 3 dígitos

Exemplo: `VIS-260109-192230-047`

## Fluxo de Status

```
RASCUNHO → ENVIADO → CONCLUÍDO
```

1. **Rascunho**: Tarefa salva localmente, ainda não enviada
2. **Enviado**: Tarefa enviada para o sistema
3. **Concluído**: Tarefa finalizada

## Personalização de Cores

As cores podem ser ajustadas no componente `TarefasSimplesModal.tsx`:

```typescript
const tipoConfig = {
  vistoria: {
    label: "Vistoria Simples",
    icon: ClipboardList,
    cor: "#F97316", // Laranja
    corClara: "#FFF7ED",
  },
  // ... outros tipos
};
```

## Testes

Execute os testes:

```bash
pnpm test -- --run server/tarefasSimples.test.ts
```

## Suporte

Este módulo foi desenvolvido para o App Manutenção.
Para dúvidas ou suporte, entre em contato.

---

**Versão**: 1.0.0
**Data**: Janeiro 2026
**Autor**: App Manutenção
