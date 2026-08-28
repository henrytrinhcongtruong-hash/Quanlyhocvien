// src/lib/auditLogger.ts
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export interface LogActivityParams {
  userId?: number | null;
  userName?: string | null;
  userRole?: string | null;
  userLop?: string | null;
  action:
    | "LOGIN"
    | "LOGOUT"
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "REGISTER"
    | "LOCK_PAGE"
    | "UNLOCK_PAGE"
    | "EXPORT"
    | "IMPORT"
    | "CHANGE_PASSWORD"
    | "UPDATE_PERMS"
    | string;
  target:
    | "Student"
    | "Attendance"
    | "FeeCollection"
    | "Expense"
    | "SeatingChart"
    | "Timetable"
    | "Event"
    | "ExamSchedule"
    | "DutyRoster"
    | "User"
    | "PageLock"
    | "Auth"
    | string;
  targetId?: string | number | null;
  details?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  status?: "SUCCESS" | "FAILED" | "WARNING";
  req?: NextRequest | Request | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Trích xuất IP Client an toàn từ Request headers
 */
export function extractClientIp(req?: NextRequest | Request | null): string {
  if (!req) return "127.0.0.1";
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim();
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    if (cfConnectingIp) return cfConnectingIp.trim();
  } catch {}
  return "Unknown";
}

/**
 * Trích xuất User-Agent từ Request headers
 */
export function extractUserAgent(req?: NextRequest | Request | null): string {
  if (!req) return "Unknown";
  try {
    return req.headers.get("user-agent") || "Unknown";
  } catch {
    return "Unknown";
  }
}

/**
 * Ghi log thao tác hoạt động của người dùng (ASYNC NON-BLOCKING)
 * Luôn bọc trong try-catch và không bao giờ block luồng chính của API
 */
export function logActivity(params: LogActivityParams): void {
  // Thực thi bất đồng bộ tách biệt, không làm chậm response chính
  Promise.resolve()
    .then(async () => {
      try {
        const ip = params.ipAddress || extractClientIp(params.req);
        const ua = params.userAgent || extractUserAgent(params.req);

        let oldValStr: string | null = null;
        if (params.oldValue !== undefined && params.oldValue !== null) {
          oldValStr =
            typeof params.oldValue === "string"
              ? params.oldValue
              : JSON.stringify(params.oldValue);
        }

        let newValStr: string | null = null;
        if (params.newValue !== undefined && params.newValue !== null) {
          newValStr =
            typeof params.newValue === "string"
              ? params.newValue
              : JSON.stringify(params.newValue);
        }

        await prisma.activityLog.create({
          data: {
            userId: params.userId || null,
            userName: params.userName || "Khách",
            userRole: params.userRole || "Guest",
            userLop: params.userLop || null,
            action: params.action,
            target: params.target,
            targetId: params.targetId ? String(params.targetId) : null,
            details: params.details || null,
            oldValue: oldValStr,
            newValue: newValStr,
            ipAddress: ip,
            userAgent: ua.substring(0, 500),
            status: params.status || "SUCCESS",
          },
        });
      } catch (err) {
        // Ghi log ra console server nếu DB có vấn đề, không throw ra ngoài làm hỏng request
        console.error("Failed to persist activity log:", err);
      }
    })
    .catch((err) => {
      console.error("Unhandled error in logActivity worker:", err);
    });
}
