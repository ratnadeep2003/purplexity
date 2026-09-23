import { Router } from "express";
import type { Response } from "express";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { tavily } from "@tavily/core";
import { z } from "zod";
import { env } from "../config";
import { prisma } from "../db";
import { asyncHandler, ApiError } from "../http";
import { requireAuth, type AuthContext } from "../middleware";
import { buildPrompt, SYSTEM_PROMPT } from "../prompt";
import {
  normalizeSources,
  parseModelResponse,
  serializeMessage,
} from "../serializers";

export const askRouter = Router();

const tavilyClient = tavily({ apiKey: env.TAVILY_API_KEY });

const askSchema = z.object({
  query: z.string().trim().min(2).max(8_000),
  conversationId: z.string().uuid().optional(),
});

function writeEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function titleFor(query: string) {
  return query.replace(/\s+/g, " ").trim().slice(0, 100);
}

function auth(locals: Record<string, unknown>) {
  return locals.auth as AuthContext;
}

askRouter.post(
  "/ask",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = askSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, "INVALID_BODY", "A valid query is required.");
    }

    const { query, conversationId } = parsed.data;
    const { userId } = auth(res.locals);

    let conversation;

    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });

      if (!conversation) {
        throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
      }
    } else {
      const id = crypto.randomUUID();

      conversation = await prisma.conversation.create({
        data: {
          id,
          userId,
          slug: id,
          title: titleFor(query),
        },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: query,
        role: "User",
      },
    });

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    writeEvent(res, "conversation", {
      id: conversation.id,
      title: conversation.title,
    });

    try {
      writeEvent(res, "status", { phase: "searching" });

      const search = await tavilyClient.search(query, {
        searchDepth: "advanced",
        maxResults: 8,
      });

      const sources = normalizeSources(search.results);

      if (!sources.length) {
        throw new ApiError(
          502,
          "SEARCH_UNAVAILABLE",
          "No usable search sources were returned.",
        );
      }

      writeEvent(res, "status", { phase: "writing" });

      const result = streamText({
        model: google(env.GOOGLE_MODEL),
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(query, sources),
      });

      let fullResponse = "";

      for await (const delta of result.textStream) {
        fullResponse += delta;
        writeEvent(res, "delta", { text: delta });
      }

      const { answer, followUps } = parseModelResponse(fullResponse);

      const assistantMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content: answer,
          role: "Assistant",
          sources,
          followUps,
        },
      });

      const updatedConversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          updatedAt: new Date(),
          title: conversation.title ?? titleFor(query),
        },
      });

      writeEvent(res, "complete", {
        conversation: {
          id: updatedConversation.id,
          title: updatedConversation.title,
          updatedAt: updatedConversation.updatedAt.toISOString(),
        },
        message: serializeMessage(assistantMessage),
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to answer that question right now.";

      console.error(error);
      writeEvent(res, "error", { message });
    } finally {
      res.end();
    }
  }),
);