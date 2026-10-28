// PM2 process config for ArqueoFrotas.
// Usage (na VPS, a partir da raiz do projeto):
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save
module.exports = {
  apps: [
    {
      name: "arqueofrotas",
      // Roda o bundle de produção gerado por `pnpm build`.
      script: "dist/index.js",
      cwd: "/var/www/arqueofrotas",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      // As variáveis reais vêm do arquivo .env (carregado via dotenv no app).
      // Mantemos aqui apenas o mínimo; o .env tem precedência para segredos.
      env: {
        NODE_ENV: "production",
        PORT: "8001",
        HOST: "127.0.0.1",
      },
      max_memory_restart: "500M",
      autorestart: true,
    },
  ],
};
