import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Local authentication fields */
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const detectionResults = mysqlTable("detection_results", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: mysqlEnum("fileType", ["image", "audio", "video", "text"]).notNull(),
  fileSize: int("fileSize"),
  fileHash: varchar("fileHash", { length: 64 }), // SHA-256 hash for duplicate detection
  s3Key: varchar("s3Key", { length: 512 }),
  verdict: mysqlEnum("verdict", ["ai", "human"]).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
  detectedGenerator: text("detectedGenerator"),
  generatorScores: json("generatorScores"),
  rawResponse: json("rawResponse"),
  processingTimeMs: int("processingTimeMs"),
  isDuplicate: int("isDuplicate").default(0).notNull(), // 1 if cached from previous analysis
  duplicateOfId: int("duplicateOfId"), // Reference to original analysis if duplicate
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DetectionResult = typeof detectionResults.$inferSelect;
export type InsertDetectionResult = typeof detectionResults.$inferInsert;

export const shareLinks = mysqlTable("share_links", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  detectionResultId: int("detectionResultId").notNull(),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(), // Unique token for sharing
  viewCount: int("viewCount").default(0).notNull(), // Track number of views
  lastViewedAt: timestamp("lastViewedAt"), // Track when it was last viewed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // Optional expiration date
});

export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = typeof shareLinks.$inferInsert;
