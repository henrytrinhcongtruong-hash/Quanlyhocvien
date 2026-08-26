// src/lib/prisma.ts
// Prisma Client singleton - tương thích đa môi trường (Local & Vercel Serverless)
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDbUrl(): string {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:")) {
    return process.env.DATABASE_URL;
  }
  const candidates = [
    path.join(process.cwd(), "prisma", "dev.db"),
    path.join(process.cwd(), "dev.db"),
    "/var/task/prisma/dev.db",
    "/var/task/dev.db",
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return `file:${c}`;
    } catch {
      // ignore
    }
  }
  return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDbUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
