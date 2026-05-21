import "dotenv/config";
import express from "express";
import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerCronRoutes } from "./cron";
import { rateLimiter, getClientIp } from "./rateLimit";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
// Vite is only used in development - imported dynamically to avoid production errors

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // DB Health Check (Fail Fast)
  const db = await getDb();
  if (!db) {
    console.error("❌ [FATAL] Database connection failed. Exiting...");
    process.exit(1);
  }
  try {
    // Optional: Run a simple query to ensure connectivity
    // await db.execute(sql`SELECT 1`);
    console.log("✅ [System] Database connection verified.");
  } catch (err) {
    console.error("❌ [FATAL] Database query failed on startup:", err);
    process.exit(1);
  }

  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);

  // Canonical host: force non-www to avoid redirect loops
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== "production") return next();

    const host = req.headers.host || "";
    if (host.startsWith("www.")) {
      const targetHost = host.replace(/^www\./, "");
      const targetUrl = `https://${targetHost}${req.originalUrl}`;
      return res.redirect(301, targetUrl);
    }

    next();
  });

  // Compressão gzip/deflate para reduzir tamanho dos assets (~6.3MB → ~1.5MB)
  app.use(compression({
    level: 6,
    threshold: 1024, // Comprimir respostas > 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));
  
  // Configure CORS for hybrid deployment (Vercel frontend + Manus backend)
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://www.appmanutencao.com.br",
    "https://appmanutencao.com.br",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ].filter((url): url is string => !!url);
  
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Produção: whitelist estrita
      // Regras:
      //   1. URLs listadas em allowedOrigins
      //   2. Previews Vercel (deploys de PRs/branches): subdomínio contendo "appmanutencao" em .vercel.app
      //   3. Qualquer subdomínio de appmanutencao.com.br
      //   4. Cloud Run (.run.app) com "appmanutencao" no nome
      if (process.env.NODE_ENV === 'production') {
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (origin.includes("appmanutencao") && origin.endsWith(".vercel.app")) return callback(null, true);
        if (origin.endsWith("appmanutencao.com.br")) return callback(null, true);
        if (origin.includes("appmanutencao") && origin.endsWith(".run.app")) return callback(null, true);
        
        console.warn(`[CORS] Blocked request from: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      }
      
      // Development: Permitir tudo
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }));
  
  // Configure body parser with appropriate size limits
  // TRPC routes need higher limit for base64 image uploads (screenshots, signatures, documents)
  app.use(cookieParser());
  app.use("/api/trpc", express.json({ limit: "10mb" }));
  app.use("/api/trpc", express.urlencoded({ limit: "10mb", extended: true }));
  
  // Global limit for non-TRPC routes (2MB is sufficient)
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  // Digital Asset Links para TWA (Android Trusted Web Activity)
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.appmanutencao.twa",
          sha256_cert_fingerprints: [
            "ED:43:16:30:7E:61:31:79:49:96:1A:03:15:2C:DB:F6:1F:5F:B3:B4:AD:DE:BC:1A:6F:C4:BB:8F:CC:98:4F:6F",
            "6E:81:FE:D3:F3:6C:78:C4:80:D7:F9:35:86:E8:42:EE:EC:B7:2D:10:5C:1B:40:96:00:BA:6D:F8:59:1E:38:D8"
          ]
        }
      }
    ]);
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Cron job routes for automated tasks
  registerCronRoutes(app);
  // Proxy para geocoding reverso (evita CORS do Nominatim) — com rate-limit e cache
  const geocodeCache = new Map<string, { data: any; expiresAt: number }>();
  const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
  app.get("/api/geocode/reverse", async (req, res) => {
    try {
      const ip = getClientIp(req);
      try {
        rateLimiter.check(`geocode:${ip}`, { maxAttempts: 30, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 });
      } catch (e: any) {
        return res.status(429).json({ error: e.message });
      }

      const { lat, lon } = req.query;
      if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });

      const latNum = Number(lat);
      const lonNum = Number(lon);
      if (!Number.isFinite(latNum) || !Number.isFinite(lonNum) || Math.abs(latNum) > 90 || Math.abs(lonNum) > 180) {
        return res.status(400).json({ error: "lat/lon inválidos" });
      }
      const latR = latNum.toFixed(4);
      const lonR = lonNum.toFixed(4);
      const cacheKey = `${latR},${lonR}`;
      const cached = geocodeCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return res.json(cached.data);
      }

      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latR}&lon=${lonR}&format=json&addressdetails=1`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "AppManutencao/1.0 (contato@appmanutencao.com.br)",
          "Accept-Language": "pt-BR",
        },
      });
      const data = await resp.json();
      geocodeCache.set(cacheKey, { data, expiresAt: Date.now() + GEOCODE_TTL_MS });
      // limitar tamanho do cache
      if (geocodeCache.size > 5000) {
        const firstKey = geocodeCache.keys().next().value;
        if (firstKey) geocodeCache.delete(firstKey);
      }
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Rota para gerar PDF de Ordem de Serviço
  app.get("/api/ordens-servico/:id/pdf", async (req, res) => {
    try {
      const osId = parseInt(req.params.id);
      if (isNaN(osId)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      // Usar a mutation de PDF via tRPC
      const context = await createContext({ req, res, info: { remoteAddress: req.ip || "" } } as any);
      const caller = appRouter.createCaller(context);
      
      const result = await caller.ordensServico.generatePDF({ osId });
      
      if (!result.success) {
        return res.status(500).json({ error: "Erro ao gerar PDF" });
      }

      // Converter base64 para buffer
      const pdfBuffer = Buffer.from(result.pdfBase64, "base64");
      
      // Enviar como download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      res.status(500).json({ error: "Erro ao gerar PDF" });
    }
  });

  // Rota para exportar condomínios em JSON (PROTEGIDA - requer autenticação)
  // NOTA: nome legado /api/backup/export mantido para compatibilidade; conteúdo
  // hoje cobre apenas condomínios. Para backup completo, usar pg_dump no servidor.
  app.get(["/api/backup/export", "/api/export/condominios.json"], async (req, res) => {
    try {
      const context = await createContext({ req, res, info: { remoteAddress: req.ip || "" } } as any);
      
      // Verificar autenticação
      if (!context.user) {
        return res.status(401).json({ error: "Autenticação necessária para exportar backup" });
      }
      
      const caller = appRouter.createCaller(context);
      
      // Buscar dados de todos os módulos
      const condominiosList = await caller.condominio.list();
      
      const backupData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        data: {
          condominios: condominiosList,
        },
        metadata: {
          totalRecords: condominiosList.length,
        }
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="backup-app-manutencao-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(backupData);
    } catch (error) {
      console.error("Erro ao exportar backup:", error);
      res.status(500).json({ error: "Erro ao exportar backup" });
    }
  });

  // Rota para exportar condomínios em CSV (PROTEGIDA - requer autenticação)
  app.get(["/api/backup/export-csv", "/api/export/condominios.csv"], async (req, res) => {
    try {
      const context = await createContext({ req, res, info: { remoteAddress: req.ip || "" } } as any);
      
      // Verificar autenticação
      if (!context.user) {
        return res.status(401).json({ error: "Autenticação necessária para exportar backup" });
      }
      
      const caller = appRouter.createCaller(context);
      
      // Buscar condomínios
      const condominiosList = await caller.condominio.list();
      
      // Gerar CSV
      const headers = ['ID', 'Nome', 'CNPJ', 'Cidade', 'Estado', 'Data Criação'];
      const rows = condominiosList.map((c: any) => [
        c.id,
        c.nome,
        c.cnpj || '',
        c.cidade || '',
        c.estado || '',
        new Date(c.createdAt).toLocaleDateString('pt-BR'),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="condominios-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      res.status(500).json({ error: "Erro ao exportar CSV" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  let port: number;
  if (process.env.NODE_ENV === "production") {
    if (!(await isPortAvailable(preferredPort))) {
      console.error(`❌ [FATAL] Port ${preferredPort} is busy in production. Exiting.`);
      process.exit(1);
    }
    port = preferredPort;
  } else {
    port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
