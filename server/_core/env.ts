import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // AWS S3 (opcional para dev)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_BUCKET_NAME: z.string().optional(),
  // SMTP (opcional para dev)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // OAuth
  VITE_APP_ID: z.string().optional(),
  // Em produção DEVE ser definido com segredo forte; em dev usa fallback
  JWT_SECRET: z.string().default("secret-dev-key-change-in-prod"),
  OAUTH_SERVER_URL: z.string().optional(),
  OWNER_OPEN_ID: z.string().optional(),
  BUILT_IN_FORGE_API_URL: z.string().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  // Endereço público do sistema: é o que entra nos links enviados por e-mail.
  APP_URL: z.string().optional(),
  VITE_APP_URL: z.string().optional(),
  // VAPID Push Notifications
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VERCEL_URL: z.string().optional(),
});

// Validar variáveis de ambiente
const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error("❌ Invalid environment variables:", envParse.error.format());
  // Em produção, falhar duro. Em dev, apenas avisar para não travar ferramentas que não precisam de tudo.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid environment variables");
  }
}

const env = envParse.success ? envParse.data : process.env as Record<string, string | undefined>;

export const ENV = {
  appId: env.VITE_APP_ID ?? "",
  cookieSecret: (() => {
    const secret = env.JWT_SECRET ?? 'secret-dev-key-change-in-prod';
    if (env.NODE_ENV === 'production' && (secret === 'secret-dev-key-change-in-prod' || secret.length < 32)) {
      throw new Error('JWT_SECRET must be a strong secret (>=32 chars) in production!');
    }
    return secret;
  })(),
  databaseUrl: env.DATABASE_URL ?? "",
  oAuthServerUrl: env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: env.OWNER_OPEN_ID ?? "",
  isProduction: env.NODE_ENV === "production",
  /**
   * Endereço público, sem barra no fim — a base dos links de e-mail.
   *
   * O padrão é o domínio de produção porque link de recuperação com endereço
   * errado é pior que e-mail nenhum: a pessoa clica, cai em lugar nenhum e
   * conclui que o sistema está fora do ar.
   */
  appUrl: (env.APP_URL || env.VITE_APP_URL || "https://appmanutencao.com.br").replace(/\/+$/, ""),
  forgeApiUrl: env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: env.BUILT_IN_FORGE_API_KEY ?? "",
  // S3
  s3: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION ?? "us-east-1",
    bucketName: env.AWS_BUCKET_NAME ?? "app-manutencao",
    isConfigured: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY),
  },
  // SMTP
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    isConfigured: !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
  },
  // VAPID
  vapid: {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    isConfigured: !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
  },
};
