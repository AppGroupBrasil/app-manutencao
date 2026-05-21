# Guia de Migração: Vercel → Google Cloud Platform (GCP)

Este guia descreve os passos necessários para migrar a infraestrutura do aplicativo da Vercel para o "Universo Google", especificamente utilizando **Cloud Run** (computação serverless) e **Cloud SQL** (banco de dados).

## 1. Visão Geral da Nova Arquitetura

-   **Frontend & Backend**: Unificados em um único contêiner Docker rodando no **Google Cloud Run**.
-   **Banco de Dados**: Migração do MySQL atual para **Cloud SQL for MySQL**.
-   **Armazenamento de Arquivos**: Migração para **Google Cloud Storage** bucket (substituindo implementação atual ou AWS S3).

## 2. Preparação do Ambiente (Dockerfile)

O arquivo `Dockerfile` já foi criado na raiz do projeto. Ele é responsável por "empacotar" sua aplicação para rodar no Google.

**Conteúdo do Dockerfile:**
-   Base: `node:20-slim`
-   Build: Compila o Frontend (React/Vite) e o Backend (Node/Express).
-   Runtime: Executa o servidor na porta 8080 (padrão do Cloud Run).

## 3. Passos para Deploy

### Pré-requisitos
-   Conta no Google Cloud Platform (GCP).
-   Ferramenta de linha de comando `gcloud` instalada (ou usar o Cloud Shell no navegador).
-   Projeto criado no GCP (ex: `manus-app`).

### Passo 3.1: Habilitar Serviços
No console do GCP, habilite as APIs:
-   Cloud Run API
-   Artifact Registry API
-   Cloud SQL Admin API

### Passo 3.2: Configurar Banco de Dados (Cloud SQL)
1.  Crie uma instância MySQL no Cloud SQL.
2.  Crie um banco de dados e um usuário.
3.  Obtenha a string de conexão. **Atenção:** No Cloud Run, a conexão com Cloud SQL geralmente é feita via *Unix Socket* ou através do *Cloud SQL Auth Proxy*, mas a string de conexão no formato URL (`mysql://user:pass@host:3306/db`) funciona se o IP for público (menos seguro) ou via Private IP. A recomendação do Google é usar o socket.

### Passo 3.3: Deploy para Cloud Run
Execute os seguintes comandos no terminal:

```bash
# 1. Autenticar no Google Cloud
gcloud auth login
gcloud config set project [ID-DO-SEU-PROJETO]

# 2. Enviar a imagem para o Google Container Registry (ou Artifact Registry)
gcloud builds submit --tag gcr.io/[ID-DO-SEU-PROJETO]/app-manutencao

# 3. Fazer o Deploy no Cloud Run
gcloud run deploy app-manutencao \
  --image gcr.io/[ID-DO-SEU-PROJETO]/app-manutencao \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="DATABASE_URL=mysql://usuario:senha@ip-cloud-sql/nome-banco"
```

*Nota: Você precisará adicionar as outras variáveis de ambiente definidas em `server/_core/env.ts` (como `JWT_SECRET`, keys de storage, etc) no comando `--set-env-vars`.*

## 4. Adaptações Específicas no Código

### 4.1 Armazenamento (Storage)
Atualmente o projeto usa variáveis `BUILT_IN_FORGE_...` ou AWS S3 (`@aws-sdk/client-s3`). Para migrar 100% para o Google:
1.  Criar um **Google Cloud Storage Bucket**.
2.  Substituir a lógica em `server/storage.ts` para usar a biblioteca `@google-cloud/storage`.
    -   Instalar: `npm install @google-cloud/storage`
    -   Autenticação: O Cloud Run usa a "Service Account" padrão, então não precisa de chaves de API explícitas se as permissões estiverem corretas.

## 5. Próximos Passos Recomendados

1.  **Testar Build Localmente:**
    Execute `docker build -t app-manutencao .` e depois `docker run -p 8080:8080 app-manutencao` para garantir que o container sobe e conecta (se tiver um DB acessível).

2.  **Migração de Dados:**
    Exportar os dados do banco atual (mysqldump) e importar no Cloud SQL.

3.  **Domínio:**
    Após o deploy no Cloud Run, você receberá uma URL `https://app-manutencao-xyz.a.run.app`. Você pode mapear seu domínio personalizado (`appmanutencao.com.br`) diretamente nas configurações do Cloud Run ("Manage Custom Domains").
