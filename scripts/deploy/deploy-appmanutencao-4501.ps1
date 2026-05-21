# Deploy Automático para appmanutencao-4501
# IMPORTANTE: O domínio www.appmanutencao.com.br está mapeado para o serviço 'appmanutencao-4501'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$ScriptDir\deploy.ps1" -ProjectId "appmanutencao-4501" -ServiceName "appmanutencao-4501" -Region "us-central1"
