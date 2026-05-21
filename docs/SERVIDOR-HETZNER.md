# Servidor Hetzner — Acesso Rápido

## SSH
- **IP**: 46.225.191.114
- **Usuário**: root
- **Chave SSH**: ~/.ssh/hetzner_key
- **Comando**: `ssh -i ~/.ssh/hetzner_key root@46.225.191.114`

## Infraestrutura
- **OS**: Ubuntu 22.04.5 LTS
- **Recursos**: 2 vCPU | 4GB RAM + 4GB Swap | 38GB disco
- **Proxy**: Traefik v3.6 (via Coolify)
- **SSL**: LetsEncrypt
- **Rede Docker**: coolify
- **Painel Coolify**: http://46.225.191.114:8000

## App Manutenção
- **Container**: app-manutencao
- **Porta**: 8080
- **Código no servidor**: /apps/manutencao/
- **Domínio**: appmanutencao.com.br / www.appmanutencao.com.br
- **DNS**: Cloudflare → Hetzner (Traefik) → Container

## Comandos Úteis
```bash
# Listar containers
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker ps"

# Logs do container
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker logs app-manutencao --tail 50"

# Restart container
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker restart app-manutencao"

# Rebuild e restart
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "cd /apps/manutencao && docker build -t app-manutencao:latest . && docker stop app-manutencao && docker rm app-manutencao && docker run -d --name app-manutencao --network coolify -l 'traefik.enable=true' -l 'traefik.http.routers.manutencao-http.entrypoints=http' -l 'traefik.http.routers.manutencao-http.rule=Host(\`appmanutencao.com.br\`) || Host(\`www.appmanutencao.com.br\`)' -l 'traefik.http.routers.manutencao-https.entrypoints=https' -l 'traefik.http.routers.manutencao-https.rule=Host(\`appmanutencao.com.br\`) || Host(\`www.appmanutencao.com.br\`)' -l 'traefik.http.routers.manutencao-https.tls.certresolver=letsencrypt' -l 'traefik.http.services.manutencao.loadbalancer.server.port=8080' app-manutencao:latest"
```
