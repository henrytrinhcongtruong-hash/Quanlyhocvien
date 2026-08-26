// src/app/api/users/sync/route.ts
// Đồng bộ tài khoản người dùng tùy chỉnh giữa các Lambda instance trên Vercel
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customUsers } = body;

    if (!Array.isArray(customUsers) || customUsers.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    let syncedCount = 0;

    for (const u of customUsers) {
      if (!u.username || !u.hoTen) continue;
      const username = String(u.username).trim().toLowerCase();

      // Kiểm tra xem user đã có trong DB của lambda này chưa
      const existing = await prisma.user.findUnique({
        where: { username },
        include: { permissions: true },
      });

      if (!existing) {
        const passwordHash = u.password
          ? await bcrypt.hash(u.password, 12)
          : await bcrypt.hash("123456", 12);

        await prisma.user.create({
          data: {
            username,
            passwordHash,
            hoTen: String(u.hoTen).trim(),
            roleLabel: u.roleLabel ? String(u.roleLabel).trim() : "",
            assignedLop: u.assignedLop ? String(u.assignedLop).trim() : "12T2",
            isSuperAdmin: !!u.isSuperAdmin,
            isActive: true,
            permissions: Array.isArray(u.permissions)
              ? {
                  create: u.permissions.map((p: {
                    module: string;
                    level: string;
                    scope: string;
                    scopeToIds?: number[];
                  }) => ({
                    module: p.module,
                    level: p.level || "khong_co_quyen",
                    scope: p.scope || "toan_lop",
                    scopeToIds: JSON.stringify(p.scopeToIds || []),
                  })),
                }
              : undefined,
          },
        });
        syncedCount++;
      }
    }

    return NextResponse.json({ success: true, syncedCount });
  } catch (error) {
    console.error("Sync users error:", error);
    return NextResponse.json({ error: "Lỗi đồng bộ tài khoản" }, { status: 500 });
  }
}
