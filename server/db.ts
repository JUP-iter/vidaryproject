import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  users, 
  detectionResults, 
  InsertUser, 
  InsertDetectionResult, 
  shareLinks, 
  InsertShareLink 
} from "../drizzle/schema.js";

let pool: mysql.Pool | null = null;
let _db: any = null;

export async function getDb() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not defined");
  if (!pool) {
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      connectionLimit: 1,
    });
  }
  _db = drizzle(pool);
  return _db;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  await db.insert(users).values(user);
  return await getUserByUsername(user.username);
}

export async function createDetectionResult(result: InsertDetectionResult) {
  const db = await getDb();
  const [insertResult] = await db.insert(detectionResults).values(result);
  const [newResult] = await db.select().from(detectionResults).where(eq(detectionResults.id, insertResult.insertId)).limit(1);
  return newResult;
}

export async function getDetectionResult(id: number) {
  const db = await getDb();
  const result = await db.select().from(detectionResults).where(eq(detectionResults.id, id)).limit(1);
  return result[0];
}

export async function getUserDetectionResults(userId: number) {
  const db = await getDb();
  return await db.select().from(detectionResults).where(eq(detectionResults.userId, userId)).orderBy(desc(detectionResults.createdAt));
}

// Исправленные функции для Share Links (используем shareToken вместо slug)
export async function createShareLink(link: InsertShareLink) {
  const db = await getDb();
  await db.insert(shareLinks).values(link);
  const result = await db.select().from(shareLinks).where(eq(shareLinks.shareToken, link.shareToken)).limit(1);
  return result[0];
}

export async function getShareLinkBySlug(slug: string) {
  const db = await getDb();
  const result = await db.select().from(shareLinks).where(eq(shareLinks.shareToken, slug)).limit(1);
  return result[0];
}

// Добавлена недостающая функция для роутера
export async function getShareLinkStats(slug: string) {
  const link = await getShareLinkBySlug(slug);
  return link ? { viewCount: link.viewCount, lastViewedAt: link.lastViewedAt } : null;
}

export async function getDetectionResultByShareSlug(slug: string) {
  const link = await getShareLinkBySlug(slug);
  if (!link) return null;
  return await getDetectionResult(link.detectionResultId);
}

export async function getUserDetectionHistory(userId: number) {
  const db = await getDb();
  return await db.select().from(detectionResults).where(eq(detectionResults.userId, userId)).orderBy(desc(detectionResults.createdAt));
}

export async function getDetectionResultById(id: number) {
  return await getDetectionResult(id);
}

export async function findDuplicateAnalysis(userId: number, fileHash: string) {
  const db = await getDb();
  const result = await db.select().from(detectionResults).where(and(eq(detectionResults.userId, userId), eq(detectionResults.fileHash, fileHash))).limit(1);
  return result[0];
}

export async function getDetectionResultsForExport(userId: number) {
  return await getUserDetectionHistory(userId);
}

export async function getFilteredDetectionHistory(userId: number, filters: any) {
  // Simple implementation for now
  return await getUserDetectionHistory(userId);
}

export async function getShareLink(token: string) {
  return await getShareLinkBySlug(token);
}

export async function incrementShareLinkView(token: string) {
  const db = await getDb();
  const link = await getShareLinkBySlug(token);
  if (link) {
    await db.update(shareLinks).set({ viewCount: (link.viewCount || 0) + 1, lastViewedAt: new Date() }).where(eq(shareLinks.shareToken, token));
  }
}

export async function getUserShareLinks(userId: number) {
  const db = await getDb();
  return await db.select().from(shareLinks).where(eq(shareLinks.userId, userId)).orderBy(desc(shareLinks.createdAt));
}
