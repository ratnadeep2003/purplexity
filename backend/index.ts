import express from "express";
import { z } from "zod";
import { tavily } from '@tavily/core';
import { streamText, Output } from 'ai';
import { PROMPT_TEMPLATE, SYSTEM_PROPMT } from "./prompt";
const app = express();
app.use(express.json());


const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

app.post("/purplexity_ask", async (req, res) => {
    //Step- 1: get the query from user
    const query = req.body.query;


    //Step- 2: make sure user has access/credits to hit the end point


    //Step- 3: check if we have web search indexed for a similar query 


    //Step- 4: web search to gather resources 
    const webSearchResponse = await client.search(query, { //gives response
        searchDepth: "advanced"
    })
    const webSearchResult = webSearchResponse.results;


    //Step- 5: do some context engineering on the prompt + some web search responses 


    //Step- 6: hit the LLM and stream back the response 
    //how to hit llm ? -> vercel ai gateway

    const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
        .replace("{{USER_QUERY}}", query)

    const result = await streamText({
        model: 'openai/gpt-5.6-sol',
        prompt: prompt,
        system: SYSTEM_PROPMT,
        output: Output.object({
            schema: z.object({
                followUps: z.array(z.string()),
                answer: z.string()
            }),
        }),
    });

    for await (const textPart of result.textStream){
        res.write(textPart);
    }

    res.write("-------------Sources-------------\n")
    //Step- 7: also stream back the sources and follow up questions (which we can get from another parallel LLM call)
    webSearchResult.forEach(result=>res.write(JSON.stringify(result)));
    

    //Step- 8: close the event stream
    res.end();

})
app.listen(3000)
