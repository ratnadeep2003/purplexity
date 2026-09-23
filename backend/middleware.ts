import type { NextFunction, Request, Response } from "express";
import { prisma } from "./db";
import { ApiError } from "./http";
import { supabase } from "./client";

export type AuthContext = {
  userId: string;
  email: string;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req.header("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match?.[1]) {
      throw new ApiError(401, "UNAUTHORIZED", "A Bearer token is required.");
    }

    const { data, error } = await supabase.auth.getUser(match[1]);

    if (error || !data.user) {
      throw new ApiError(401, "UNAUTHORIZED", "Your session is invalid or expired.");
    }

    if (!data.user.email) {
      throw new ApiError(400, "PROFILE_INCOMPLETE", "Your account needs an email address.");
    }

    const metadata = data.user.user_metadata as Record<string, unknown>;
    const appMetadata = data.user.app_metadata as Record<string, unknown>;

    await prisma.user.upsert({
      where: { id: data.user.id },
      create: {
        id: data.user.id,
        email: data.user.email,
        name: text(metadata.full_name) ?? text(metadata.name) ?? null,
        avatarUrl: text(metadata.avatar_url) ?? text(metadata.picture) ?? null,
        provider: text(appMetadata.provider) ?? null,
      },
      update: {
        email: data.user.email,
        name: text(metadata.full_name) ?? text(metadata.name) ?? null,
        avatarUrl: text(metadata.avatar_url) ?? text(metadata.picture) ?? null,
        provider: text(appMetadata.provider) ?? null,
      },
    });

    res.locals.auth = {
      userId: data.user.id,
      email: data.user.email,
    } satisfies AuthContext;

    next();
  } catch (error) {
    next(error);
  }
}