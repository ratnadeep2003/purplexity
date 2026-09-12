import express from "express";
import { tavily } from '@tavily/core';
const app = express();
app.use(express.json());


const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

app.post("/purplexity_ask", async (req, res) => {
    //Step- 1: get the qwery from user
    const qwery = req.body.qwery;


    //Step- 2: make sure user has access/credits to hit the end point


    //Step- 3: check if we have web search indexed for a similar qwery 


    //Step- 4: web search to gather resources 
    const webSearchResponse = await client.search(qwery, { //gives response
        searchDepth: "advanced"
    })
    const webSearchResult = webSearchResponse.results;


    //Step- 5: do some context engineering on the prompt + some web search responses 


    //Step- 6: hit the LLM and stream back the response 


    //Step- 7: also stream back the sources and follow up questions (which we can get from another parallel LLM call)

    
    //Step- 8: close the event stream

})
app.listen(3000)
