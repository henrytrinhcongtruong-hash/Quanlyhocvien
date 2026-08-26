// src/app/api/users/[id]/perms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const isSA = await requireSuperAdmin(Number(session.user.id));
  if (!isSA) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const perms = await prisma.userPermission.findMany({
    where: { userId: Number(id) },
  });

  return NextResponse.json(perms);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const isSA = await requireSuperAdmin(Number(session.user.id));
  if (!isSA) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

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
}
