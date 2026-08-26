// src/app/api/classes/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      select: { lop: true },
      distinct: ["lop"],
      orderBy: { lop: "asc" },
    });

    const classes = students.map((s) => s.lop).filter(Boolean);
    // Ensure default classes if empty
    if (!classes.includes("11AT3")) classes.unshift("11AT3");

    return NextResponse.json({ data: classes });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi lấy danh sách lớp" }, { status: 500 });
  }
}
