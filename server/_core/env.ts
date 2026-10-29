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
};
