#!/usr/bin/env bash
#
# ArqueoFrotas — provisionamento (Ubuntu 24.04, como root).
# Atalho opcional: automatiza as partes MECÂNICAS (Node/pnpm, build, PM2).
# Segredos (senha do MySQL, JWT_SECRET) NÃO ficam aqui — você cria o .env
# manualmente antes de rodar (veja DEPLOY.md). Idempotente o suficiente para
# reexecutar com segurança.
#
# Uso:
#   cd /var/www/arqueofrotas
#   bash deploy/provision.sh
set -euo pipefail

APP_DIR="/var/www/arqueofrotas"
APP_NAME="arqueofrotas"

cd "$APP_DIR"

echo "==> Verificando .env"
if [ ! -f "$APP_DIR/.env" ]; then
  echo "ERRO: $APP_DIR/.env não existe. Crie-o a partir de deploy/.env.example antes de continuar."
  exit 1
fi

echo "==> Habilitando corepack/pnpm"
corepack enable
corepack prepare pnpm@10.4.1 --activate

echo "==> Instalando dependências (frozen lockfile)"
pnpm install --frozen-lockfile

echo "==> Permitindo build scripts nativos (esbuild, oxide)"
pnpm rebuild esbuild @tailwindcss/oxide || true

echo "==> Build de produção (client + server)"
pnpm run build

echo "==> Aplicando migrations do banco (drizzle-kit migrate)"
echo "    (requer DATABASE_URL já configurada no .env e o banco já criado)"
pnpm exec drizzle-kit migrate

echo "==> Iniciando/recarregando no PM2"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.cjs
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save

echo "==> Pronto. App em http://127.0.0.1:8001 (proxied pelo nginx)."
echo "    Próximo passo: criar o admin ->  pnpm create-admin"
