import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateEmptySlots } from "@/lib/seatingTypes";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop") || "12T2";
    const month = searchParams.get("month") || "Tháng 09/2025";

    const emptySlots = generateEmptySlots();

    const existing = await prisma.seatingChart.findFirst({
      where: { lop, month },
    });

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

    return NextResponse.json({ success: true, message: "Đã làm trống toàn bộ sơ đồ 56 chỗ ngồi" });
  } catch (error) {
    console.error("Reset seating chart error:", error);
    return NextResponse.json({ error: "Lỗi làm trống sơ đồ" }, { status: 500 });
  }
}
