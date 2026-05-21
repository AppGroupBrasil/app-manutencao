# Script de Automação Total para App Manutenção
# Cria projeto, vincula pagamento e prepara ambiente.

$BillingAccount = "0100F0-59E7FF-41D067" # "Minha conta de faturamento" detectada
$RandomSuffix = Get-Random -Minimum 1000 -Maximum 9999
$ProjectId = "appmanutencao-$RandomSuffix"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " INICIANDO CONFIGURAÇÃO AUTOMÁTICA DE PROJETO" -ForegroundColor Cyan
Write-Host " Novo Projeto ID: $ProjectId" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Criar Projeto
Write-Host "[1/4] Criando projeto no Google Cloud..."
cmd /c "gcloud projects create $ProjectId --name=""App Manutencao"""
if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao criar projeto."; exit 1 }

# 2. Vincular Faturamento
Write-Host "[2/4] Vinculando conta de faturamento..."
cmd /c "gcloud beta billing projects link $ProjectId --billing-account $BillingAccount"
if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao vincular faturamento."; exit 1 }

# 3. Definir Projeto Atual e Ativar APIs
Write-Host "[3/4] Ativando APIs necessárias (isso leva ~1 minuto)..."
cmd /c "gcloud config set project $ProjectId"
cmd /c "gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com sqladmin.googleapis.com"

# 4. Criar Script de Deploy Personalizado para este projeto
Write-Host "[4/4] Gerando script de deploy exclusivo..."
$DeployScriptContent = @"
# Deploy Automático para $ProjectId
`$ScriptDir = Split-Path -Parent `$MyInvocation.MyCommand.Path
& "`$ScriptDir\deploy.ps1" -ProjectId "$ProjectId" -ServiceName "app-manutencao" -Region "us-central1"
"@

$DeployScriptName = "deploy-$ProjectId.ps1"
Set-Content -Path $DeployScriptName -Value $DeployScriptContent

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host " SUCESSO! AMBIENTE PRONTO." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Para fazer o deploy agora, rode:"
Write-Host ".\$DeployScriptName" -ForegroundColor Yellow
