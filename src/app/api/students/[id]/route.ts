// src/app/api/students/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const student = await prisma.student.findUnique({
      where: { id: Number(id) },
    });
    if (!student) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json(student);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "hoc_sinh", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const student = await prisma.student.update({
      where: { id: Number(id) },
      data: {
        hoTen: body.hoTen?.trim(),
        tenGoi: body.tenGoi?.trim() || null,
        ngaySinh: body.ngaySinh ? new Date(body.ngaySinh) : null,
        gioiTinh: body.gioiTinh || "Nam",
        to: Number(body.to),
        lop: body.lop || "11AT3",
        ghiChu: body.ghiChu?.trim() || null,
      },
    });
    return NextResponse.json(student);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "hoc_sinh", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    await prisma.student.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
