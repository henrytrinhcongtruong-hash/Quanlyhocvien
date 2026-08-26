// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";

async function checkSA(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const isSA = await requireSuperAdmin(Number(session.user.id));
  return isSA ? session : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await checkSA(req);
  if (!session) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: {
      id: true, username: true, hoTen: true, roleLabel: true,
      assignedLop: true,
      isSuperAdmin: true, isActive: true, createdAt: true,
      permissions: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await checkSA(req);
  if (!session) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const body = await req.json();
  const { hoTen, roleLabel, assignedLop, password, isActive } = body;

  const updateData: Record<string, unknown> = {};
  if (hoTen) updateData.hoTen = hoTen.trim();
  if (roleLabel !== undefined) updateData.roleLabel = roleLabel.trim();
  if (assignedLop !== undefined) updateData.assignedLop = assignedLop.trim();
  if (isActive !== undefined) updateData.isActive = isActive;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data: updateData,
    select: {
      id: true, username: true, hoTen: true, roleLabel: true,
      assignedLop: true,
      isSuperAdmin: true, isActive: true,
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await checkSA(req);
  if (!session) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  // Cannot delete yourself
  if (String(id) === session.user.id) {
    return NextResponse.json({ error: "Không thể xóa tài khoản đang đăng nhập" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
