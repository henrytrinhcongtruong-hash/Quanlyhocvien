// src/app/api/students/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { parseStudentsFromExcel } from "@/lib/excel";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "hoc_sinh", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền import học sinh" }, { status: 403 });

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
    const importedStudents = parseStudentsFromExcel(buffer);

    if (importedStudents.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy học sinh hợp lệ trong file" }, { status: 400 });
    }

    let insertedCount = 0;
    for (const item of importedStudents) {
      // Upsert based on hoTen + lop
      const existing = await prisma.student.findFirst({
        where: { hoTen: item.hoTen, lop: item.lop },
      });

      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: {
            tenGoi: item.tenGoi || null,
            ngaySinh: item.ngaySinh,
            gioiTinh: item.gioiTinh,
            to: item.to,
          },
        });
      } else {
        await prisma.student.create({
          data: {
            hoTen: item.hoTen,
            tenGoi: item.tenGoi || null,
            ngaySinh: item.ngaySinh,
            gioiTinh: item.gioiTinh,
            to: item.to,
            lop: item.lop || "11AT3",
          },
        });
      }
      insertedCount++;
    }

    return NextResponse.json({ count: insertedCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi xử lý file Excel" }, { status: 500 });
  }
}
