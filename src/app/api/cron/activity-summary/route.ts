// src/app/api/cron/activity-summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // 1. Xác thực bảo mật: Hỗ trợ cả Vercel Cron Header / CRON_SECRET và Admin session
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";

    let isAuthorized = false;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    } else if (isVercelCron) {
      isAuthorized = true;
    } else {
      // Cho phép Admin bấm nút "Tổng hợp ngay" thủ công từ giao diện
      const session = await auth();
      const userRole = (session?.user as { roleLabel?: string })?.roleLabel || "";
      const isSuperAdmin = (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin;
      if (isSuperAdmin || userRole === "Admin Tổng" || userRole.toLowerCase().includes("gvcn")) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Không được phép truy cập (Unauthorized Cron)" }, { status: 401 });
    }

    // 2. Tính toán khung giờ cần tổng hợp (Mặc định là 1 giờ vừa qua)
    const now = new Date();
    // Làm tròn về đầu giờ hiện tại (VD: 23:00:00)
    const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);
    // Khung giờ 1 tiếng trước (VD: 22:00:00 -> 22:59:59)
    const prevHourStart = new Date(currentHourStart.getTime() - 60 * 60 * 1000);
    const prevHourEnd = new Date(currentHourStart.getTime() - 1);

    // Cũng tổng hợp luôn cả khung giờ hiện tại để dữ liệu biểu đồ luôn mới nhất
    const bucketsToProcess = [prevHourStart, currentHourStart];

    const results = [];

    for (const bucketStart of bucketsToProcess) {
      const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000 - 1);

      // Lấy tất cả logs trong khung giờ này
      const logs = await prisma.activityLog.findMany({
        where: {
          createdAt: {
            gte: bucketStart,
            lte: bucketEnd,
          },
        },
        select: {
          action: true,
          target: true,
          status: true,
          userName: true,
          userId: true,
        },
      });

      let loginCount = 0;
      let createCount = 0;
      let updateCount = 0;
      let deleteCount = 0;
      let otherCount = 0;
      let successCount = 0;
      let failedCount = 0;

      const userMap: Record<string, number> = {};
      const targetMap: Record<string, number> = {};

      for (const log of logs) {
        if (log.action === "LOGIN") loginCount++;
        else if (log.action === "CREATE" || log.action === "REGISTER") createCount++;
        else if (log.action === "UPDATE" || log.action === "CHANGE_PASSWORD" || log.action === "LOCK_PAGE" || log.action === "UNLOCK_PAGE") updateCount++;
        else if (log.action === "DELETE") deleteCount++;
        else otherCount++;

        if (log.status === "SUCCESS") successCount++;
        else failedCount++;

        const uName = log.userName || "Khách";
        userMap[uName] = (userMap[uName] || 0) + 1;

        const tgt = log.target || "Khác";
        targetMap[tgt] = (targetMap[tgt] || 0) + 1;
      }

      const topUsers = Object.entries(userMap)
        .map(([userName, count]) => ({ userName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topTargets = Object.entries(targetMap)
        .map(([target, count]) => ({ target, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const summary = await prisma.activitySummary.upsert({
        where: { timeBucket: bucketStart },
        update: {
          totalActions: logs.length,
          loginCount,
          createCount,
          updateCount,
          deleteCount,
          otherCount,
          successCount,
          failedCount,
          activeUserCount: Object.keys(userMap).length,
          topUsersJson: JSON.stringify(topUsers),
          topTargetsJson: JSON.stringify(topTargets),
        },
        create: {
          timeBucket: bucketStart,
          totalActions: logs.length,
          loginCount,
          createCount,
          updateCount,
          deleteCount,
          otherCount,
          successCount,
          failedCount,
          activeUserCount: Object.keys(userMap).length,
          topUsersJson: JSON.stringify(topUsers),
          topTargetsJson: JSON.stringify(topTargets),
        },
      });

      results.push(summary);
    }

    return NextResponse.json({
      success: true,
      message: `Đã tổng hợp thành công dữ liệu nhật ký hoạt động theo giờ`,
      processedBuckets: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Cron activity summary error:", error);
    return NextResponse.json({ error: "Lỗi chạy cron tổng hợp hoạt động" }, { status: 500 });
  }
}
