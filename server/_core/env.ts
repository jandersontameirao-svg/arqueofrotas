export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // OpenAI (login/IA própria). Caem para os valores do Forge/Manus se não definidos.
  openaiApiKey: process.env.OPENAI_API_KEY ?? process.env.BUILT_IN_FORGE_API_KEY ?? "",
  openaiBaseUrl:
    process.env.OPENAI_BASE_URL ?? process.env.BUILT_IN_FORGE_API_URL ?? "https://api.openai.com",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-6-luna",
  // SMTP para envio de emails (notificações). Se SMTP_HOST estiver vazio, o
  // envio é desativado silenciosamente (o painel continua funcionando).
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? "587"),
  smtpSecure: process.env.SMTP_SECURE === "true", // true = porta 465 (SSL)
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "ArqueoFrotas <no-reply@arqueofrotas.sigpa.com.br>",
  appBaseUrl: process.env.APP_BASE_URL ?? "https://arqueofrotas.sigpa.com.br",
};
