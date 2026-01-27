// Preconfigured storage helpers for Manus WebDev templates
// Supports both Biz-provided storage proxy and direct AWS S3
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { ENV } from './_core/env.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// --- Forge Proxy Helpers ---
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  return { baseUrl: baseUrl?.replace(/\/+$/, ""), apiKey };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

// --- AWS S3 Client ---
let s3Client: S3Client | null = null;
function getS3Client() {
  if (s3Client) return s3Client;
  
  const accessKeyId = ENV.s3.accessKeyId?.trim();
  const secretAccessKey = ENV.s3.secretAccessKey?.trim();
  let endpoint = ENV.s3.endpoint?.trim();

  if (!accessKeyId || !secretAccessKey) {
    console.warn("[S3] Missing credentials");
    return null;
  }
  
  // Ensure endpoint has protocol
  if (endpoint && !endpoint.startsWith('http')) {
    endpoint = `https://${endpoint}`;
  }
  
  console.log(`[S3] Initializing client with endpoint: ${endpoint || 'AWS Default'}`);

  s3Client = new S3Client({
    region: ENV.s3.region?.trim() || "us-east-1",
    credentials: { accessKeyId, secretAccessKey },
    endpoint: endpoint || undefined,
    forcePathStyle: true, // Required for Backblaze B2
  });
  return s3Client;
}

// --- Public API ---

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);

  // Try Forge Proxy first
  if (baseUrl && apiKey) {
    const uploadUrl = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
    uploadUrl.searchParams.set("path", key);
    
    const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
    const form = new FormData();
    form.append("file", blob, key.split("/").pop() ?? key);

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: buildAuthHeaders(apiKey),
      body: form,
    });

    if (response.ok) {
      const { url } = await response.json();
      return { key, url };
    }
  }

  // Fallback to direct S3
  const client = getS3Client();
  if (client && ENV.s3.bucket) {
    const command = new PutObjectCommand({
      Bucket: ENV.s3.bucket,
      Key: key,
      Body: data as any,
      ContentType: contentType,
    });
    await (client as any).send(command);
    
    // Construct URL (this assumes public access or specific endpoint)
    const url = ENV.s3.endpoint 
      ? `${ENV.s3.endpoint.replace(/\/+$/, "")}/${ENV.s3.bucket}/${key}`
      : `https://${ENV.s3.bucket}.s3.${ENV.s3.region || "us-east-1"}.amazonaws.com/${key}`;
    
    return { key, url };
  }

  throw new Error("Storage configuration missing: set BUILT_IN_FORGE_API_KEY or S3 credentials");
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);

  // Try Forge Proxy first
  if (baseUrl && apiKey) {
    const downloadApiUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(baseUrl));
    downloadApiUrl.searchParams.set("path", key);
    const response = await fetch(downloadApiUrl, {
      method: "GET",
      headers: buildAuthHeaders(apiKey),
    });
    if (response.ok) {
      const { url } = await response.json();
      return { key, url };
    }
  }

  // Fallback to direct S3 (Presigned URL for download)
  const client = getS3Client();
  if (client && ENV.s3.bucket) {
    const command = new GetObjectCommand({
      Bucket: ENV.s3.bucket,
      Key: key,
    });
    const url = await getSignedUrl(client as any, command as any, { expiresIn: 3600 });
    return { key, url };
  }

  throw new Error("Storage configuration missing");
}

export async function getUploadUrl(
  relKey: string
): Promise<{ key: string; url: string; fields: Record<string, string>; fileUrl: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);

  if (baseUrl && apiKey) {
    const uploadApiUrl = new URL("v1/storage/uploadUrl", ensureTrailingSlash(baseUrl));
    uploadApiUrl.searchParams.set("path", key);

    const response = await fetch(uploadApiUrl, {
      method: "GET",
      headers: buildAuthHeaders(apiKey),
    });

    if (response.ok) {
      const json = await response.json();
      if (json?.url && json?.fields && json?.fileUrl) {
        return { key, url: json.url, fields: json.fields, fileUrl: json.fileUrl };
      }
      throw new Error("Forge proxy must return {url, fields, fileUrl} for POST upload.");
    }
  }

  const client = getS3Client();
  if (client && ENV.s3.bucket && ENV.s3.endpoint) {
    const maxSize = 120 * 1024 * 1024;

    const { url, fields } = await createPresignedPost(client as any, {
      Bucket: ENV.s3.bucket,
      Key: key,
      Expires: 3600,
      Conditions: [
        ["content-length-range", 1, maxSize],
      ],
      Fields: {
        key, // важно
      },
    });

    const base = ENV.s3.endpoint.replace(/\/+$/, "");
    const fileUrl = `${base}/${ENV.s3.bucket}/${key}`;

    return { key, url, fields, fileUrl };
  }

  throw new Error("Storage configuration missing: set forge key or S3 credentials");
}