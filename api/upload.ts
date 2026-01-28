// api/upload.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import busboy from "busboy";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export const config = {
  api: { bodyParser: false },
};

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function makeS3Client() {
  const accessKeyId = mustEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = mustEnv("S3_SECRET_ACCESS_KEY");
  const region = process.env.S3_REGION || "us-east-1";

  let endpoint = process.env.S3_ENDPOINT;
  if (endpoint && !endpoint.startsWith("http")) endpoint = `https://${endpoint}`;

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    endpoint: endpoint || undefined,
    // ✅ для Backblaze B2 чаще нужно TRUE
    forcePathStyle: true,
  });
}

export default async function handler(req: IncomingMessage & { method?: string; headers: any }, res: ServerResponse & any) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      return res.end();
    }
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Method Not Allowed" }));
    }

    const bucket = mustEnv("S3_BUCKET");
    const publicBase = mustEnv("S3_PUBLIC_BASE").replace(/\/+$/, "");
    const s3 = makeS3Client();

    const bb = busboy({ headers: req.headers });

    let gotFile = false;

    const result = await new Promise<{ fileUrl: string }>((resolve, reject) => {
      bb.on("file", (_fieldname, fileStream, info) => {
        gotFile = true;

        const filename = (info?.filename || "file").replace(/[^\w.\-]+/g, "_");
        const mimeType = (info?.mimeType || "application/octet-stream") as string;
        const key = `uploads/${Date.now()}-${filename}`;

        const up = new Upload({
          client: s3,
          params: {
            Bucket: bucket,
            Key: key,
            Body: fileStream,
            ContentType: mimeType,
          },
        });

        up.done()
          .then(() => resolve({ fileUrl: `${publicBase}/${key}` }))
          .catch(reject);
      });

      bb.on("error", reject);

      bb.on("finish", () => {
        if (!gotFile) reject(new Error("No file field provided"));
      });

      // Важно: pipe AFTER handlers
      req.pipe(bb);
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(result));
  } catch (e: any) {
    // ✅ чтобы не гадать — вернём причину (без секретов)
    console.error("UPLOAD_ERROR:", e?.stack || e);

    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Upload failed", message: String(e?.message || e) }));
  }
}
