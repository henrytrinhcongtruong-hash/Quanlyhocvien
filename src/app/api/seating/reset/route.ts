import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateEmptySlots } from "@/lib/seatingTypes";
import { logActivity } from "@/lib/auditLogger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop") || "12T2";
    const month = searchParams.get("month") || "Tháng 09/2025";

    const existing = await prisma.seatingChart.findFirst({
      where: { lop, month },
    });

    let currentRows = 7;
    if (existing?.slotsData) {
      try {
        const parsed = JSON.parse(existing.slotsData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentRows = Math.max(7, ...parsed.map((s: { row?: number }) => s.row || 0));
        }
      } catch {}
    }

    const emptySlots = generateEmptySlots(currentRows);

    if (existing) {
      await prisma.seatingChart.update({
        where: { id: existing.id },
        data: {
          slotsData: JSON.stringify(emptySlots),
        },
      });
    } else {
      await prisma.seatingChart.create({
        data: {
          lop,
          month,
          title: "CLASSROOM SEATING CHART",
          gvcn: "Phí Huỳnh Anh Hào",
          slogan: "Kỷ Cương - Trách Nhiệm - Hiệu Quả - Phát Triển",
          slotsData: JSON.stringify(emptySlots),
        },
      });
    }

    logActivity({
      userId: session?.user?.id ? Number(session.user.id) : null,
      userName: session?.user?.name || (session?.user as { username?: string })?.username || "Thành viên",
      userRole: (session?.user as { roleLabel?: string })?.roleLabel || "Ban cán sự",
      userLop: lop,
      action: "UPDATE",
      target: "SeatingChart",
      details: `Làm trống toàn bộ sơ đồ ${emptySlots.length} chỗ ngồi (${currentRows} hàng) Lớp ${lop} (${month})`,
      req,
      status: "SUCCESS",
    });

    return NextResponse.json({ success: true, message: `Đã làm trống toàn bộ sơ đồ ${emptySlots.length} chỗ ngồi (${currentRows} hàng)` });
  } catch (error) {
    console.error("Reset seating chart error:", error);
    return NextResponse.json({ error: "Lỗi làm trống sơ đồ" }, { status: 500 });
  }
}
