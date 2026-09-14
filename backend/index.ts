import "dotenv/config"; // must be first
import express from "express";
import { tavily } from "@tavily/core";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { PROMPT_TEMPLATE, SYSTEM_PROPMT } from "./prompt";
import { prisma } from "./db";
import { middleware, syncSupabaseUser } from "./middleware";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Auth verification & sync endpoint
app.get("/auth/me", middleware, async (req, res) => {
  res.json({
    userId: req.userId,
    user: req.dbUser,
    supabaseUser: {
      id: req.supabaseUser?.id,
      email: req.supabaseUser?.email,
      name: req.dbUser?.name,
      provider: req.dbUser?.provider,
      user_metadata: req.supabaseUser?.user_metadata,
      app_metadata: req.supabaseUser?.app_metadata,
    },
    synced: true,
  });
});

app.post("/auth/sync", middleware, async (req, res) => {
  try {
    const user = await syncSupabaseUser(req.supabaseUser);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: "Failed to sync user", error: String(err) });
  }
});

// Fetch user's conversation threads
app.get("/conversations", middleware, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { id: "desc" },
    });
    res.json(conversations);
  } catch (err) {
    console.error("Failed to fetch conversations:", err);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// Fetch single conversation thread
app.get("/conversation/:conversationId", middleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: req.userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
});

// Main Purplexity search and answer stream
app.post("/purplexity_ask", middleware, async (req, res) => {
  const query = req.body?.query;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ message: "query is required" });
  }

  try {
    const webSearchResponse = await client.search(query, {
      searchDepth: "advanced",
    });
    const webSearchResult = webSearchResponse.results || [];

    // Create conversation record in database
    const title = query.length > 50 ? query.slice(0, 47) + "..." : query;
    const slug = query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50);

    const conversation = await prisma.conversation.create({
      data: {
        userId: req.userId!,
        title,
        slug: slug || "thread",
      },
    });

    // Save user message
    await prisma.message.create({
      data: {
        converstaionId: conversation.id,
        role: "User",
        content: query,
      },
    });

    const prompt = PROMPT_TEMPLATE.replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult)).replace(
      "{{USER_QUERY}}",
      query
    );

    // Using gemini-3.5-flash-lite for fast, high-quality responses
    const result = streamText({
      model: google("gemini-3.5-flash-lite"),
      prompt: prompt,
      system: SYSTEM_PROPMT,
    });

    res.header("Content-Type", "text/plain; charset=utf-8");

    // Output conversation ID meta tag first
    res.write(`<CONVERSATION_ID>${conversation.id}</CONVERSATION_ID>\n`);

    let accumulatedAnswer = "";
    for await (const textPart of result.textStream) {
      accumulatedAnswer += textPart;
      res.write(textPart);
    }

    const sourcesData = webSearchResult.map((r: any) => ({
      title: r.title || r.url,
      url: r.url,
      content: r.content || "",
    }));

    res.write("\n<SOURCES>\n");
    res.write(JSON.stringify(sourcesData));
    res.write("\n</SOURCES>\n");

    // Save assistant message to database asynchronously
    await prisma.message.create({
      data: {
        converstaionId: conversation.id,
        role: "Assistant",
        content: accumulatedAnswer,
      },
    });

    res.end();
  } catch (err) {
    console.error("Purplexity ask error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to process query", error: String(err) });
    } else {
      res.end();
    }
  }
});

// Follow-up query in existing thread
app.post("/purplexity_ask/follow_up", middleware, async (req, res) => {
  const { query, conversationId } = req.body;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ message: "query is required" });
  }
  if (!conversationId || typeof conversationId !== "string") {
    return res.status(400).json({ message: "conversationId is required" });
  }

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: req.userId },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 4 } },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Save user follow-up message
    await prisma.message.create({
      data: {
        converstaionId: conversationId,
        role: "User",
        content: query,
      },
    });

    const webSearchResponse = await client.search(query, {
      searchDepth: "advanced",
    });
    const webSearchResult = webSearchResponse.results || [];

    const prompt = PROMPT_TEMPLATE.replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult)).replace(
      "{{USER_QUERY}}",
      query
    );

    const result = streamText({
      model: google("gemini-3.5-flash-lite"),
      prompt: prompt,
      system: SYSTEM_PROPMT,
    });

    res.header("Content-Type", "text/plain; charset=utf-8");
    res.write(`<CONVERSATION_ID>${conversationId}</CONVERSATION_ID>\n`);

    let accumulatedAnswer = "";
    for await (const textPart of result.textStream) {
      accumulatedAnswer += textPart;
      res.write(textPart);
    }

    const sourcesData = webSearchResult.map((r: any) => ({
      title: r.title || r.url,
      url: r.url,
      content: r.content || "",
    }));

    res.write("\n<SOURCES>\n");
    res.write(JSON.stringify(sourcesData));
    res.write("\n</SOURCES>\n");

    // Save assistant reply
    await prisma.message.create({
      data: {
        converstaionId: conversationId,
        role: "Assistant",
        content: accumulatedAnswer,
      },
    });

    res.end();
  } catch (err) {
    console.error("Follow-up error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to process follow-up", error: String(err) });
    } else {
      res.end();
    }
  }
});

app.listen(3001, () => console.log("Server running on port 3001"));