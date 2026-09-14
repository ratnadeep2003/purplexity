import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";
import { prisma } from "./db";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      supabaseUser?: any;
      dbUser?: any;
    }
  }
}

const client = createSupabaseClient();

/**
 * Synchronizes a Supabase user object into the Prisma User table using upsert.
 * Ensures display name fallbacks, provider normalization, and handles missing fields cleanly.
 */
export async function syncSupabaseUser(user: any) {
  if (!user || !user.id) return null;

  // Extract display name with fallbacks
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    (user.email ? user.email.split("@")[0] : "User");

  // Extract provider with fallbacks
  const rawProvider =
    user.app_metadata?.provider ||
    (user.app_metadata?.providers && user.app_metadata.providers[0]) ||
    "google";
  const provider = rawProvider.toString().toLowerCase().includes("github") ? "Github" : "Google";

  const email = user.email || "";

  try {
    const synced = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email,
        name,
        provider,
        supabaseId: user.id,
      },
      create: {
        id: user.id,
        supabaseId: user.id,
        email,
        name,
        provider,
      },
    });

    return synced;
  } catch (err) {
    console.error("Failed to sync user to database:", err);
    throw err;
  }
}

export async function middleware(req: Request, res: Response, next: NextFunction) {
  const rawToken = req.headers.authorization;
  if (!rawToken) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  // Support both "Bearer <token>" and raw token
  const token = rawToken.startsWith("Bearer ") ? rawToken.slice(7).trim() : rawToken.trim();

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({
        message: "Invalid or expired authorization token",
        error: error?.message,
      });
    }

    const user = data.user;
    const dbUser = await syncSupabaseUser(user);

    req.userId = user.id;
    req.supabaseUser = user;
    req.dbUser = dbUser;

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ message: "Internal authentication error" });
  }
}