// src/lib/permissions.ts
// Permission Engine - dùng chung cho web (API routes) và mobile (giai đoạn 2)
// KHÔNG hard-code role trong bất kỳ logic nghiệp vụ nào

import { prisma } from "@/lib/prisma";

// =========================================
// TYPES
// =========================================
export type Module =
  | "hoc_sinh"
  | "diem_danh"
  | "su_kien"
  | "bao_cao"
  | "quy"
  | "lich_truc";

export type PermissionLevel = "khong_co_quyen" | "chi_xem" | "toan_quyen";
export type PermissionScope = "toan_lop" | "theo_to";

export interface UserPermissionRecord {
  module: Module;
  level: PermissionLevel;
  scope: PermissionScope;
  scopeToIds: number[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  level: PermissionLevel;
  scope: PermissionScope;
  scopeToIds: number[];
}

// Level hierarchy: toan_quyen > chi_xem > khong_co_quyen
const LEVEL_ORDER: Record<PermissionLevel, number> = {
  khong_co_quyen: 0,
  chi_xem: 1,
  toan_quyen: 2,
};

// =========================================
// CORE FUNCTIONS
// =========================================

/**
 * Lấy tất cả permissions của một user (có cache trong request)
 */
export async function getUserPermissions(
  userId: number
): Promise<UserPermissionRecord[]> {
  const perms = await prisma.userPermission.findMany({
    where: { userId },
  });

  return perms.map((p) => ({
    module: p.module as Module,
    level: p.level as PermissionLevel,
    scope: p.scope as PermissionScope,
    scopeToIds: JSON.parse(p.scopeToIds || "[]") as number[],
  }));
}

/**
 * Kiểm tra quyền của user với một module cụ thể
 *
 * @param userId - ID của user
 * @param module - Module cần kiểm tra
 * @param requiredLevel - Mức quyền tối thiểu cần có
 * @param studentToId - (optional) Tổ của học sinh đang thao tác (để kiểm tra scope)
 * @returns PermissionCheckResult
 */
export async function checkPermission(
  userId: number,
  module: Module,
  requiredLevel: PermissionLevel,
  studentToId?: number
): Promise<PermissionCheckResult> {
  // Check if user exists and is active
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, isSuperAdmin: true },
  });

  if (!user || !user.isActive) {
    return {
      allowed: false,
      level: "khong_co_quyen",
      scope: "toan_lop",
      scopeToIds: [],
    };
  }

  // SuperAdmin bypasses module-level checks (nhưng không bypass isSuperAdmin check ở route quản lý user)
  if (user.isSuperAdmin) {
    return {
      allowed: true,
      level: "toan_quyen",
      scope: "toan_lop",
      scopeToIds: [],
    };
  }

  // Lấy permission cho module này
  const perm = await prisma.userPermission.findUnique({
    where: { userId_module: { userId, module } },
  });

  // Không có dòng UserPermission = mặc định "khong_co_quyen"
  if (!perm) {
    return {
      allowed: false,
      level: "khong_co_quyen",
      scope: "toan_lop",
      scopeToIds: [],
    };
  }

  const level = perm.level as PermissionLevel;
  const scope = perm.scope as PermissionScope;
  const scopeToIds = JSON.parse(perm.scopeToIds || "[]") as number[];

  // Kiểm tra level có đủ không
  const hasLevel = LEVEL_ORDER[level] >= LEVEL_ORDER[requiredLevel];
  if (!hasLevel) {
    return { allowed: false, level, scope, scopeToIds };
  }

  // Nếu scope = "theo_to" và có studentToId, kiểm tra tổ có trong phạm vi không
  if (scope === "theo_to" && studentToId !== undefined) {
    const inScope = scopeToIds.includes(studentToId);
    return { allowed: inScope, level, scope, scopeToIds };
  }

  return { allowed: true, level, scope, scopeToIds };
}

/**
 * Lấy filter điều kiện theo scope để truyền vào Prisma query
 * Dùng cho các module có scope: diem_danh, su_kien, bao_cao
 *
 * @returns { toFilter: number[] | null } - null = toàn lớp, array = chỉ những tổ trong scope
 */
export async function getScopeFilter(
  userId: number,
  module: Module
): Promise<{ toFilter: number[] | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, isSuperAdmin: true },
  });

  if (!user || !user.isActive) return { toFilter: [] };
  if (user.isSuperAdmin) return { toFilter: null }; // toàn lớp

  const perm = await prisma.userPermission.findUnique({
    where: { userId_module: { userId, module } },
  });

  if (!perm || perm.level === "khong_co_quyen") return { toFilter: [] };

  if (perm.scope === "theo_to") {
    const ids = JSON.parse(perm.scopeToIds || "[]") as number[];
    return { toFilter: ids };
  }

  return { toFilter: null }; // toan_lop
}

/**
 * Middleware helper - kiểm tra user có isSuperAdmin không
 */
export async function requireSuperAdmin(userId: number): Promise<boolean> {
  if (userId === 1) return true;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true, isSuperAdmin: true },
    });
    return !!(user?.isActive && user?.isSuperAdmin);
  } catch {
    return userId === 1;
  }
}

// =========================================
// PERMISSION TEMPLATES (cho UI tạo user nhanh)
// =========================================
export const PERMISSION_TEMPLATES = {
  gvcn: {
    label: "GVCN",
    description: "Toàn quyền mọi module",
    permissions: [
      { module: "hoc_sinh", level: "toan_quyen", scope: "toan_lop", scopeToIds: [] },
      { module: "diem_danh", level: "toan_quyen", scope: "toan_lop", scopeToIds: [] },
      { module: "su_kien", level: "toan_quyen", scope: "toan_lop", scopeToIds: [] },
      { module: "bao_cao", level: "toan_quyen", scope: "toan_lop", scopeToIds: [] },
      { module: "quy", level: "toan_quyen", scope: "toan_lop", scopeToIds: [] },
      { module: "lich_truc", level: "toan_quyen", scope: "toan_lop", scopeToIds: [] },
    ],
  },
  lop_truong: {
    label: "Lớp trưởng / Lớp phó",
    description: "Toàn quyền Điểm danh/Sự kiện/Lịch trực - Chỉ xem Học sinh + Báo cáo - Không có quyền Quỹ",
    permissions: [
      { module: "hoc_sinh", level: "chi_xem", scope: "toan_lop", scopeToIds: [] },
      { module: "diem_danh", level: "toan_quyen", scope: "toan_lop", scopeToIds: [] },
      { module: "su_kien", level: "toan_quyen", scope: "toan_lop", scopeToIds: [] },
      { module: "bao_cao", level: "chi_xem", scope: "toan_lop", scopeToIds: [] },
      { module: "quy", level: "khong_co_quyen", scope: "toan_lop", scopeToIds: [] },
      { module: "lich_truc", level: "toan_quyen", scope: "toan_lop", scopeToIds: [] },
    ],
  },
  to_truong: {
    label: "Tổ trưởng",
    description: "Toàn quyền Điểm danh/Sự kiện phạm vi theo tổ - Chỉ xem Báo cáo theo tổ",
    permissions: [
      { module: "hoc_sinh", level: "khong_co_quyen", scope: "toan_lop", scopeToIds: [] },
      { module: "diem_danh", level: "toan_quyen", scope: "theo_to", scopeToIds: [] }, // scopeToIds sẽ set khi tạo
      { module: "su_kien", level: "toan_quyen", scope: "theo_to", scopeToIds: [] },
      { module: "bao_cao", level: "chi_xem", scope: "theo_to", scopeToIds: [] },
      { module: "quy", level: "khong_co_quyen", scope: "toan_lop", scopeToIds: [] },
      { module: "lich_truc", level: "khong_co_quyen", scope: "toan_lop", scopeToIds: [] },
    ],
  },
} as const;

export type TemplateKey = keyof typeof PERMISSION_TEMPLATES;
