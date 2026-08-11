// Storage helpers with support for:
// 1. Google Cloud Storage (production - recommended)
// 2. Forge API (alternative cloud storage)
// 3. Local storage (development fallback)

import { ENV } from './_core/env';
import * as fs from 'fs';
import * as path from 'path';

// ==================== CONFIGURAÇÕES ====================

type StorageProvider = 'google' | 'forge' | 'local';

interface StorageConfig {
  provider: StorageProvider;
  google?: {
    projectId: string;
    bucketName: string;
    keyFilePath?: string;
  };
  forge?: {
    baseUrl: string;
    apiKey: string;
  };
}

// Diretório para armazenamento local
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads');

// ==================== DETECÇÃO DE PROVIDER ====================

function detectStorageConfig(): StorageConfig {
  // 1. Verificar Google Cloud Storage
  const gcsBucket = process.env.GCS_BUCKET_NAME || process.env.GOOGLE_CLOUD_BUCKET;
  const gcsProjectId = process.env.GCS_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const gcsKeyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (gcsBucket && gcsProjectId) {
    return {
      provider: 'google',
      google: {
        projectId: gcsProjectId,
        bucketName: gcsBucket,
        keyFilePath: gcsKeyFile,
      }
    };
  }

  // 2. Verificar Forge API
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  
  if (forgeUrl && forgeKey) {
    return {
      provider: 'forge',
      forge: {
        baseUrl: forgeUrl.replace(/\/+$/, ""),
        apiKey: forgeKey,
      }
    };
  }

  // 3. Fallback para armazenamento local
  return { provider: 'local' };
}

// Cache da configuração
let cachedConfig: StorageConfig | null = null;
let configLogged = false;

function getConfig(): StorageConfig {
  if (!cachedConfig) {
    cachedConfig = detectStorageConfig();
    if (!configLogged) {
      console.log(`[Storage] Provider: ${cachedConfig.provider.toUpperCase()}`);
      configLogged = true;
    }
  }
  return cachedConfig;
}

// ==================== GOOGLE CLOUD STORAGE ====================

let gcsStorage: any = null;
let gcsBucket: any = null;

async function getGCSBucket() {
  if (!gcsBucket) {
    const config = getConfig();
    if (config.provider !== 'google' || !config.google) {
      throw new Error('Google Cloud Storage não está configurado');
    }

    const { Storage } = await import('@google-cloud/storage');
    
    const storageOptions: any = {
      projectId: config.google.projectId,
    };

    // Se há arquivo de credenciais, usar
    if (config.google.keyFilePath) {
      storageOptions.keyFilename = config.google.keyFilePath;
    }

    gcsStorage = new Storage(storageOptions);
    gcsBucket = gcsStorage.bucket(config.google.bucketName);
  }
  return gcsBucket;
}

async function gcsStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const bucket = await getGCSBucket();
  const key = normalizeKey(relKey);
  const file = bucket.file(key);

  // Converter para Buffer se necessário
  let buffer: Buffer;
  if (typeof data === 'string') {
    buffer = Buffer.from(data);
  } else if (data instanceof Uint8Array) {
    buffer = Buffer.from(data);
  } else {
    buffer = data;
  }

  // Upload do arquivo
  await file.save(buffer, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
    // Com uniform bucket-level access, a visibilidade é controlada no bucket
    // Não precisa de makePublic() individual
  });

  // Gerar URL pública
  const config = getConfig();
  const bucketName = config.google?.bucketName;
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${key}`;
  
  console.log(`[GCS] Upload OK: ${key} → ${publicUrl}`);

  return { key, url: publicUrl };
}

async function gcsStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const config = getConfig();
  const key = normalizeKey(relKey);
  const bucketName = config.google?.bucketName;
  const url = `https://storage.googleapis.com/${bucketName}/${key}`;
  return { key, url };
}

// ==================== FORGE API STORAGE ====================

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return (await response.json()).url;
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

async function forgeStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const config = getConfig();
  if (!config.forge) {
    throw new Error('Forge API não está configurado');
  }

  const { baseUrl, apiKey } = config.forge;
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  
  const url = (await response.json()).url;
  return { key, url };
}

async function forgeStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const config = getConfig();
  if (!config.forge) {
    throw new Error('Forge API não está configurado');
  }

  const { baseUrl, apiKey } = config.forge;
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

// ==================== LOCAL STORAGE ====================

function ensureLocalStorageDir() {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  }
}

async function localStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string
): Promise<{ key: string; url: string }> {
  ensureLocalStorageDir();
  
  const key = normalizeKey(relKey);
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  
  // Criar diretórios intermediários se necessário
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Converter para Buffer se necessário
  let buffer: Buffer;
  if (typeof data === 'string') {
    buffer = Buffer.from(data);
  } else if (data instanceof Uint8Array) {
    buffer = Buffer.from(data);
  } else {
    buffer = data;
  }
  
  // Salvar arquivo
  fs.writeFileSync(filePath, buffer);
  
  // Retornar URL relativa para acesso via servidor
  const url = `/uploads/${key}`;
  
  return { key, url };
}

async function localStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const url = `/uploads/${key}`;
  return { key, url };
}

// ==================== FUNÇÕES AUXILIARES ====================

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

/**
 * Chave relativa, sem barra inicial e sem escapar da pasta base.
 *
 * A chave é montada com dados que vêm do client (a pasta do upload, por
 * exemplo). Sem tirar os `..`, um `folder: "../.."` gravaria por cima de
 * arquivos da aplicação — o `path.join` do armazenamento local resolveria o
 * caminho de bom grado.
 */
export function normalizeKey(relKey: string): string {
  const partes = relKey
    .split(/[\\/]+/)
    .filter((parte) => parte !== "" && parte !== "." && parte !== "..");

  if (partes.length === 0) throw new Error("Caminho de arquivo inválido.");
  return partes.join("/");
}

// ==================== API PÚBLICA ====================

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getConfig();

  switch (config.provider) {
    case 'google':
      return gcsStoragePut(relKey, data, contentType);
    case 'forge':
      return forgeStoragePut(relKey, data, contentType);
    case 'local':
    default:
      return localStoragePut(relKey, data);
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const config = getConfig();

  switch (config.provider) {
    case 'google':
      return gcsStorageGet(relKey);
    case 'forge':
      return forgeStorageGet(relKey);
    case 'local':
    default:
      return localStorageGet(relKey);
  }
}

// Exportar informação sobre o provider atual
export function getStorageProvider(): StorageProvider {
  return getConfig().provider;
}
