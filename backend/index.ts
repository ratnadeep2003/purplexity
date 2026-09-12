import express from "express";
import { tavily } from '@tavily/core';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { PROMPT_TEMPLATE, SYSTEM_PROPMT } from "./prompt";
import { prisma } from "./db";
const app = express();
app.use(express.json());


const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

//Signin
app.post('/signin', async(req,res)=>{

})

//Past conversations get
app.get('/conversations',async(req,res)=>{

})

//Past conversations get
app.get('/conversation/:conversationId',async(req,res)=>{
    
})


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

    const result = streamText({
        model: google('gemini-3.6-flash'),
        prompt: prompt,
        system: SYSTEM_PROPMT,
    });

    res.header('Content-Type', 'text/plain');

    for await (const textPart of result.textStream) {
        res.write(textPart);
    }

    res.write("\n<SOURCES>\n");
    //Step- 7: also stream back the sources and follow up questions (which we can get from another parallel LLM call)
    res.write(JSON.stringify(webSearchResult.map(result => ({url: result.url}))));
    
    res.write("\n</SOURCES>\n");


    //Step- 8: close the event stream
    res.end();

})

app.post('/purplexity_ask/follow_up', async(req,res)=>{
    //Step -1: get the existing chat from db
    //Step -2: forward the full hisyry to llm
    //Step -3: forward the full history to user

})
app.listen(3000)