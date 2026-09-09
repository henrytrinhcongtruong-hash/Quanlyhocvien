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

    const targetLop = (formData.get("lop") as string || "").trim();

    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (bufErr) {
      console.error("Lỗi đọc buffer từ file:", bufErr);
      return NextResponse.json({ error: "Không thể đọc nội dung file. File có thể bị hỏng." }, { status: 400 });
    }

    let importedStudents: ReturnType<typeof parseStudentsFromExcel>;
    try {
      importedStudents = parseStudentsFromExcel(buffer, {
        defaultLop: targetLop || undefined,
      });
    } catch (parseErr) {
      console.error("Lỗi parse Excel:", parseErr);
      return NextResponse.json({
        error: `Lỗi đọc file Excel: ${parseErr instanceof Error ? parseErr.message : "File không đúng định dạng hoặc bị hỏng"}`
      }, { status: 400 });
    }

    if (importedStudents.length === 0) {
      return NextResponse.json({
        error: `Không tìm thấy học sinh nào trong file Excel. Vui lòng kiểm tra lại: file cần có cột chứa họ tên học sinh ("Họ và tên", "Họ và chữ đệm", "Tên") và có dữ liệu từ các dòng phía dưới tiêu đề.`
      }, { status: 400 });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const affectedClasses = new Set<string>();

    for (const item of importedStudents) {
      const studentLop = item.lop || targetLop || "11AT3";
      affectedClasses.add(studentLop);

      // Upsert based on hoTen + lop
      const existing = await prisma.student.findFirst({
        where: { hoTen: item.hoTen, lop: studentLop },
      });

      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: {
            tenGoi: item.tenGoi || existing.tenGoi,
            ngaySinh: item.ngaySinh ?? existing.ngaySinh,
            gioiTinh: item.gioiTinh || existing.gioiTinh,
            to: item.to,
            ghiChu: item.ghiChu ?? existing.ghiChu,
          },
        });
        updatedCount++;
      } else {
        await prisma.student.create({
          data: {
            hoTen: item.hoTen,
            tenGoi: item.tenGoi || null,
            ngaySinh: item.ngaySinh,
            gioiTinh: item.gioiTinh,
            to: item.to,
            lop: studentLop,
            ghiChu: item.ghiChu || null,
          },
        });
        insertedCount++;
      }
    }

    const classList = Array.from(affectedClasses);
    const primaryLop = classList[0] || targetLop || "11AT3";

    return NextResponse.json({
      success: true,
      count: insertedCount + updatedCount,
      insertedCount,
      updatedCount,
      lop: primaryLop,
      classes: classList,
      message: `Đã import thành công ${insertedCount + updatedCount} học sinh vào lớp ${classList.join(", ")} (${insertedCount} mới, ${updatedCount} cập nhật).`,
    });
  } catch (e) {
    console.error("Import students error:", e);
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    return NextResponse.json({ error: `Lỗi xử lý file Excel: ${msg}` }, { status: 500 });
  }
}
