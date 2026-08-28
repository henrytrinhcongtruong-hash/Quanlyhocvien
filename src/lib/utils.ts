// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateRandomPassword(length = 10): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

export function paginate<T>(arr: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage;
  return {
    data: arr.slice(start, start + perPage),
    total: arr.length,
    page,
    perPage,
    totalPages: Math.ceil(arr.length / perPage),
  };
}

export function normalizeSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Trích xuất Tên chính (từ cuối cùng của Họ và Tên)
 * VD: "Nguyễn Văn An" -> "An", "Trần Thị Cẩm" -> "Cẩm"
 */
export function getFirstName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] || fullName;
}

/**
 * So sánh tên tiếng Việt chuẩn xác theo Tên chính (A-Z hoặc Z-A) rồi đến Họ đệm
 */
export function compareVietnameseNames(
  aName: string,
  bName: string,
  order: "asc" | "desc" = "asc"
): number {
  const aFirst = getFirstName(aName);
  const bFirst = getFirstName(bName);
  const comp =
    aFirst.localeCompare(bFirst, "vi", { sensitivity: "base" }) ||
    aName.localeCompare(bName, "vi", { sensitivity: "base" });
  return order === "asc" ? comp : -comp;
}

