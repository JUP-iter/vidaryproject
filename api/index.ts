import express, { Request, Response } from "express";
import { createContext } from "../server/_core/context.js";
import { appRouter } from "../server/routers.js";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// @ts-ignore
import cookieParser from "cookie-parser";

import uploadHandler from "./upload.js";

const app = express();

// upload ДО json middleware
app.options("/api/upload", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(204).end();
});

app.post("/api/upload", (req, res) => {
  return uploadHandler(req as any, res as any);
});

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("/api/health", (_req: Request, res: Response) => {
  res.send({ status: "ok", time: new Date().toISOString() });
});

export default app;
