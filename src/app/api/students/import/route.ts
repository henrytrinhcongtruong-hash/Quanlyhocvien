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

    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (bufErr) {
      console.error("Lỗi đọc buffer từ file:", bufErr);
      return NextResponse.json({ error: "Không thể đọc nội dung file. File có thể bị hỏng." }, { status: 400 });
    }

    let importedStudents: ReturnType<typeof parseStudentsFromExcel>;
    try {
      importedStudents = parseStudentsFromExcel(buffer);
    } catch (parseErr) {
      console.error("Lỗi parse Excel:", parseErr);
      return NextResponse.json({
        error: `Lỗi đọc file Excel: ${parseErr instanceof Error ? parseErr.message : "File không đúng định dạng hoặc bị hỏng"}`
      }, { status: 400 });
    }

    if (importedStudents.length === 0) {
      // Provide diagnostic info about why no students were found
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      let hint = "";
      if (rows.length === 0) {
        hint = "File Excel không có dữ liệu (0 dòng).";
      } else {
        const firstRowKeys = Object.keys(rows[0]);
        const hasHoTen = firstRowKeys.some(k =>
          k === "HỌ VÀ TÊN" || k === "Họ và tên" || k === "hoTen"
        );
        const hasTo = firstRowKeys.some(k =>
          k === "TỔ" || k === "Tổ" || k === "to"
        );

        if (!hasHoTen) {
          hint = `Không tìm thấy cột "HỌ VÀ TÊN" hoặc "Họ và tên". Các cột trong file: ${firstRowKeys.join(", ")}. Vui lòng đổi tên cột header cho đúng.`;
        } else if (!hasTo) {
          hint = `Không tìm thấy cột "TỔ" hoặc "Tổ". Các cột trong file: ${firstRowKeys.join(", ")}. Mỗi học sinh cần có Tổ (1-4).`;
        } else {
          // Headers match but rows got filtered — likely Tổ values are invalid
          const rawParsed = rows
            .filter((row) => row["HỌ VÀ TÊN"] || row["Họ và tên"] || row["hoTen"])
            .map((row) => ({
              hoTen: String(row["HỌ VÀ TÊN"] || row["Họ và tên"] || row["hoTen"] || "").trim(),
              to: Number(row["TỔ"] || row["Tổ"] || row["to"] || 0),
            }));

          const withName = rawParsed.filter(s => s.hoTen.length > 0);
          const withValidTo = withName.filter(s => s.to >= 1 && s.to <= 4);

          if (withName.length > 0 && withValidTo.length === 0) {
            const sampleTo = withName.slice(0, 3).map(s => `"${s.hoTen}": Tổ=${s.to}`).join(", ");
            hint = `Tìm thấy ${withName.length} học sinh nhưng giá trị cột TỔ không hợp lệ (cần từ 1-4). Ví dụ: ${sampleTo}`;
          } else {
            hint = `File có ${rows.length} dòng nhưng không có dòng nào hợp lệ. Kiểm tra lại header và dữ liệu.`;
          }
        }
      }

      return NextResponse.json({
        error: `Không tìm thấy học sinh hợp lệ trong file. ${hint}`
      }, { status: 400 });
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
    console.error("Import students error:", e);
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    return NextResponse.json({ error: `Lỗi xử lý file Excel: ${msg}` }, { status: 500 });
  }
}
