import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  TAVILY_API_KEY: z.string().min(1),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  GOOGLE_MODEL: z.string().min(1),
  CLIENT_ORIGINS: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid server environment.");
}

export const env = {
  ...parsed.data,
  clientOrigins: parsed.data.CLIENT_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};