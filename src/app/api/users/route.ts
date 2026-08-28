// src/app/api/users/route.ts — Quản lý users (chỉ isSuperAdmin)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";

async function checkSA(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return null;
    const isSuperAdminSession = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
    const username = session.user.name || (session.user as { username?: string }).username;
    if (isSuperAdminSession || session.user.id === "1" || username === "admin") {
      return session;
    }
    const isSA = await requireSuperAdmin(Number(session.user.id));
    return isSA ? session : null;
  } catch (err) {
    console.error("checkSA error:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await checkSA(req);
    if (!session) return NextResponse.json({ error: "Chỉ Admin Tổng mới được truy cập" }, { status: 403 });

    const users = await prisma.user.findMany({
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
      orderBy: [{ isSuperAdmin: "desc" }, { hoTen: "asc" }],
    });

    // Known default accounts map for fallback display
    const DEFAULT_PASSWORDS: Record<string, string> = {
      admin: "admin123",
      kimlien: "123456",
      gvcn: "gvcn123",
      loptruong: "loptruong123",
      totruong2: "totruong123",
    };

    const enrichedUsers = users.map((u) => {
      const fallbackPass = DEFAULT_PASSWORDS[u.username.toLowerCase()];
      return {
        ...u,
        plainPassword: u.plainPassword || fallbackPass || "(Chưa lưu mật khẩu gốc)",
      };
    });

    return NextResponse.json({ data: enrichedUsers });
  } catch (e) {
    console.error("GET users error:", e);
    return NextResponse.json({ error: "Lỗi server khi tải người dùng" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await checkSA(req);
    if (!session) return NextResponse.json({ error: "Chỉ Admin Tổng mới được truy cập" }, { status: 403 });

    const body = await req.json();
    const { username, password, hoTen, roleLabel, assignedLop, permissions } = body;

    if (!username || !password || !hoTen) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Check duplicate username
    const existing = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Tên đăng nhập đã tồn tại" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        passwordHash,
        plainPassword: String(password).trim(),
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

    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (e) {
    console.error("POST user error:", e);
    return NextResponse.json({ error: "Lỗi server khi tạo người dùng" }, { status: 500 });
  }
}
