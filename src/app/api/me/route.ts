// src/app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPermissions, Module, UserPermissionRecord } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        hoTen: true,
        roleLabel: true,
        assignedLop: true,
        isSuperAdmin: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Tài khoản không tồn tại hoặc đã bị khóa" },
        { status: 403 }
      );
    }

    // SuperAdmin has full permissions on all modules
    if (user.isSuperAdmin) {
      const allModules: Module[] = [
        "hoc_sinh",
        "so_do_lop",
        "thoi_khoa_bieu",
        "lich_thi",
        "diem_danh",
        "quy",
        "lich_truc",
        "su_kien",
        "bao_cao",
      ];
      const permissions: UserPermissionRecord[] = allModules.map((m) => ({
        module: m,
        level: "toan_quyen",
        scope: "toan_lop",
        scopeToIds: [],
      }));
      return NextResponse.json({ user, permissions });
    }

    const permissions = await getUserPermissions(userId);

    return NextResponse.json({ user, permissions });
  } catch (err) {
    console.error("GET /api/me error:", err);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
