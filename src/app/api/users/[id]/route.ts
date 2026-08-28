// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";

async function checkUserManagementAccess(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return null;

    const isSuperAdminSession = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
    const username = (session.user.name || (session.user as { username?: string }).username || "").toLowerCase();
    const assignedLop = (session as { assignedLop?: string })?.assignedLop;
    const roleLabel = ((session as { roleLabel?: string })?.roleLabel || "").toLowerCase();

    if (isSuperAdminSession || session.user.id === "1" || username === "admin") {
      return { session, isSuperAdmin: true, assignedLop, isGVCN: true };
    }

    const isSA = await requireSuperAdmin(Number(session.user.id));
    if (isSA) {
      return { session, isSuperAdmin: true, assignedLop, isGVCN: true };
    }

    // Check if user is GVCN
    const isGVCN = roleLabel.includes("gvcn") || roleLabel.includes("chủ nhiệm") || roleLabel.includes("giáo viên");
    if (isGVCN && assignedLop) {
      return { session, isSuperAdmin: false, assignedLop, isGVCN: true };
    }

    return null;
  } catch (err) {
    console.error("checkUserManagementAccess error:", err);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await checkUserManagementAccess(req);
  if (!access) return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });

  const targetUser = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      username: true,
      plainPassword: true,
      hoTen: true,
      roleLabel: true,
      assignedLop: true,
      isSuperAdmin: true,
      isActive: true,
      createdAt: true,
      permissions: true,
    },
  });
  if (!targetUser) return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });

  if (!access.isSuperAdmin) {
    if (targetUser.assignedLop !== access.assignedLop || targetUser.isSuperAdmin) {
      return NextResponse.json({ error: "Bạn chỉ có thể xem người dùng thuộc lớp của mình" }, { status: 403 });
    }
  }

  return NextResponse.json(targetUser);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await checkUserManagementAccess(req);
    if (!access) return NextResponse.json({ error: "Không có quyền thực hiện thao tác này" }, { status: 403 });

    const targetUser = await prisma.user.findUnique({
      where: { id: Number(id) },
    });
    if (!targetUser) return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });

    if (!access.isSuperAdmin) {
      if (targetUser.assignedLop !== access.assignedLop || targetUser.isSuperAdmin) {
        return NextResponse.json({ error: "Bạn chỉ có quyền quản lý tài khoản thuộc lớp của mình" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { hoTen, roleLabel, assignedLop, password, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (hoTen) updateData.hoTen = hoTen.trim();
    if (roleLabel !== undefined) updateData.roleLabel = roleLabel.trim();
    if (assignedLop !== undefined && access.isSuperAdmin) updateData.assignedLop = assignedLop.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password && String(password).trim()) {
      updateData.passwordHash = await bcrypt.hash(String(password).trim(), 12);
      updateData.plainPassword = String(password).trim();
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        plainPassword: true,
        hoTen: true,
        roleLabel: true,
        assignedLop: true,
        isSuperAdmin: true,
        isActive: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật người dùng" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await checkUserManagementAccess(req);
    if (!access) return NextResponse.json({ error: "Không có quyền thực hiện thao tác này" }, { status: 403 });

    const userId = Number(id);

    // Không cho phép tự xóa tài khoản đang đăng nhập
    if (String(id) === access.session.user?.id) {
      return NextResponse.json({ error: "Không thể xóa tài khoản bạn đang sử dụng" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ success: true, message: "Tài khoản không tồn tại hoặc đã được xóa" });
    }

    if (targetUser.isSuperAdmin || targetUser.username === "admin") {
      return NextResponse.json({ error: "Không thể xóa tài khoản Admin Tổng" }, { status: 400 });
    }

    if (!access.isSuperAdmin) {
      if (targetUser.assignedLop !== access.assignedLop) {
        return NextResponse.json({ error: "Bạn chỉ có thể xóa tài khoản thuộc lớp của mình" }, { status: 403 });
      }
    }

    // Xóa quyền phân quyền trước rồi xóa người dùng
    await prisma.userPermission.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: "Đã xóa tài khoản người dùng thành công" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ khi xóa người dùng" }, { status: 500 });
  }
}
