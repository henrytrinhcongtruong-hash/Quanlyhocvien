// src/app/api/students/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/auditLogger";

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
    const isSuperAdmin = !!(
      (session as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      (session.user as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      session.user?.id === "1" ||
      session.user?.name === "Admin Hệ Thống" ||
      session.user?.email === "admin"
    );
    const userRole = (
      (session as { roleLabel?: string })?.roleLabel ||
      (session.user as { roleLabel?: string })?.roleLabel ||
      ""
    );
    const isGVCN =
      userRole.toLowerCase().includes("gvcn") ||
      userRole.toLowerCase().includes("chủ nhiệm") ||
      userRole.toLowerCase().includes("giáo viên") ||
      userRole.toLowerCase().includes("admin") ||
      userRole === "Admin Tổng";

    const { allowed } = await checkPermission(userId, "hoc_sinh", "toan_quyen");

    if (!allowed && !isSuperAdmin && !isGVCN && userId !== 1) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

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

    const oldStudent = await prisma.student.findUnique({
      where: { id: Number(id) },
    });

    const student = await prisma.student.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Ghi audit log sửa học sinh
    logActivity({
      userId,
      userName: session.user.name || (session.user as { username?: string })?.username || "Admin",
      userRole: (session.user as { roleLabel?: string })?.roleLabel || "Admin",
      userLop: student.lop,
      action: "UPDATE",
      target: "Student",
      targetId: student.id,
      details: `Cập nhật thông tin học sinh "${student.hoTen}" (Tổ ${student.to}, Lớp ${student.lop})`,
      oldValue: oldStudent,
      newValue: student,
      req,
      status: "SUCCESS",
    });

    return NextResponse.json(student);
  } catch (e) {
    console.error("PUT student error:", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const isSuperAdmin = !!(
      (session as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      (session.user as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      session.user?.id === "1" ||
      session.user?.name === "Admin Hệ Thống" ||
      session.user?.email === "admin"
    );
    const userRole = (
      (session as { roleLabel?: string })?.roleLabel ||
      (session.user as { roleLabel?: string })?.roleLabel ||
      ""
    );
    const isGVCN =
      userRole.toLowerCase().includes("gvcn") ||
      userRole.toLowerCase().includes("chủ nhiệm") ||
      userRole.toLowerCase().includes("giáo viên") ||
      userRole.toLowerCase().includes("admin") ||
      userRole === "Admin Tổng";

    const { allowed } = await checkPermission(userId, "hoc_sinh", "toan_quyen");

    if (!allowed && !isSuperAdmin && !isGVCN && userId !== 1) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const oldStudent = await prisma.student.findUnique({
      where: { id: Number(id) },
    });

    await prisma.student.delete({
      where: { id: Number(id) },
    });

    // Ghi audit log xóa học sinh
    logActivity({
      userId,
      userName: session.user.name || (session.user as { username?: string })?.username || "Admin",
      userRole: (session.user as { roleLabel?: string })?.roleLabel || "Admin",
      userLop: oldStudent?.lop,
      action: "DELETE",
      target: "Student",
      targetId: id,
      details: `Xóa học sinh "${oldStudent?.hoTen || id}" (Lớp ${oldStudent?.lop || "—"})`,
      oldValue: oldStudent,
      req,
      status: "SUCCESS",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
