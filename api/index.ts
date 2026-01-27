import express, { Request, Response } from "express";
// ПУТЬ ПРОВЕРЕН: server/_core/context.ts -> context.js
import { createContext } from "../server/_core/context.js"; 
// ПУТЬ ПРОВЕРЕН: server/routers.ts -> routers.js
import { appRouter } from "../server/routers.js"; 
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// @ts-ignore
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: createContext,
  })
);

app.get("/api/health", (_req: Request, res: Response) => {
  res.send({ status: "ok", time: new Date().toISOString() });
});

export default app;
