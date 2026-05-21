# Deploy para Novo Ambiente Dedicado
# Uso: .\deploy-novo-ambiente.ps1 -ProjectId "id-do-novo-projeto"

param (
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,
    [string]$Region = "us-central1"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Chama o script principal forçando o novo ID e o nome padrão do serviço "app-manutencao"
& "$ScriptDir\deploy.ps1" -ProjectId $ProjectId -ServiceName "app-manutencao" -Region $Region
