# Script de Deploy para Google Cloud Run
# App Manutenção - www.appmanutencao.com.br
# Uso: .\deploy.ps1 [-ProjectId <id>] [-ServiceName <name>] [-Region <region>]

param (
    [string]$ProjectId,
    [string]$ServiceName,
    [string]$Region = "us-central1"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY - App Manutenção" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configurações
if (-not $ProjectId -or $ProjectId.Trim().Length -eq 0) {
    $ProjectId = Read-Host "Informe o PROJECT_ID (ex: app-reservas-22746039-d355b)"
}

if (-not $ServiceName -or $ServiceName.Trim().Length -eq 0) {
    $ServiceName = Read-Host "Informe o SERVICE_NAME (ex: app-manutencao)"
}

$PROJECT_ID = $ProjectId
$SERVICE_NAME = $ServiceName
$REGION = $Region
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Build da imagem
Write-Host "[1/2] Fazendo build da imagem Docker..." -ForegroundColor Yellow
Write-Host "Isso pode levar alguns minutos..." -ForegroundColor Gray
gcloud builds submit --tag $IMAGE_NAME --timeout=1200 --project $PROJECT_ID

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha no build!" -ForegroundColor Red
    exit 1
}

# Deploy no Cloud Run
Write-Host "[2/2] Fazendo deploy no Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_NAME `
    --platform managed `
    --region $REGION `
    --project $PROJECT_ID

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha no deploy!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "URL: https://www.appmanutencao.com.br" -ForegroundColor Cyan
