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
  ghiChu?: string | null;
}

export interface ParseStudentsOptions {
  defaultLop?: string;
  autoAssignTo?: boolean;
}

export type ParseStudentsReturn = ImportedStudent[] & {
  detectedLop: string;
  headerRowIndex: number;
  headersFound: Record<string, boolean>;
};

function normalizeHeaderText(str: unknown): string {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseExcelDateValue(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw === "number") {
    // Excel date serial number (25569 = days between 1900-01-01 and 1970-01-01)
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(raw).trim();
  if (!s) return null;

  // Try dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Try yyyy-mm-dd
  const ymdMatch = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Try 4-digit year only (e.g. 2008)
  const yearMatch = s.match(/^(\d{4})$/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1], 10), 0, 1);
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function parseStudentsFromExcel(
  buffer: ArrayBuffer,
  options: ParseStudentsOptions = {}
): ParseStudentsReturn {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });

  // 1. Find the first non-empty sheet
  let sheet: XLSX.WorkSheet | null = null;
  let activeSheetName = "";
  for (const name of wb.SheetNames) {
    if (wb.Sheets[name] && wb.Sheets[name]["!ref"]) {
      sheet = wb.Sheets[name];
      activeSheetName = name;
      break;
    }
  }

  if (!sheet) {
    const emptyResult = [] as unknown as ParseStudentsReturn;
    emptyResult.detectedLop = "";
    emptyResult.headerRowIndex = -1;
    emptyResult.headersFound = {};
    return emptyResult;
  }

  // Convert to 2D array to inspect row by row
  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (rawMatrix.length === 0) {
    const emptyResult = [] as unknown as ParseStudentsReturn;
    emptyResult.detectedLop = "";
    emptyResult.headerRowIndex = -1;
    emptyResult.headersFound = {};
    return emptyResult;
  }

  // 2. Scan first 25 rows for Title metadata (Class name) and Header row
  let headerRowIndex = -1;
  let detectedLop = "";

  for (let r = 0; r < Math.min(25, rawMatrix.length); r++) {
    const row = rawMatrix[r];
    if (!Array.isArray(row)) continue;

    // Detect class name in title (e.g. "DANH SÁCH LỚP 10A1" or "LỚP: 12A2")
    if (!detectedLop) {
      const rowJoined = row.map((c) => String(c || "")).join(" ");
      const lopMatch = rowJoined.match(/(?:lop|lớp)\s*[:\s-]?\s*([0-9]{1,2}\s*[a-zA-Z0-9_\-\.]+)/i);
      if (lopMatch) {
        detectedLop = lopMatch[1].replace(/\s+/g, "").toUpperCase();
      }
    }

    // Check if this row is the header row
    const normalizedCells = row.map((c) => normalizeHeaderText(c));
    const hasNameCol = normalizedCells.some((c) =>
      [
        "ho va ten",
        "ho ten",
        "ten",
        "ho va ten dem",
        "ho dem",
        "ho va chu dem",
        "full name",
        "student name",
        "ho va ten hoc sinh",
        "ten hoc sinh",
        "ho va ten khai sinh",
      ].includes(c)
    );

    if (hasNameCol) {
      headerRowIndex = r;
      break;
    }
  }

  // If no header found by keywords, fallback to row 0
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  // If sheet name itself looks like a class (e.g. "10A1", "11AT3"), use it as detectedLop if not found yet
  if (!detectedLop && activeSheetName && /^[0-9]{1,2}[a-zA-Z0-9_\-\.]+$/.test(activeSheetName.trim())) {
    detectedLop = activeSheetName.trim().toUpperCase();
  }

  const finalDefaultLop = options.defaultLop || detectedLop || "11AT3";

  // 3. Map column indices from the detected header row
  const headerRow = rawMatrix[headerRowIndex] || [];
  const normalizedHeaders = headerRow.map((c) => normalizeHeaderText(c));

  let colHoTen = -1;
  let colHoDem = -1;
  let colTen = -1;
  let colLop = -1;
  let colTo = -1;
  let colGioiTinh = -1;
  let colNuOnly = -1;
  let colNamOnly = -1;
  let colNgaySinh = -1;
  let colTenGoi = -1;
  let colGhiChu = -1;

  for (let c = 0; c < normalizedHeaders.length; c++) {
    const h = normalizedHeaders[c];
    if (!h) continue;

    if (
      [
        "ho va ten",
        "ho ten",
        "ho va ten hoc sinh",
        "ten hoc sinh",
        "ho va ten khai sinh",
        "full name",
        "student name",
      ].includes(h)
    ) {
      colHoTen = c;
    } else if (
      [
        "ho va dem",
        "ho va ten dem",
        "ho dem",
        "ho va chu dem",
        "ho lot",
        "ho va lot",
        "ho",
        "last name",
        "middle name",
      ].includes(h)
    ) {
      colHoDem = c;
    } else if (["ten", "first name"].includes(h)) {
      colTen = c;
    } else if (["lop", "lop hoc", "ten lop", "class", "grade"].includes(h)) {
      colLop = c;
    } else if (["to", "nhom", "group", "team"].includes(h)) {
      colTo = c;
    } else if (["gioi tinh", "phai", "gender", "sex"].includes(h)) {
      colGioiTinh = c;
    } else if (h === "nu" || h === "female") {
      colNuOnly = c;
    } else if (h === "nam" || h === "male") {
      colNamOnly = c;
    } else if (
      ["ngay sinh", "ngay thang nam sinh", "nam sinh", "dob", "date of birth", "birth"].includes(h)
    ) {
      colNgaySinh = c;
    } else if (["ten goi", "biet danh", "nickname"].includes(h)) {
      colTenGoi = c;
    } else if (["ghi chu", "note", "notes", "chu thich"].includes(h)) {
      colGhiChu = c;
    }
  }

  // 4. Parse student rows
  const students: ImportedStudent[] = [];
  let validIndex = 0;

  for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Extract student name
    let hoTen = "";
    let tenGoi = "";

    if (colHoDem !== -1 && colTen !== -1) {
      const hoDem = String(row[colHoDem] || "").trim();
      const ten = String(row[colTen] || "").trim();
      if (hoDem && ten) {
        hoTen = `${hoDem} ${ten}`;
        tenGoi = ten;
      } else if (hoDem || ten) {
        hoTen = hoDem || ten;
        tenGoi = ten || "";
      }
    } else if (colHoTen !== -1) {
      hoTen = String(row[colHoTen] || "").trim();
      if (colTen !== -1 && row[colTen]) {
        tenGoi = String(row[colTen]).trim();
        if (!hoTen.endsWith(tenGoi)) {
          hoTen = `${hoTen} ${tenGoi}`.trim();
        }
      }
    } else if (colTen !== -1) {
      hoTen = String(row[colTen] || "").trim();
      tenGoi = hoTen;
    }

    // Skip empty or summary rows
    if (!hoTen || hoTen.length < 2) continue;
    const lowerName = hoTen.toLowerCase();
    if (
      lowerName.includes("tong so") ||
      lowerName.includes("nguoi lap") ||
      lowerName.includes("hieu truong") ||
      lowerName.includes("giao vien") ||
      lowerName.startsWith("stt")
    ) {
      continue;
    }

    // Auto-detect tenGoi if empty
    if (!tenGoi) {
      if (colTenGoi !== -1 && row[colTenGoi]) {
        tenGoi = String(row[colTenGoi]).trim();
      } else {
        const words = hoTen.trim().split(/\s+/);
        tenGoi = words[words.length - 1] || "";
      }
    }

    // Class (Lớp)
    let lop = finalDefaultLop;
    if (colLop !== -1 && row[colLop]) {
      const valLop = String(row[colLop]).trim();
      if (valLop) lop = valLop;
    }

    // Group / Team (Tổ: 1-4)
    let to = 0;
    if (colTo !== -1 && row[colTo] !== undefined && row[colTo] !== "") {
      const rawTo = String(row[colTo]).trim().toUpperCase();
      if (rawTo === "I") to = 1;
      else if (rawTo === "II") to = 2;
      else if (rawTo === "III") to = 3;
      else if (rawTo === "IV") to = 4;
      else {
        const match = rawTo.match(/\d+/);
        if (match) to = parseInt(match[0], 10);
      }
    }

    // Auto assign if missing or outside 1-4
    if (to < 1 || to > 4) {
      to = (validIndex % 4) + 1;
    }

    // Gender (Giới tính)
    let gioiTinh = "Nam";
    if (colNuOnly !== -1 && row[colNuOnly]) {
      const val = String(row[colNuOnly]).trim().toLowerCase();
      if (val === "x" || val === "1" || val === "nu" || val === "true" || val === "v") {
        gioiTinh = "Nữ";
      }
    } else if (colGioiTinh !== -1 && row[colGioiTinh]) {
      const val = String(row[colGioiTinh]).trim().toLowerCase();
      if (val.includes("nu") || val.includes("nữ") || val === "f" || val.includes("female")) {
        gioiTinh = "Nữ";
      }
    }

    // Date of Birth (Ngày sinh)
    let ngaySinh: Date | null = null;
    if (colNgaySinh !== -1 && row[colNgaySinh]) {
      ngaySinh = parseExcelDateValue(row[colNgaySinh]);
    }

    // Notes (Ghi chú)
    let ghiChu: string | null = null;
    if (colGhiChu !== -1 && row[colGhiChu]) {
      const g = String(row[colGhiChu]).trim();
      if (g) ghiChu = g;
    }

    students.push({
      hoTen,
      tenGoi,
      ngaySinh,
      gioiTinh,
      to,
      lop,
      ghiChu,
    });
    validIndex++;
  }

  const result = students as ParseStudentsReturn;
  result.detectedLop = detectedLop;
  result.headerRowIndex = headerRowIndex;
  result.headersFound = {
    hoTen: colHoTen !== -1 || (colHoDem !== -1 && colTen !== -1),
    to: colTo !== -1,
    lop: colLop !== -1,
    gioiTinh: colGioiTinh !== -1 || colNuOnly !== -1,
    ngaySinh: colNgaySinh !== -1,
  };

  return result;
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
