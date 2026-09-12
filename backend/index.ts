import "dotenv/config"; // must be first
import express from "express";
import { tavily } from '@tavily/core';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { PROMPT_TEMPLATE, SYSTEM_PROPMT } from "./prompt";
import { prisma } from "./db";
import { middleware } from './middleware';
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

app.get('/conversations', middleware, async (req, res) => {
    res.json({ userId: req.userId });
});

app.get('/conversation/:conversationId', middleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId, userId: req.userId },
        });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        res.json(conversation);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch conversation" });
    }
});

app.post("/purplexity_ask", middleware, async (req, res) => {
    const query = req.body?.query;
    if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "query is required" });
    }

    try {
        const webSearchResponse = await client.search(query, {
            searchDepth: "advanced"
        });
        const webSearchResult = webSearchResponse.results;

        const prompt = PROMPT_TEMPLATE
            .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
            .replace("{{USER_QUERY}}", query);

        const result = streamText({
            model: google('gemini-1.5-flash'), // verify correct model id for your @ai-sdk/google version
            prompt: prompt,
            system: SYSTEM_PROPMT,
        });

        res.header('Content-Type', 'text/plain');

        for await (const textPart of result.textStream) {
            res.write(textPart);
        }

        res.write("\n<SOURCES>\n");
        res.write(JSON.stringify(webSearchResult.map(r => ({ url: r.url }))));
        res.write("\n</SOURCES>\n");

        res.end();
    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).json({ message: "Failed to process query" });
        } else {
            res.end();
        }
    }
});

app.post('/purplexity_ask/follow_up', middleware, async (req, res) => {
    // TODO: implement
    res.status(501).json({ message: "Not implemented" });
});

app.listen(3001, () => console.log("Server running on port 3001"));