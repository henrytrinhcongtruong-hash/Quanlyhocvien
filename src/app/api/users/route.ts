// src/app/api/users/route.ts — Quản lý users (chỉ isSuperAdmin)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const isSA = await requireSuperAdmin(Number(session.user.id));
    if (!isSA) return NextResponse.json({ error: "Chỉ Admin Tổng mới được truy cập" }, { status: 403 });

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        hoTen: true,
        roleLabel: true,
        assignedLop: true,
        isSuperAdmin: true,
        isActive: true,
        createdAt: true,
        permissions: true,
      },
      orderBy: [{ isSuperAdmin: "desc" }, { hoTen: "asc" }],
    });

    return NextResponse.json({ data: users });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const isSA = await requireSuperAdmin(Number(session.user.id));
    if (!isSA) return NextResponse.json({ error: "Chỉ Admin Tổng mới được truy cập" }, { status: 403 });

    const body = await req.json();
    const { username, password, hoTen, roleLabel, assignedLop, permissions } = body;

    if (!username || !password || !hoTen) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Check duplicate username
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Tên đăng nhập đã tồn tại" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        passwordHash,
        hoTen: hoTen.trim(),
        roleLabel: roleLabel?.trim() || "",
        assignedLop: assignedLop?.trim() || "11AT3",
        isSuperAdmin: false,
        isActive: true,
        permissions: permissions
          ? {
              create: permissions.map((p: {
                module: string;
                level: string;
                scope: string;
                scopeToIds?: number[];
              }) => ({
                module: p.module,
                level: p.level,
                scope: p.scope,
                scopeToIds: JSON.stringify(p.scopeToIds || []),
              })),
            }
          : undefined,
      },
      include: { permissions: true },
    });

    // Don't return passwordHash
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
