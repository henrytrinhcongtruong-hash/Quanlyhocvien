// src/app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/auditLogger";

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

    logActivity({
      userId,
      userName: session.user.name || (session.user as { username?: string })?.username || "Thành viên",
      userRole: (session.user as { roleLabel?: string })?.roleLabel || "Thủ quỹ",
      userLop: (session as { assignedLop?: string })?.assignedLop,
      action: "UPDATE",
      target: "Expense",
      targetId: expense.id,
      details: `Cập nhật khoản chi "${expense.danhSachChi}" (${expense.thanhTien.toLocaleString("vi-VN")} đ) - Hạng mục: ${expense.hangMucChi}`,
      newValue: expense,
      req,
      status: "SUCCESS",
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

    const expense = await prisma.expense.findUnique({ where: { id: Number(id) } });

    await prisma.expense.delete({ where: { id: Number(id) } });

    logActivity({
      userId,
      userName: session.user.name || (session.user as { username?: string })?.username || "Thành viên",
      userRole: (session.user as { roleLabel?: string })?.roleLabel || "Thủ quỹ",
      userLop: (session as { assignedLop?: string })?.assignedLop,
      action: "DELETE",
      target: "Expense",
      targetId: Number(id),
      details: `Xóa khoản chi "${expense?.danhSachChi || id}" (${(expense?.thanhTien || 0).toLocaleString("vi-VN")} đ)`,
      oldValue: expense,
      req: _req,
      status: "SUCCESS",
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
