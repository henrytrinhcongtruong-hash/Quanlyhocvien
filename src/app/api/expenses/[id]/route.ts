// src/app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "quy", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền quản lý quỹ" }, { status: 403 });

    const body = await req.json();
    const { danhSachChi, hangMucChi, soLuong, donGia, ngayChi, ghiChu } = body;

    const qty = Number(soLuong) || 1;
    const price = Number(donGia) || 0;
    const thanhTien = qty * price;

    const expense = await prisma.expense.update({
      where: { id: Number(id) },
      data: {
        danhSachChi: danhSachChi ? danhSachChi.trim() : undefined,
        hangMucChi: hangMucChi ? hangMucChi.trim() : undefined,
        soLuong: qty,
        donGia: price,
        thanhTien,
        ngayChi: ngayChi ? new Date(ngayChi) : undefined,
        ghiChu: ghiChu !== undefined ? (ghiChu ? ghiChu.trim() : null) : undefined,
      },
    });

    return NextResponse.json(expense);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "quy", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền quản lý quỹ" }, { status: 403 });

    await prisma.expense.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
