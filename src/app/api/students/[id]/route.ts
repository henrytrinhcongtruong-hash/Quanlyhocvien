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
    const userRole = (session.user as { role?: string })?.role;
    const { allowed } = await checkPermission(userId, "hoc_sinh", "toan_quyen");
    if (!allowed && userRole !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.hoTen !== undefined) updateData.hoTen = body.hoTen?.trim();
    if (body.tenGoi !== undefined) updateData.tenGoi = body.tenGoi?.trim() || null;
    if (body.ngaySinh !== undefined) updateData.ngaySinh = body.ngaySinh ? new Date(body.ngaySinh) : null;
    if (body.gioiTinh !== undefined) updateData.gioiTinh = body.gioiTinh;
    if (body.to !== undefined) updateData.to = Number(body.to);
    if (body.lop !== undefined) updateData.lop = body.lop;
    if (body.ghiChu !== undefined) updateData.ghiChu = body.ghiChu?.trim() || null;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;

    const student = await prisma.student.update({
      where: { id: Number(id) },
      data: updateData,
    });
    return NextResponse.json(student);
  } catch (e) {
    console.error("PUT student error:", e);
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
    const userRole = (session.user as { role?: string })?.role;
    const { allowed } = await checkPermission(userId, "hoc_sinh", "toan_quyen");
    if (!allowed && userRole !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    await prisma.student.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
