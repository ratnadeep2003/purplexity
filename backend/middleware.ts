import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";

const client = createSupabaseClient();

export async function middleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
        return res.status(403).json({ message: "No token provided" });
    }

    try {
        const { data, error } = await client.auth.getUser(token);

        if (error || !data?.user?.id) {
            return res.status(403).json({ message: "Incorrect Inputs" });
        }

        req.userId = data.user.id;
        next();
    } catch (err) {
        return res.status(500).json({ message: "Auth check failed" });
    }
}