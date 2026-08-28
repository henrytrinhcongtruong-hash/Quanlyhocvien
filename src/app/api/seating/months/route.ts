// src/app/api/seating/months/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop") || "12T2";

    const charts = await prisma.seatingChart.findMany({
      where: { lop },
      select: { id: true, month: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    });

    const months = Array.from(new Set(charts.map((c) => c.month)));
    if (!months.includes("Tháng 09/2025")) {
      months.unshift("Tháng 09/2025");
    }

    return NextResponse.json({ success: true, months, charts });
  } catch (error) {
    console.error("GET seating months error:", error);
    return NextResponse.json({ error: "Lỗi tải danh sách tháng" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { lop, newMonth, copyFromMonth } = body;

    const currentLop = lop?.trim() || "12T2";
    const targetMonth = newMonth?.trim();

    if (!targetMonth) {
      return NextResponse.json({ error: "Vui lòng nhập tên tháng mới" }, { status: 400 });
    }

    // Check if already exists
    const existing = await prisma.seatingChart.findFirst({
      where: { lop: currentLop, month: targetMonth },
    });

    if (existing) {
      return NextResponse.json({ error: `Sơ đồ cho ${targetMonth} đã tồn tại` }, { status: 400 });
    }

    let sourceSlotsData = "[]";
    let title = "CLASSROOM SEATING CHART";
    let gvcn = "Phí Huỳnh Anh Hào";
    let slogan = "Kỷ Cương - Trách Nhiệm - Hiệu Quả - Phát Triển";

    if (copyFromMonth) {
      const source = await prisma.seatingChart.findFirst({
        where: { lop: currentLop, month: copyFromMonth },
      });
      if (source) {
        sourceSlotsData = source.slotsData;
        title = source.title;
        gvcn = source.gvcn || gvcn;
        slogan = source.slogan || slogan;
      }
    }

    const created = await prisma.seatingChart.create({
      data: {
        lop: currentLop,
        month: targetMonth,
        title,
        gvcn,
        slogan,
        slotsData: sourceSlotsData,
      },
    });

    return NextResponse.json({ success: true, data: created, message: `Đã tạo sơ đồ cho ${targetMonth}` });
  } catch (error) {
    console.error("POST seating month error:", error);
    return NextResponse.json({ error: "Lỗi khi tạo sơ đồ tháng mới" }, { status: 500 });
  }
}
