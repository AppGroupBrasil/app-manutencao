#!/bin/bash
curl -s -X POST 'http://localhost:8080/api/trpc/auth.loginLocal?batch=1' \
  -H 'Content-Type: application/json' \
  -d '{"0":{"json":{"email":"test@test.com","senha":"123456"}}}'
