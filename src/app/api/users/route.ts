// src/app/api/users/route.ts — Quản lý users (SuperAdmin toàn quyền, GVCN quản lý lớp)
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

export async function GET(req: NextRequest) {
  try {
    const access = await checkUserManagementAccess(req);
    if (!access) {
      return NextResponse.json({ error: "Bạn không có quyền truy cập quản lý người dùng" }, { status: 403 });
    }

    const { isSuperAdmin, assignedLop } = access;
    const where: Record<string, unknown> = {};

    // GVCN only sees users of their assigned class, not SuperAdmin
    if (!isSuperAdmin) {
      where.assignedLop = assignedLop;
      where.isSuperAdmin = false;
    }

    const users = await prisma.user.findMany({
      where,
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
    const access = await checkUserManagementAccess(req);
    if (!access) return NextResponse.json({ error: "Không có quyền thực hiện thao tác này" }, { status: 403 });

    const body = await req.json();
    const { username, password, hoTen, roleLabel, assignedLop, permissions } = body;

    if (!username || !password || !hoTen) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanHoTen = hoTen.normalize("NFC").replace(/[\u00A0\s]+/g, " ").trim();
    const targetLop = assignedLop?.trim() || "12T2";

    // Check duplicate username
    const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
    if (existing) {
      return NextResponse.json({ error: "Tên đăng nhập đã tồn tại trên hệ thống" }, { status: 409 });
    }

    // Check if a user with this name already exists in this class
    const usersInClass = await prisma.user.findMany({
      where: {
        assignedLop: { equals: targetLop, mode: "insensitive" },
      },
      select: { id: true, username: true, hoTen: true },
    });

    const normInputName = cleanHoTen.toLowerCase();
    const duplicateStudentUser = usersInClass.find(
      (u) => u.hoTen.normalize("NFC").replace(/[\u00A0\s]+/g, " ").trim().toLowerCase() === normInputName
    );

    if (duplicateStudentUser) {
      return NextResponse.json(
        {
          error: `Học sinh "${cleanHoTen}" (Lớp ${targetLop}) đã có tài khoản trên hệ thống (Tên đăng nhập: "${duplicateStudentUser.username}"). Mỗi học sinh chỉ được có 1 tài khoản duy nhất!`,
        },
        { status: 409 }
      );
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
