#!/bin/bash
# Deploy script for Hetzner - App Manutenção
set -e

echo "=== Stopping old container ==="
docker stop app-manutencao 2>/dev/null || true
docker rm app-manutencao 2>/dev/null || true

echo "=== Starting new container ==="
docker run -d \
  --name app-manutencao \
  --network coolify \
  --env-file /apps/manutencao/.env \
  --restart unless-stopped \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.manutencao-http.entrypoints=http" \
  -l "traefik.http.routers.manutencao-http.rule=Host(\`appmanutencao.com.br\`) || Host(\`www.appmanutencao.com.br\`)" \
  -l "traefik.http.routers.manutencao-https.entrypoints=https" \
  -l "traefik.http.routers.manutencao-https.rule=Host(\`appmanutencao.com.br\`) || Host(\`www.appmanutencao.com.br\`)" \
  -l "traefik.http.routers.manutencao-https.tls.certresolver=letsencrypt" \
  -l "traefik.http.services.manutencao.loadbalancer.server.port=8080" \
  app-manutencao:latest

echo "=== Waiting for startup ==="
sleep 5

echo "=== Container status ==="
docker ps --filter name=app-manutencao --format "{{.Names}} {{.Status}}"

echo "=== Logs ==="
docker logs app-manutencao --tail 10 2>&1

echo "=== Done ==="
