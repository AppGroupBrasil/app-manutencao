# Guia de Migração para Novo Projeto Google Cloud

Para separar o **App Manutenção** em um projeto próprio (isolado do Reservas), siga estes passos:

## 1. Criar o Projeto no Google Cloud
1. Acesse o [Console do Google Cloud](https://console.cloud.google.com/).
2. Crie um novo projeto (ex: `app-manutencao-prod`).
3. Anote o **ID do Projeto** (não é apenas o nome, é o ID único).

## 2. Preparar o Ambiente
Execute o script de configuração que criei (`configurar-novo-projeto.ps1`) para ativar os serviços necessários (Cloud Run, Container Registry, etc).
Você precisará estar logado no terminal (`gcloud auth login`).

```powershell
.\configurar-novo-projeto.ps1 -ProjectId "SEU_NOVO_PROJECT_ID"
```

## 3. Banco de Dados (Dúvida Importante)
Você tem duas opções:

### Opção A: Manter o banco antigo (Mais fácil)
O novo app conecta no banco antigo.
*   **Vantagem:** Dados históricos preservados.
*   **Ação:** Você precisa dar permissão para o "Service Account" do novo projeto acessar o Cloud SQL do projeto antigo.
    1. Pegue o email do serviço do novo projeto (formato: `service-PROJECT_NUMBER@serverless-robot-prod.iam.gserviceaccount.com`).
    2. No projeto ANTIGO, vá em IAM e adicione esse email com o papel "Cloud SQL Client".

### Opção B: Banco Novo (Isolamento total)
Zerar o banco e começar limpo.
*   **Ação:** Criar uma nova instância SQL no novo projeto e rodar as migrações (`pnpm db:push`).

## 4. Fazer o Deploy
Use o novo script de deploy dedicado:

```powershell
.\deploy-novo-ambiente.ps1 -ProjectId "SEU_NOVO_PROJECT_ID"
```

## 5. DNS (Domínio)
Após o deploy, vá no Cloud Run do novo projeto e configure o mapeamento de domínio (`appmanutencao.com.br`) novamente. Lembre-se de atualizar o DNS para apontar para o novo IP.
