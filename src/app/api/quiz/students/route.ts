import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/quiz/students - Lấy danh sách tên học sinh để chọn nhanh khi làm bài
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop") || "ALL";

    const where: any = {};
    if (lop && lop !== "ALL") {
      where.lop = lop;
    }

    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        hoTen: true,
        lop: true,
        to: true,
      },
      orderBy: [{ lop: "asc" }, { to: "asc" }, { hoTen: "asc" }],
    });

    return NextResponse.json({ success: true, data: students });
  } catch (error: any) {
    console.error("Error fetching student list for quiz:", error);
    return NextResponse.json({ success: false, data: [] });
  }
}
