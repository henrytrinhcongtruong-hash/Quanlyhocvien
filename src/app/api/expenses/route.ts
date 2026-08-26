// src/app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";

// GET /api/expenses - Danh sách các khoản chi
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hangMuc = searchParams.get("hangMuc");
    const search = searchParams.get("search");

    const session = await auth();
    // Allow public view or require login based on need (Public can view expenses if required)
    const where: Record<string, unknown> = {};
    if (hangMuc) where.hangMucChi = hangMuc;
    if (search) {
      where.danhSachChi = { contains: search };
    }

    const data = await prisma.expense.findMany({
      where,
      orderBy: { ngayChi: "desc" },
    });

    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/expenses - Thêm khoản chi mới
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "quy", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền quản lý quỹ" }, { status: 403 });

    const body = await req.json();
    const { danhSachChi, hangMucChi, soLuong, donGia, ngayChi, ghiChu } = body;

    if (!danhSachChi || !hangMucChi || donGia === undefined) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const qty = Number(soLuong) || 1;
    const price = Number(donGia) || 0;
    const thanhTien = qty * price;

    const expense = await prisma.expense.create({
      data: {
        danhSachChi: danhSachChi.trim(),
        hangMucChi: hangMucChi.trim(),
        soLuong: qty,
        donGia: price,
        thanhTien,
        ngayChi: ngayChi ? new Date(ngayChi) : new Date(),
        ghiChu: ghiChu?.trim() || null,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
