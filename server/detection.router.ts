// @ts-nocheck
import { z } from "zod";
import { createHash } from "crypto";
import { protectedProcedure, router } from "./_core/trpc.js";
import {
  detectImageAI,
  detectAudioVoiceAI,
  detectAudioMusicAI,
  detectVideoAI,
  detectTextAI,
  getTopDetectedGenerator,
} from "./aiornot.js";
import {
  createDetectionResult,
  getUserDetectionHistory,
  getDetectionResultById,
  findDuplicateAnalysis,
  getDetectionResultsForExport,
  getFilteredDetectionHistory,
  createShareLink,
  getShareLink,
  incrementShareLinkView,
  getUserShareLinks,
  getShareLinkStats,
} from "./db.js";
import { storagePut, storageGet } from "./storage.js";
import { TRPCError } from "@trpc/server";

// File type validation
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
  "audio/mp4",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_TEXT_LENGTH = 50000; // 50k characters

// Helper function to calculate file hash
function calculateFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// Helper function to generate share token
function generateShareToken(): string {
  return createHash("sha256")
    .update(Math.random().toString() + Date.now().toString())
    .digest("hex")
    .substring(0, 32);
}

export const detectionRouter = router({
  /**
   * Analyze an image for AI-generated content
   */
  analyzeImage: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        fileData: z.string(), // base64 encoded
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
        });
      }

      // Decode and validate file size
      const fileBuffer = Buffer.from(input.fileData, "base64");
      if (fileBuffer.length > MAX_IMAGE_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Image too large. Maximum size: 10MB`,
        });
      }

      try {
        // Calculate file hash for duplicate detection
        const fileHash = calculateFileHash(fileBuffer);

        // Check for duplicate analysis
        const duplicate = await findDuplicateAnalysis(ctx.user.id, fileHash);
        if (duplicate) {
          console.log(`[Detection] Found cached result for image hash ${fileHash}`);
          const fileUrl = duplicate.s3Key ? (await storageGet(duplicate.s3Key)).url : "";
          return {
            success: true,
            verdict: duplicate.verdict as "ai" | "human",
            confidence: duplicate.confidence.toString(),
            detectedGenerator: duplicate.detectedGenerator,
            fileUrl,
            processingTimeMs: 0,
            isCached: true,
          };
        }

        // Call AI or Not API
        const apiResponse = await detectImageAI(fileBuffer, input.fileName);
        const processingTime = Date.now() - startTime;

        // Extract verdict and confidence
        const aiGenerated = apiResponse.report.ai_generated;
        const verdict = aiGenerated.verdict;
        const confidencePercent = Math.round(parseFloat(aiGenerated.ai.confidence.toString()) * 100);
        const confidence = (confidencePercent / 100).toFixed(4);
        const detectedGenerator = getTopDetectedGenerator(
          aiGenerated.generator
        );

        // Store file in S3
        const s3Key = `detections/${ctx.user.id}/images/${Date.now()}-${input.fileName}`;
        const { url: fileUrl } = await storagePut(
          s3Key,
          fileBuffer,
          input.mimeType
        );

        // Save result to database
        await createDetectionResult({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileType: "image",
          fileSize: fileBuffer.length,
          fileHash,
          s3Key,
          verdict,
          confidence: confidence,
          detectedGenerator,
          generatorScores: {},
          rawResponse: apiResponse.report,
          processingTimeMs: processingTime,
          isDuplicate: 0,
        });

        return {
          success: true,
          verdict,
          confidence: confidence.toString(),
          detectedGenerator,
          fileUrl,
          processingTimeMs: processingTime,
          isCached: false,
        };
      } catch (error: any) {
        console.error("[Detection] Image analysis failed:", error);
        
        // Check for API plan limitation
        if (error?.message?.includes("402") || error?.message?.includes("Paid plan")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Image detection is not available with the current API plan. Please upgrade your account.",
          });
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to analyze image. Please try again.",
        });
      }
    }),

  /**
   * Analyze audio for AI-generated content
   */
  analyzeAudio: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        fileData: z.string().optional(),
        fileUrl: z.string().optional(),
        mimeType: z.string(),
        audioType: z.enum(["voice", "music"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

      if (!ALLOWED_AUDIO_TYPES.includes(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid audio type. Allowed: ${ALLOWED_AUDIO_TYPES.join(", ")}`,
        });
      }

      let fileBuffer: Buffer;
      if (input.fileUrl) {
        const response = await fetch(input.fileUrl);
        fileBuffer = Buffer.from(await response.arrayBuffer());
      } else if (input.fileData) {
        fileBuffer = Buffer.from(input.fileData, "base64");
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No file data provided" });
      }

      if (fileBuffer.length > MAX_AUDIO_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Audio too large. Maximum size: 50MB`,
        });
      }

      try {
        // Calculate file hash for duplicate detection
        const fileHash = calculateFileHash(fileBuffer);

        // Check for duplicate analysis
        const duplicate = await findDuplicateAnalysis(ctx.user.id, fileHash);
        if (duplicate) {
          console.log(`[Detection] Found cached result for audio hash ${fileHash}`);
          const fileUrl = duplicate.s3Key ? (await storageGet(duplicate.s3Key)).url : "";
          return {
            success: true,
            verdict: duplicate.verdict as "ai" | "human",
            confidence: duplicate.confidence.toString(),
            detectedGenerator: duplicate.detectedGenerator,
            fileUrl,
            processingTimeMs: 0,
            isCached: true,
          };
        }

        const apiResponse =
          input.audioType === "voice"
            ? await detectAudioVoiceAI(fileBuffer, input.fileName)
            : await detectAudioMusicAI(fileBuffer, input.fileName);

        const processingTime = Date.now() - startTime;

        const aiGenerated = apiResponse.report.ai_generated;
        const verdict = aiGenerated.verdict;
        const confidencePercent = Math.round(parseFloat(aiGenerated.ai.confidence.toString()) * 100);
        const confidence = (confidencePercent / 100).toFixed(4);
        const detectedGenerator = getTopDetectedGenerator(
          aiGenerated.generator
        );

        const s3Key = `detections/${ctx.user.id}/audio/${Date.now()}-${input.fileName}`;
        const { url: fileUrl } = await storagePut(
          s3Key,
          fileBuffer,
          input.mimeType
        );

        await createDetectionResult({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileType: "audio",
          fileSize: fileBuffer.length,
          fileHash,
          s3Key,
          verdict,
          confidence: confidence,
          detectedGenerator,
          generatorScores: {},
          rawResponse: apiResponse.report,
          processingTimeMs: processingTime,
          isDuplicate: 0,
        });

        return {
          success: true,
          verdict,
          confidence: confidence.toString(),
          detectedGenerator,
          fileUrl,
          processingTimeMs: processingTime,
          isCached: false,
        };
      } catch (error: any) {
        console.error("[Detection] Audio analysis failed:", error);

        if (error?.message?.includes("402") || error?.message?.includes("Paid plan")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Audio detection is not available with the current API plan. Please upgrade your account.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to analyze audio. Please try again.",
        });
      }
    }),

  /**
   * Analyze video for AI-generated content
   */
  analyzeVideo: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        fileData: z.string().optional(), // base64 encoded
        fileUrl: z.string().optional(), // direct URL
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

      if (!ALLOWED_VIDEO_TYPES.includes(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid video type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
        });
      }

      let fileBuffer: Buffer;
      if (input.fileUrl) {
        const response = await fetch(input.fileUrl);
        fileBuffer = Buffer.from(await response.arrayBuffer());
      } else if (input.fileData) {
        fileBuffer = Buffer.from(input.fileData, "base64");
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No file data provided" });
      }

      if (fileBuffer.length > MAX_VIDEO_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Video too large. Maximum size: 100MB`,
        });
      }

      try {
        const fileHash = calculateFileHash(fileBuffer);
        const duplicate = await findDuplicateAnalysis(ctx.user.id, fileHash);
        if (duplicate) {
          const fileUrl = duplicate.s3Key ? (await storageGet(duplicate.s3Key)).url : "";
          return {
            success: true,
            verdict: duplicate.verdict as "ai" | "human",
            confidence: duplicate.confidence.toString(),
            detectedGenerator: duplicate.detectedGenerator,
            fileUrl,
            processingTimeMs: 0,
            isCached: true,
          };
        }

        const apiResponse = await detectVideoAI(fileBuffer, input.fileName);
        const processingTime = Date.now() - startTime;

        const verdict = apiResponse.report.ai_video.is_detected ? "ai" : "human";
        const confidence = apiResponse.report.ai_video.confidence.toFixed(4);
        
        const s3Key = `detections/${ctx.user.id}/video/${Date.now()}-${input.fileName}`;
        const { url: fileUrl } = await storagePut(
          s3Key,
          fileBuffer,
          input.mimeType
        );

        await createDetectionResult({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileType: "video",
          fileSize: fileBuffer.length,
          fileHash,
          s3Key,
          verdict,
          confidence: confidence,
          detectedGenerator: null,
          generatorScores: {},
          rawResponse: apiResponse.report,
          processingTimeMs: processingTime,
          isDuplicate: 0,
        });

        return {
          success: true,
          verdict,
          confidence: confidence.toString(),
          detectedGenerator: null,
          fileUrl,
          processingTimeMs: processingTime,
          isCached: false,
        };
      } catch (error: any) {
        console.error("[Detection] Video analysis failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to analyze video. Please try again.",
        });
      }
    }),

  /**
   * Analyze text for AI-generated content
   */
  analyzeText: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(MAX_TEXT_LENGTH) }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

      try {
        const apiResponse = await detectTextAI(input.text);
        const processingTime = Date.now() - startTime;

        const aiGenerated = apiResponse.report.ai_generated;
        const verdict = aiGenerated.verdict;
        const confidence = aiGenerated.ai.confidence.toFixed(4);
        const detectedGenerator = getTopDetectedGenerator(aiGenerated.generator);

        await createDetectionResult({
          userId: ctx.user.id,
          fileName: "text_input",
          fileType: "text",
          fileSize: Buffer.byteLength(input.text),
          fileHash: createHash("sha256").update(input.text).digest("hex"),
          s3Key: null,
          verdict,
          confidence: confidence,
          detectedGenerator,
          generatorScores: {},
          rawResponse: apiResponse.report,
          processingTimeMs: processingTime,
          isDuplicate: 0,
        });

        return {
          success: true,
          verdict,
          confidence: confidence.toString(),
          detectedGenerator,
          fileUrl: "",
          processingTimeMs: processingTime,
        };
      } catch (error: any) {
        console.error("[Detection] Text analysis failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to analyze text. Please try again.",
        });
      }
    }),

  /**
   * Get user's detection history
   */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return await getUserDetectionHistory(ctx.user.id);
    }),

  /**
   * Get a specific detection result by ID
   */
  getResult: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getDetectionResultById(input.id, ctx.user.id);
    }),

  /**
   * Get filtered detection history
   */
  getFilteredHistory: protectedProcedure
    .input(
      z.object({
        verdict: z.enum(["ai", "human"]).optional(),
        fileType: z.enum(["image", "audio", "video", "text"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getFilteredDetectionHistory(
        ctx.user.id,
        {
          verdict: input.verdict,
          fileType: input.fileType,
          startDate: input.startDate,
          endDate: input.endDate,
        },
        input.limit
      );
    }),

  /**
   * Export detection results
   */
  exportResults: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
        format: z.enum(["csv", "json"]),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const results = await getDetectionResultsForExport(ctx.user.id, input.ids);

        if (input.format === "json") {
          return { success: true, data: results, format: "json" };
        }

        const headers = ["ID", "File Name", "File Type", "Verdict", "Confidence", "Generator", "Date"];
        const rows = results.map((r) => [
          r.id,
          r.fileName,
          r.fileType,
          r.verdict,
          (parseFloat(r.confidence as any) * 100).toFixed(2) + "%",
          r.detectedGenerator || "N/A",
          new Date(r.createdAt).toISOString(),
        ]);

        const csvContent = [
          headers.join(","),
          ...rows.map((row) => row.map((cell) => typeof cell === "string" && cell.includes(",") ? `"${cell}"` : cell).join(","))
        ].join("\n");

        return { success: true, data: csvContent, format: "csv" };
      } catch (error) {
        console.error("[Detection] Export failed:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to export results." });
      }
    }),

  createShareLink: protectedProcedure
    .input(z.object({ detectionResultId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await getDetectionResultById(input.detectionResultId, ctx.user.id);
        if (!result) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Detection result not found" });
        }
        const shareToken = generateShareToken();
        await createShareLink({
          userId: ctx.user.id,
          detectionResultId: input.detectionResultId,
          shareToken,
        });
        return { success: true, shareToken, shareUrl: `/share/${shareToken}` };
      } catch (error: any) {
        console.error("[Detection] Share link creation failed:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create share link" });
      }
    }),

  getShareStats: protectedProcedure
    .input(z.object({ shareToken: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const shareLink = await getShareLink(input.shareToken);
        if (!shareLink || shareLink.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found" });
        }
        return await getShareLinkStats(input.shareToken);
      } catch (error: any) {
        console.error("[Detection] Share stats retrieval failed:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve share statistics" });
      }
    }),

  getUserShareLinks: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getUserShareLinks(ctx.user.id);
    } catch (error: any) {
      console.error("[Detection] User share links retrieval failed:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve share links" });
    }
  }),
});
