// src/lib/format.ts
// Utility formatters - VNĐ, ngày tháng, v.v.

/**
 * Định dạng số tiền VNĐ: 100000 → "100.000₫"
 */
export function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + "₫";
}

/**
 * Định dạng ngày dd/mm/yyyy
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Định dạng ngày và giờ dd/mm/yyyy HH:MM
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${min}`;
}

/**
 * Parse chuỗi dd/mm/yyyy → Date
 */
export function parseDateVN(str: string): Date | null {
  if (!str) return null;
  // Support dd/mm/yyyy and yyyy-mm-dd
  const parts = str.includes("/") ? str.split("/") : null;
  if (parts && parts.length === 3) {
    const [day, month, year] = parts;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Lấy tuần ISO (vd "2025-W34") từ một ngày
 */
export function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Lấy tuần hiện tại dạng ISO
 */
export function getCurrentISOWeek(): string {
  return getISOWeek(new Date());
}

/**
 * Lấy ngày đầu và cuối tuần từ ISO week string
 */
export function getWeekRange(isoWeek: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1);
  const start = new Date(startOfWeek1);
  start.setDate(startOfWeek1.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

/**
 * Tên thứ tiếng Việt: 1=Thứ 2, 2=Thứ 3, ..., 5=Thứ 6
 */
export const THU_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"] as const;
export const THU_ORDER: Record<string, number> = {
  "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6,
};

/**
 * Tạo array kỳ thu chuẩn
 */
export const KY_THU_OPTIONS = ["HK1", "HK2", "Cả Năm", "Hoạt động"];

/**
 * Tên tổ hiển thị
 */
export function toLabel(to: number): string {
  return `Tổ ${to}`;
}

/**
 * Phần trăm
 */
export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}
