// src/app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission, getScopeFilter } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isPublic = searchParams.get("public") === "1";

    const events = await prisma.event.findMany({
      orderBy: { deadline: "asc" },
      include: {
        members: {
          include: {
            student: { select: { id: true, hoTen: true, tenGoi: true, to: true } },
          },
        },
      },
    });

    if (isPublic) {
      return NextResponse.json({ data: events });
    }

    // For admin, check permissions and apply scope
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "su_kien", "chi_xem");
    if (!allowed) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { toFilter } = await getScopeFilter(userId, "su_kien");

    // Filter events by scope if needed
    const filtered = toFilter === null
      ? events
      : events.filter((e) =>
          e.members.some((m) => m.student.to && toFilter.includes(m.student.to))
        );

    return NextResponse.json({ data: filtered });
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
    const { allowed } = await checkPermission(userId, "su_kien", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const { tenSuKien, hangMuc, chiTiet, deadline, ketHoachTrienKhai, trangThai, members } = body;

    if (!tenSuKien) {
      return NextResponse.json({ error: "Thiếu tên sự kiện" }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        tenSuKien: tenSuKien.trim(),
        hangMuc: hangMuc?.trim() || null,
        chiTiet: chiTiet?.trim() || null,
        deadline: deadline ? new Date(deadline) : null,
        ketHoachTrienKhai: ketHoachTrienKhai?.trim() || null,
        trangThai: trangThai || "Sắp diễn ra",
        members: members
          ? {
              create: members.map((m: { studentId: number; vaiTro: string }) => ({
                studentId: Number(m.studentId),
                vaiTro: m.vaiTro || "Support",
              })),
            }
          : undefined,
      },
      include: { members: { include: { student: { select: { hoTen: true, to: true } } } } },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
