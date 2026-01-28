// api/upload.ts
import busboy from "busboy";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export const config = {
  api: { bodyParser: false }, // важно для multipart
};

function mustEnv(name: string) {
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
    forcePathStyle: false,
  });
}

function json(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  try {
    // CORS (можно оставить)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });

    const bucket = mustEnv("S3_BUCKET");
    const publicBase = mustEnv("S3_PUBLIC_BASE"); // напр: https://s3.us-east-005.backblazeb2.com/your-bucket
    const s3 = makeS3Client();

    const bb = busboy({ headers: req.headers });

    let gotFile = false;
    let resolveDone: (v: { fileUrl: string }) => void;
    let rejectDone: (e: any) => void;

    const done = new Promise<{ fileUrl: string }>((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    });

    bb.on("file", (_field: string, fileStream: any, info: any) => {
      gotFile = true;

      const filename = (info?.filename || "file").replace(/\s+/g, "_");
      const mimeType = (info?.mimeType || "application/octet-stream") as string;

      const key = `uploads/${Date.now()}-${filename}`;

      const uploader = new Upload({
        client: s3,
        params: {
          Bucket: bucket,
          Key: key,
          Body: fileStream,
          ContentType: mimeType || undefined,
        },
      });

      uploader
        .done()
        .then(() => {
          const base = publicBase.replace(/\/+$/, "");
          resolveDone({ fileUrl: `${base}/${key}` });
        })
        .catch(rejectDone);
    });

    bb.on("error", (err: any) => rejectDone(err));
    bb.on("finish", () => {
      if (!gotFile) rejectDone(new Error("No file field provided (expected form field 'file')"));
    });

    req.pipe(bb);

    const { fileUrl } = await done;
    return json(res, 200, { fileUrl });
  } catch (e: any) {
    console.error("UPLOAD_ERROR:", e?.stack || e);
    // вернём JSON, чтобы фронт не падал на “Unexpected token …”
    return json(res, 500, { error: "UPLOAD_FAILED", message: e?.message || "Server error" });
  }
}
