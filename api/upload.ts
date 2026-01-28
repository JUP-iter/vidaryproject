// api/upload.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Busboy from "busboy";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const config = {
  api: {
    bodyParser: false, // важно для busboy
  },
};

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function makeS3Client() {
  const accessKeyId = getEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("S3_SECRET_ACCESS_KEY");
  const region = process.env.S3_REGION || "us-east-1";

  // Например для Backblaze B2 S3 endpoint:
  // S3_ENDPOINT=https://s3.us-east-005.backblazeb2.com
  let endpoint = process.env.S3_ENDPOINT;
  if (endpoint && !endpoint.startsWith("http")) endpoint = `https://${endpoint}`;

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    endpoint: endpoint || undefined,
    forcePathStyle: false,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const bucket = getEnv("S3_BUCKET");
    const s3 = makeS3Client();

    const bb = Busboy({ headers: req.headers });

    let gotFile = false;
    let uploadedKey = "";

    const done = new Promise<{ fileUrl: string; key: string }>((resolve, reject) => {
      bb.on("file", (_field, fileStream, info) => {
        gotFile = true;

        const filename = info?.filename || "file";
        const mimeType = (info?.mimeType || "application/octet-stream") as string;

        uploadedKey = `uploads/${Date.now()}-${filename}`.replace(/\s+/g, "_");

        const upload = new Upload({
          client: s3,
          params: {
            Bucket: bucket,
            Key: uploadedKey,
            Body: fileStream,
            ContentType: mimeType,
          },
        });

        upload
          .done()
          .then(async () => {
            // ✅ ВАЖНО: бакет приватный -> отдаём SIGNED URL на чтение
            const signedGetUrl = await getSignedUrl(
              s3,
              new GetObjectCommand({
                Bucket: bucket,
                Key: uploadedKey,
              }),
              { expiresIn: 60 * 10 } // 10 минут
            );

            resolve({ fileUrl: signedGetUrl, key: uploadedKey });
          })
          .catch(reject);
      });

      bb.on("error", reject);

      bb.on("finish", () => {
        if (!gotFile) reject(new Error("No file field provided"));
      });
    });

    req.pipe(bb);

    const { fileUrl, key } = await done;
    return res.status(200).json({ fileUrl, key });
  } catch (e: any) {
    console.error("UPLOAD_ERROR:", e?.stack || e);
    return res.status(500).send("A server error has occurred");
  }
}
