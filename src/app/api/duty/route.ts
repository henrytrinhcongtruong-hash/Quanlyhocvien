// src/app/api/duty/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { getCurrentISOWeek, THU_ORDER } from "@/lib/format";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekParam = searchParams.get("week");
    const lop = searchParams.get("lop");
    const week = weekParam === "current" || !weekParam ? getCurrentISOWeek() : weekParam;

    const where: Record<string, unknown> = { tuan: week };
    if (lop && lop !== "ALL") {
      where.student = { lop };
    }

    const rosters = await prisma.dutyRoster.findMany({
      where,
      include: {
        student: { select: { id: true, hoTen: true, tenGoi: true, to: true, lop: true } },
      },
      orderBy: { thuOrder: "asc" },
    });

    // Group by thứ with detailed item info (including id for edit/delete)
    const grouped: Record<
      string,
      {
        thu: string;
        thuOrder: number;
        items: { id: number; studentId: number; name: string; to: number; lop: string }[];
        students: string[];
      }
    > = {};

    for (const r of rosters) {
      if (!grouped[r.thu]) {
        grouped[r.thu] = { thu: r.thu, thuOrder: r.thuOrder, items: [], students: [] };
      }
      const displayName = r.student.tenGoi || r.student.hoTen;
      grouped[r.thu].items.push({
        id: r.id,
        studentId: r.student.id,
        name: r.student.hoTen,
        to: r.student.to,
        lop: r.student.lop,
      });
      grouped[r.thu].students.push(displayName);
    }

    const entries = Object.values(grouped).sort((a, b) => a.thuOrder - b.thuOrder);
    return NextResponse.json({ week, entries, raw: rosters });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "lich_truc", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const { tuan, thu, thuOrder, studentId } = body;

    if (!tuan || !thu || !studentId) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const order = thuOrder ? Number(thuOrder) : (THU_ORDER[thu] || 2);

    const entry = await prisma.dutyRoster.create({
      data: {
        tuan,
        thu,
        thuOrder: order,
        studentId: Number(studentId),
      },
      include: { student: { select: { hoTen: true, tenGoi: true, to: true, lop: true } } },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "lich_truc", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const { id, thu, studentId } = body;

    if (!id || !studentId) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      studentId: Number(studentId),
    };
    if (thu) {
      updateData.thu = thu;
      updateData.thuOrder = THU_ORDER[thu] || 2;
    }

    const updated = await prisma.dutyRoster.update({
      where: { id: Number(id) },
      data: updateData,
      include: { student: { select: { hoTen: true, tenGoi: true, to: true, lop: true } } },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// DELETE /api/duty - Hỗ trợ xóa 1 phân công (theo ?id=) hoặc xóa toàn bộ lịch của 1 tuần (theo ?week= & ?lop=)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "lich_truc", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const week = searchParams.get("week");
    const lop = searchParams.get("lop");

    if (id) {
      await prisma.dutyRoster.delete({ where: { id: Number(id) } });
      return NextResponse.json({ success: true });
    }

    if (week) {
      const deleteWhere: Record<string, unknown> = { tuan: week };
      if (lop && lop !== "ALL") {
        deleteWhere.student = { lop };
      }
      const deleted = await prisma.dutyRoster.deleteMany({ where: deleteWhere });
      return NextResponse.json({ success: true, count: deleted.count });
    }

    return NextResponse.json({ error: "Thiếu tham số id hoặc week" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
