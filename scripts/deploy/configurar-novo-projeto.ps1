# Configuração Inicial de Novo Projeto Google Cloud
# Uso: .\configurar-novo-projeto.ps1 -ProjectId "meu-novo-projeto-id"

param (
    [Parameter(Mandatory=$true)]
    [string]$ProjectId
)

Write-Host "Configurando projeto: $ProjectId" -ForegroundColor Cyan

# 1. Definir projeto atual
gcloud config set project $ProjectId

# 2. Ativar APIs necessárias
Write-Host "Ativando APIs (pode demorar um pouco)..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com

Write-Host "APIs ativadas com sucesso!" -ForegroundColor Green
Write-Host "Agora você pode rodar o script de deploy." -ForegroundColor Cyan
