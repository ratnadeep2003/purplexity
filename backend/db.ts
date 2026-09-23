import { PrismaClient } from "./prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./config";

const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
})

export const prisma = new PrismaClient({
    adapter,
});