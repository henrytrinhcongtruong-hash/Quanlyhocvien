// src/app/api/attendance/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { parseAttendanceFromExcel } from "@/lib/excel";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "diem_danh", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền import điểm danh" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Không tìm thấy file" }, { status: 400 });

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Dung lượng file vượt quá giới hạn 5MB" }, { status: 400 });
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls") && !fileName.endsWith(".csv")) {
      return NextResponse.json({ error: "Định dạng file không được hỗ trợ (chỉ chấp nhận .xlsx, .xls, .csv)" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const items = parseAttendanceFromExcel(buffer);

    let count = 0;
    for (const item of items) {
      if (!item.ngay) continue;
      const student = await prisma.student.findFirst({
        where: { hoTen: item.studentHoTen },
      });
      if (student) {
        await prisma.attendance.upsert({
          where: {
            studentId_ngay_loai: {
              studentId: student.id,
              ngay: item.ngay,
              loai: item.loai,
            },
          },
          update: { ghiChu: item.ghiChu || null, submittedBy: userId },
          create: {
            studentId: student.id,
            ngay: item.ngay,
            loai: item.loai,
            ghiChu: item.ghiChu || null,
            submittedBy: userId,
            toId: student.to,
          },
        });
        count++;
      }
    }

    return NextResponse.json({ count });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi xử lý file Excel điểm danh" }, { status: 500 });
  }
}
