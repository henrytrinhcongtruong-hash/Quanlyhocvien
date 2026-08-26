// src/lib/excel.ts
// Import/export Excel với hỗ trợ tiếng Việt UTF-8

import * as XLSX from "xlsx";
import { parseDateVN } from "@/lib/format";

// =========================================
// EXPORT
// =========================================

export function exportToExcel(
  data: Record<string, unknown>[],
  sheetName: string,
  fileName: string
): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportMultiSheet(
  sheets: Array<{ name: string; data: Record<string, unknown>[] }>,
  fileName: string
): void {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// =========================================
// IMPORT — SHEET: Data (Học sinh)
// Cột: STT, LỚP, HỌ VÀ TÊN, TÊN, NGÀY SINH, GIỚI TÍNH, TỔ
// =========================================
export interface ImportedStudent {
  hoTen: string;
  tenGoi: string;
  ngaySinh: Date | null;
  gioiTinh: string;
  to: number;
  lop: string;
}

export function parseStudentsFromExcel(
  buffer: ArrayBuffer
): ImportedStudent[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  return rows
    .filter((row) => row["HỌ VÀ TÊN"] || row["Họ và tên"] || row["hoTen"])
    .map((row) => {
      const hoTen =
        String(row["HỌ VÀ TÊN"] || row["Họ và tên"] || row["hoTen"] || "").trim();
      const tenGoi =
        String(row["TÊN"] || row["Tên"] || row["tenGoi"] || "").trim();
      const lop =
        String(row["LỚP"] || row["Lớp"] || row["lop"] || "11AT3").trim();
      const to = Number(row["TỔ"] || row["Tổ"] || row["to"] || 0);
      const gioiTinh =
        String(row["GIỚI TÍNH"] || row["Giới tính"] || row["gioiTinh"] || "Nam").trim();

      let ngaySinh: Date | null = null;
      const rawDate = row["NGÀY SINH"] || row["Ngày sinh"] || row["ngaySinh"];
      if (rawDate) {
        if (rawDate instanceof Date) {
          ngaySinh = rawDate;
        } else {
          ngaySinh = parseDateVN(String(rawDate));
        }
      }

      return { hoTen, tenGoi, ngaySinh, gioiTinh, to, lop };
    })
    .filter((s) => s.hoTen.length > 0 && s.to >= 1 && s.to <= 4);
}

// =========================================
// IMPORT — SHEET: Receipts (Thu quỹ)
// =========================================
export interface ImportedFeeCollection {
  studentHoTen: string;
  kyThu: string;
  soTien: number;
  hinhThucDong: string;
  trangThai: string;
  ngayDong: Date | null;
}

export function parseFeesFromExcel(
  buffer: ArrayBuffer
): ImportedFeeCollection[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets["Receipts"] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });

  return rows
    .filter((row) => row["HỌ VÀ TÊN"] || row["Họ và tên"])
    .map((row) => {
      const ngayRaw = row["NGÀY ĐÓNG"] || row["Ngày đóng"] || row["ngayDong"];
      let ngayDong: Date | null = null;
      if (ngayRaw instanceof Date) ngayDong = ngayRaw;
      else if (ngayRaw) ngayDong = parseDateVN(String(ngayRaw));

      return {
        studentHoTen: String(row["HỌ VÀ TÊN"] || row["Họ và tên"] || "").trim(),
        kyThu: String(row["KỲ THU"] || row["Kỳ thu"] || "HK1").trim(),
        soTien: Number(row["SỐ TIỀN"] || row["Số tiền"] || 0),
        hinhThucDong: String(row["HÌNH THỨC"] || row["Hình thức"] || "Tiền Mặt").trim(),
        trangThai: String(row["TRẠNG THÁI"] || row["Trạng thái"] || "Chưa Đóng").trim(),
        ngayDong,
      };
    });
}

// =========================================
// IMPORT — SHEET: Expenses (Chi quỹ)
// =========================================
export interface ImportedExpense {
  danhSachChi: string;
  hangMucChi: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  ngayChi: Date | null;
}

export function parseExpensesFromExcel(
  buffer: ArrayBuffer
): ImportedExpense[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets["Expenses"] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });

  return rows
    .filter((row) => row["DANH SÁCH CHI"] || row["Danh sách chi"])
    .map((row) => {
      const soLuong = Number(row["SỐ LƯỢNG"] || row["Số lượng"] || 1);
      const donGia = Number(row["ĐƠN GIÁ"] || row["Đơn giá"] || 0);
      const thanhTien =
        Number(row["THÀNH TIỀN"] || row["Thành tiền"] || 0) || soLuong * donGia;

      const ngayRaw = row["NGÀY CHI"] || row["Ngày chi"];
      let ngayChi: Date | null = null;
      if (ngayRaw instanceof Date) ngayChi = ngayRaw;
      else if (ngayRaw) ngayChi = parseDateVN(String(ngayRaw));

      return {
        danhSachChi: String(row["DANH SÁCH CHI"] || row["Danh sách chi"] || "").trim(),
        hangMucChi: String(row["HẠNG MỤC"] || row["Hạng mục"] || "Khác").trim(),
        soLuong,
        donGia,
        thanhTien,
        ngayChi,
      };
    });
}

// =========================================
// IMPORT — SHEET: Math (Điểm danh)
// =========================================
export interface ImportedAttendance {
  studentHoTen: string;
  ngay: Date | null;
  loai: string;
  ghiChu: string;
}

export function parseAttendanceFromExcel(
  buffer: ArrayBuffer
): ImportedAttendance[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets["Math"] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });

  return rows
    .filter((row) => row["HỌ VÀ TÊN"] || row["Họ và tên"])
    .map((row) => {
      const ngayRaw = row["NGÀY"] || row["Ngày"] || row["ngay"];
      let ngay: Date | null = null;
      if (ngayRaw instanceof Date) ngay = ngayRaw;
      else if (ngayRaw) ngay = parseDateVN(String(ngayRaw));

      return {
        studentHoTen: String(row["HỌ VÀ TÊN"] || row["Họ và tên"] || "").trim(),
        ngay,
        loai: String(row["LOẠI"] || row["Loại"] || row["loai"] || "Vắng không phép").trim(),
        ghiChu: String(row["GHI CHÚ"] || row["Ghi chú"] || "").trim(),
      };
    });
}
