// src/app/api/users/[id]/perms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/permissions";

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
    select: { assignedLop: true, isSuperAdmin: true },
  });
  if (!targetUser) return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });

  if (!access.isSuperAdmin) {
    if (targetUser.assignedLop !== access.assignedLop || targetUser.isSuperAdmin) {
      return NextResponse.json({ error: "Bạn chỉ có thể xem quyền của người dùng thuộc lớp của mình" }, { status: 403 });
    }
  }

  const perms = await prisma.userPermission.findMany({
    where: { userId: Number(id) },
  });

  return NextResponse.json(perms);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await checkUserManagementAccess(req);
    if (!access) return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });

    const targetUser = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { assignedLop: true, isSuperAdmin: true },
    });
    if (!targetUser) return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });

    if (!access.isSuperAdmin) {
      if (targetUser.assignedLop !== access.assignedLop || targetUser.isSuperAdmin) {
        return NextResponse.json({ error: "Bạn chỉ có thể chỉnh sửa quyền của người dùng thuộc lớp của mình" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const userId = Number(id);

    // Xóa permissions cũ và tạo lại (upsert per module)
    await prisma.$transaction(async (tx) => {
      // Delete existing
      await tx.userPermission.deleteMany({ where: { userId } });

      // Create new
      if (permissions.length > 0) {
        await tx.userPermission.createMany({
          data: permissions.map((p: {
            module: string;
            level: string;
            scope: string;
            scopeToIds?: number[];
          }) => ({
            userId,
            module: p.module,
            level: p.level || "khong_co_quyen",
            scope: p.scope || "toan_lop",
            scopeToIds: JSON.stringify(p.scopeToIds || []),
          })),
        });
      }
    });

    const updated = await prisma.userPermission.findMany({ where: { userId } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update permissions error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật quyền" }, { status: 500 });
  }
}
