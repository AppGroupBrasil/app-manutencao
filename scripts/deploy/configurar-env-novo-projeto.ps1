# Configuração de Variáveis de Ambiente para Novo Projeto
# Uso: .\configurar-env-novo-projeto.ps1 -ProjectId "appmanutencao-4501"

param (
    [Parameter(Mandatory=$true)]
    [string]$ProjectId
)

Write-Host "Configurando variáveis para o projeto: $ProjectId" -ForegroundColor Cyan

# Carrega variáveis do arquivo .env
$envContent = Get-Content .env
$envVars = @{}

foreach ($line in $envContent) {
    if ($line -match "^\s*#" -or $line -match "^\s*$") { continue }
    $parts = $line.Split('=', 2)
    if ($parts.Length -eq 2) {
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        
        # Ignorar variáveis locais que não devem ir pra produção
        # PORT é reservada pelo Cloud Run
        if ($key -ne "NODE_ENV" -and $key -ne "GOOGLE_APPLICATION_CREDENTIALS" -and $key -ne "PORT") {
            $envVars[$key] = $value
        }
    }
}

# Adicionar variáveis específicas de produção
$envVars["NODE_ENV"] = "production"
# Ajustar ID do App em Produção
$envVars["VITE_APP_ID"] = "app-manutencao-prod" 

# Construir string de argumentos
$envString = $envVars.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
$envString = $envString -join ","

Write-Host "Enviando variáveis para o Cloud Run..." -ForegroundColor Yellow

# Atualizar serviço
cmd /c "gcloud run services update app-manutencao --project $ProjectId --region us-central1 --update-env-vars ""$envString"""

if ($LASTEXITCODE -eq 0) {
    Write-Host "Variáveis configuradas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Erro ao configurar variáveis." -ForegroundColor Red
}
