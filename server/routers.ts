import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc.js";
import { detectionRouter } from "./detection.router.js";
import { getUploadUrl, storagePut } from "./storage.js"; // ✅ добавили storagePut
import { getUserByUsername, createUser } from "./db.js";
import { sdk } from "./_core/sdk.js";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  // Auth procedures
  auth: router({
    register: publicProcedure
      .input(z.object({ username: z.string().min(3), password: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Username already exists" });
        }
        const user = await createUser({
          username: input.username,
          password: input.password, // In production, use bcrypt to hash passwords
          name: input.username,
          role: "user",
        });
        await sdk.createSession(ctx.res, user.id);
        return { success: true, user };
      }),

    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByUsername(input.username);
        if (!user || user.password !== input.password) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }
        await sdk.createSession(ctx.res, user.id);
        return { success: true, user };
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      sdk.clearSession(ctx.res);
      return { success: true };
    }),

    me: publicProcedure.query(async ({ ctx }) => {
      return ctx.user || null;
    }),
  }),

  // Sub-routers
  detection: detectionRouter,

  storage: router({
    // ✅ оставляем как есть (может пригодиться позже)
    getPresignedUrl: protectedProcedure
      .input(z.object({ fileName: z.string(), fileType: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const key = `uploads/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        return await getUploadUrl(key);
      }),

    // ✅ НОВОЕ: upload через backend (без CORS / без direct browser -> B2)
    uploadFile: protectedProcedure
      .input(
        z.object({
          fileName: z.string().min(1),
          mimeType: z.string().min(1),
          fileData: z.string().min(1), // base64 (без data:image/... префикса)
        })
      )
      .mutation(async ({ input, ctx }) => {
        const key = `uploads/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const buffer = Buffer.from(input.fileData, "base64");

        const { url } = await storagePut(key, buffer, input.mimeType);

        return { fileUrl: url, key };
      }),
  }),
});

export type AppRouter = typeof appRouter;
