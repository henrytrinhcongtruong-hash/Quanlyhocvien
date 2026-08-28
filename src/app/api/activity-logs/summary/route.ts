// src/app/api/activity-logs/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userRole = (session.user as { roleLabel?: string })?.roleLabel || "";
    const isSuperAdmin = (session.user as { isSuperAdmin?: boolean })?.isSuperAdmin;
    const isGVCN =
      userRole.toLowerCase().includes("gvcn") ||
      userRole.toLowerCase().includes("chủ nhiệm") ||
      userRole.toLowerCase().includes("giáo viên");

    if (!isSuperAdmin && !isGVCN && userRole !== "Admin Tổng") {
      return NextResponse.json({ error: "Không có quyền truy cập thống kê log" }, { status: 403 });
    }

    // 1. Tính toán thống kê trong 24 giờ qua
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalAllTime,
      todayLogs,
      recentSummaries,
    ] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.findMany({
        where: {
          createdAt: { gte: startOfToday },
        },
        select: {
          action: true,
          target: true,
          status: true,
          userName: true,
          userId: true,
        },
      }),
      prisma.activitySummary.findMany({
        where: {
          timeBucket: { gte: last24h },
        },
        orderBy: { timeBucket: "asc" },
      }),
    ]);

    // Thống kê hôm nay
    const todayTotal = todayLogs.length;
    let todayLogins = 0;
    let todayCreates = 0;
    let todayUpdates = 0;
    let todayDeletes = 0;
    let todaySuccess = 0;
    let todayFailed = 0;

    const userCountMap: Record<string, number> = {};
    const targetCountMap: Record<string, number> = {};

    for (const log of todayLogs) {
      if (log.action === "LOGIN") todayLogins++;
      else if (log.action === "CREATE" || log.action === "REGISTER") todayCreates++;
      else if (log.action === "UPDATE" || log.action === "CHANGE_PASSWORD" || log.action === "LOCK_PAGE" || log.action === "UNLOCK_PAGE") todayUpdates++;
      else if (log.action === "DELETE") todayDeletes++;

      if (log.status === "SUCCESS") todaySuccess++;
      else todayFailed++;

      const uName = log.userName || "Khách";
      userCountMap[uName] = (userCountMap[uName] || 0) + 1;

      const tgt = log.target || "Khác";
      targetCountMap[tgt] = (targetCountMap[tgt] || 0) + 1;
    }

    const topUsers = Object.entries(userCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topTargets = Object.entries(targetCountMap)
      .map(([target, count]) => ({ target, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const successRate = todayTotal > 0 ? Math.round((todaySuccess / todayTotal) * 100) : 100;

    return NextResponse.json({
      success: true,
      data: {
        totalAllTime,
        today: {
          total: todayTotal,
          logins: todayLogins,
          creates: todayCreates,
          updates: todayUpdates,
          deletes: todayDeletes,
          success: todaySuccess,
          failed: todayFailed,
          successRate,
          uniqueUsersCount: Object.keys(userCountMap).length,
        },
        topUsers,
        topTargets,
        hourlySummaries: recentSummaries,
      },
    });
  } catch (error) {
    console.error("GET activity-logs summary error:", error);
    return NextResponse.json({ error: "Lỗi tải dữ liệu tổng hợp" }, { status: 500 });
  }
}
