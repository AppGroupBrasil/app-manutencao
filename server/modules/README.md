# Módulos do Servidor (Arquitetura Proposta)

> **Nota — `equipe/` vs `equipes/`:** apesar do nome parecido, são domínios distintos:
> - `equipe/router.ts` (exportado como `membroEquipe`) — CRUD/autenticação dos *membros* de equipes (pessoas).
> - `equipes/router.ts` (exportado como `equipes`) — gestão das *entidades* equipe (grupos).


Para resolver o problema do arquivo `routers.ts` monolítico (+19k linhas), a nova arquitetura deve seguir este padrão:

Cada domínio funcional deve ter seu próprio arquivo ou pasta aqui.

## Exemplo de Estrutura

```
server/
  modules/
    condominio/
      router.ts       # Rotas tRPC
      service.ts      # Lógica de negócio
      types.ts        # Tipos específicos
    os/
      router.ts
      ...
    financeiro/
      ...
```

## Como Refatorar

1. Identifique um bloco lógico no `routers.ts` (ex: `condominio: router({...})`).
2. Recorte o código e mova para um novo arquivo em `server/modules/<nome>/router.ts`.
3. Importe os schemas e dependências necessárias.
4. No `routers.ts` principal, importe o novo router e o utilize:

```typescript
// server/routers.ts
import { condominioRouter } from "./modules/condominio/router";

export const appRouter = router({
  condominio: condominioRouter,
  // ...
});
```
