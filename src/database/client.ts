import { PrismaClient } from "@prisma/client";

declare global {
    var prisma: PrismaClient | undefined;
}

const prismaClient =
    global.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development"
            ? ["error", "warn"]
            : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    global.prisma = prismaClient;
}

export default prismaClient;
