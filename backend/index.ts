import express from "express";
import { tavily } from '@tavily/core';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { PROMPT_TEMPLATE, SYSTEM_PROPMT } from "./prompt";

const app = express();
app.use(express.json());

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

app.post("/purplexity_ask", async (req, res) => {
    const query = req.body.query;

    const webSearchResponse = await client.search(query, {
        searchDepth: "advanced"
    });
    const webSearchResult = webSearchResponse.results;

    const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
        .replace("{{USER_QUERY}}", query);

    const result = streamText({
        model: google('gemini-2.0-flash'),
        prompt: prompt,
        system: SYSTEM_PROPMT,
    });

    res.header('Cache-Control', 'no-cache');
    res.header('Content-Type', 'text/event-stream');

    for await (const textPart of result.textStream) {
        res.write(textPart);
    }

    res.write("-------------Sources-------------\n");
    webSearchResult.forEach(result => res.write(JSON.stringify(result)));

    res.end();
});

app.listen(3000);