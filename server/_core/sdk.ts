import { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { getUserById } from "../db.js";
import { COOKIE_NAME } from "../../shared/const.js";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export class Sdk {
  private parseCookies(cookieHeader?: string): Map<string, string> {
    const cookies = new Map<string, string>();
    if (cookieHeader) {
      const parsed = parseCookieHeader(cookieHeader);
      for (const [key, value] of Object.entries(parsed)) {
        cookies.set(key, value);
      }
    }
    return cookies;
  }

  async createSession(res: Response, userId: number) {
    const token = await new SignJWT({ sub: userId.toString() })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);
    
    (res as any).cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  async authenticateRequest(req: Request) {
    const cookieHeader = (req as any).headers?.cookie;
    const cookies = this.parseCookies(cookieHeader as string | undefined);
    const token = cookies.get(COOKIE_NAME);
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const userId = payload.sub ? parseInt(payload.sub) : null;
      if (!userId) return null;
      return await getUserById(userId);
    } catch (e) {
      return null;
    }
  }

  clearSession(res: Response) {
    (res as any).clearCookie(COOKIE_NAME);
  }
}

export const sdk = new Sdk();
