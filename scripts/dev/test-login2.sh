#!/bin/bash
IP=$(docker inspect app-manutencao -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
echo "Container IP: $IP"

# Test request
RESPONSE=$(curl -s -X POST "http://$IP:8080/api/trpc/auth.loginLocal?batch=1" \
  -H 'Content-Type: application/json' \
  -d '{"0":{"json":{"email":"admin@admin.com","senha":"admin123"}}}')

echo "Response: $RESPONSE"
echo ""
echo "=== ALL Logs ==="
docker logs app-manutencao 2>&1
