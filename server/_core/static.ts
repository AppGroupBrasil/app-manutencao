import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const distPublicPath = path.resolve(process.cwd(), "dist", "public");
  const distPublicFallback = path.resolve(moduleDir, "public");
  const distPublicFallbackParent = path.resolve(moduleDir, "..", "public");
  const distPublicFallbackFromRoot = path.resolve(moduleDir, "..", "..", "dist", "public");
  const distCandidates = [
    distPublicPath,
    distPublicFallback,
    distPublicFallbackParent,
    distPublicFallbackFromRoot,
  ];
  const distPath = distCandidates.find((candidate) => fs.existsSync(candidate)) ?? distPublicPath;

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory. Tried: ${distCandidates.join(", ")}`
    );
  }

  // Servir arquivos do diretório de uploads local
  const uploadsPath = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsPath));

  // Assets com hash (ex: index-abc123.js) → cache longo (1 ano)
  const assetsPath = path.resolve(distPath, "assets");
  if (fs.existsSync(assetsPath)) {
    app.use("/assets", express.static(assetsPath, {
      maxAge: '1y',
      immutable: true,
    }));
  }

  /**
   * Demais arquivos estáticos → cache curto (10 min).
   *
   * Menos o `index.html`: é ele que aponta para o pacote com hash, então
   * guardá-lo por 10 minutos significa entregar a versão anterior a quem abrir
   * o sistema logo depois de uma publicação — foi o que aconteceu em
   * 13/08/2026, com o cliente jurando que "está igual" enquanto o servidor já
   * tinha o novo. O HTML é pequeno; revalidar sempre não custa nada.
   */
  app.use(
    express.static(distPath, {
      maxAge: '10m',
      setHeaders: (res, caminho) => {
        if (caminho.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
