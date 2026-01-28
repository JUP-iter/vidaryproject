// server/db.ts
import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2"; // ✅ callback-based pool (НЕ mysql2/promise)

import {
  users,
  detectionResults,
  shareLinks,
  type InsertUser,
  type InsertDetectionResult,
  type InsertShareLink,
} from "../drizzle/schema.js";

// Тип базы от drizzle(pool)
type Db = ReturnType<typeof drizzle>;

let pool: mysql.Pool | undefined;
let db: Db | undefined;

export async function getDb(): Promise<Db> {
  if (db) return db;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined");

  if (!pool) {
    // ✅ mysql2 callback pool умеет uri
    pool = mysql.createPool(url);
  }

  db = drizzle(pool);
  return db;
}

/* -------------------- Users -------------------- */

export async function getUserByUsername(username: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return rows[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  await db.insert(users).values(user);
  return await getUserByUsername(user.username);
}

/* -------------------- Detection Results -------------------- */

export type CreateDetectionResultInput = Omit<InsertDetectionResult, "userId">;

/**
 * В роутере у тебя так:
 *   createDetectionResult(ctx.user.id, {...})
 */
export async function createDetectionResult(userId: number, data: CreateDetectionResultInput) {
  const db = await getDb();

  if (!userId) throw new Error("createDetectionResult: userId is required");

  const payload: InsertDetectionResult = {
    ...data,
    userId,
    generatorScores: data.generatorScores ?? {},
    rawResponse: data.rawResponse ?? {},
    // decimal лучше строкой, drizzle/mysql нормально переварит
    confidence: String(data.confidence) as any,
  };

  // ❗ обязательные поля из схемы
  if (!payload.fileName) throw new Error("createDetectionResult: fileName is required");
  if (!payload.fileType) throw new Error("createDetectionResult: fileType is required");
  if (!payload.verdict) throw new Error("createDetectionResult: verdict is required");

  // drizzle(mysql2) возвращает { insertId, ... } в разных формах — достанем надёжно
  const insertRes: any = await db.insert(detectionResults).values(payload);

  const insertedId =
    insertRes?.[0]?.insertId ??
    insertRes?.insertId ??
    insertRes?.[0]?.[0]?.insertId;

  if (insertedId) {
    const rows = await db
      .select()
      .from(detectionResults)
      .where(eq(detectionResults.id, insertedId))
      .limit(1);
    return rows[0];
  }

  // fallback: если insertId не пришёл
  const rows = await db
    .select()
    .from(detectionResults)
    .where(eq(detectionResults.userId, userId))
    .orderBy(desc(detectionResults.createdAt))
    .limit(1);

  return rows[0];
}

export async function getDetectionResult(id: number) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(detectionResults)
    .where(eq(detectionResults.id, id))
    .limit(1);
  return rows[0];
}

export async function getDetectionResultById(id: number) {
  return await getDetectionResult(id);
}

export async function getUserDetectionResults(userId: number) {
  const db = await getDb();
  return await db
    .select()
    .from(detectionResults)
    .where(eq(detectionResults.userId, userId))
    .orderBy(desc(detectionResults.createdAt));
}

export async function getUserDetectionHistory(userId: number, limit = 50) {
  const db = await getDb();
  return await db
    .select()
    .from(detectionResults)
    .where(eq(detectionResults.userId, userId))
    .orderBy(desc(detectionResults.createdAt))
    .limit(limit);
}

export async function findDuplicateAnalysis(userId: number, fileHash: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(detectionResults)
    .where(and(eq(detectionResults.userId, userId), eq(detectionResults.fileHash, fileHash)))
    .limit(1);
  return rows[0];
}

export async function getDetectionResultsForExport(userId: number, _ids?: number[]) {
  return await getUserDetectionHistory(userId, 1000);
}

export async function getFilteredDetectionHistory(userId: number, _filters: any, limit = 50) {
  return await getUserDetectionHistory(userId, limit);
}

/* -------------------- Share Links -------------------- */

export async function createShareLink(link: InsertShareLink) {
  const db = await getDb();
  await db.insert(shareLinks).values(link);

  const rows = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.shareToken, link.shareToken))
    .limit(1);

  return rows[0];
}

export async function getShareLinkBySlug(slug: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.shareToken, slug))
    .limit(1);
  return rows[0];
}

export async function getShareLink(token: string) {
  return await getShareLinkBySlug(token);
}

export async function getShareLinkStats(slug: string) {
  const link = await getShareLinkBySlug(slug);
  return link ? { viewCount: link.viewCount, lastViewedAt: link.lastViewedAt } : null;
}

export async function incrementShareLinkView(token: string) {
  const db = await getDb();
  const link = await getShareLinkBySlug(token);
  if (!link) return;

  await db
    .update(shareLinks)
    .set({ viewCount: (link.viewCount || 0) + 1, lastViewedAt: new Date() })
    .where(eq(shareLinks.shareToken, token));
}

export async function getUserShareLinks(userId: number) {
  const db = await getDb();
  return await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.userId, userId))
    .orderBy(desc(shareLinks.createdAt));
}

export async function getDetectionResultByShareSlug(slug: string) {
  const link = await getShareLinkBySlug(slug);
  if (!link) return null;
  return await getDetectionResult(link.detectionResultId);
}
