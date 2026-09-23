import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler, ApiError } from "../http";
import { requireAuth, type AuthContext } from "../middleware";
import { serializeMessage } from "../serializers";

export const conversationsRouter = Router();

const listSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const titleSchema = z.object({
  title: z.string().trim().min(1).max(160),
});

function auth(locals: Record<string, unknown>) {
  return locals.auth as AuthContext;
}

conversationsRouter.get(
  "/conversations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = listSchema.safeParse(req.query);

    if (!parsed.success) {
      throw new ApiError(400, "INVALID_QUERY", "Invalid pagination values.");
    }

    const { cursor, limit } = parsed.data;
    const { userId } = auth(res.locals);

    const results = await prisma.conversation.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit + 1,
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    const conversations = results.slice(0, limit);
    const nextCursor =
      results.length > limit ? conversations.at(-1)?.id ?? null : null;

    res.json({
      data: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messageCount: conversation._count.messages,
      })),
      nextCursor,
    });
  }),
);

conversationsRouter.get(
  "/conversations/:conversationId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = auth(res.locals);

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: req.params.conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
    }

    res.json({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map(serializeMessage),
    });
  }),
);

conversationsRouter.patch(
  "/conversations/:conversationId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = titleSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, "INVALID_BODY", "A valid title is required.");
    }

    const { userId } = auth(res.locals);

    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.conversationId, userId },
      select: { id: true },
    });

    if (!conversation) {
      throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
    }

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title: parsed.data.title },
    });

    res.json({
      id: updated.id,
      title: updated.title,
      updatedAt: updated.updatedAt.toISOString(),
    });
  }),
);

conversationsRouter.delete(
  "/conversations/:conversationId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = auth(res.locals);

    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.conversationId, userId },
      select: { id: true },
    });

    if (!conversation) {
      throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
    }

    await prisma.conversation.delete({
      where: { id: conversation.id },
    });

    res.status(204).send();
  }),
);