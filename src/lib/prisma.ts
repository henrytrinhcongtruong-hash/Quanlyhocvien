// src/lib/prisma.ts
// Prisma Client singleton - tương thích đa môi trường (Local & Vercel Serverless Writeable SQLite)
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

  // Detect Vercel / AWS Lambda Serverless environment
  const isServerless =
    !!process.env.VERCEL ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NODE_ENV === "production" && process.platform === "linux";

  if (isServerless) {
    const tmpDbPath = "/tmp/dev.db";
    try {
      if (!fs.existsSync(tmpDbPath)) {
        const sourceCandidates = [
          path.join(process.cwd(), "prisma", "dev.db"),
          path.join(process.cwd(), "dev.db"),
          "/var/task/prisma/dev.db",
          "/var/task/dev.db",
        ];
        for (const src of sourceCandidates) {
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, tmpDbPath);
            break;
          }
        }
      }
      if (fs.existsSync(tmpDbPath)) {
        return `file:${tmpDbPath}`;
      }
    } catch (e) {
      console.error("Failed to copy SQLite to /tmp:", e);
    }
  }

  // Local environment
  const candidates = [
    path.join(process.cwd(), "prisma", "dev.db"),
    path.join(process.cwd(), "dev.db"),
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
