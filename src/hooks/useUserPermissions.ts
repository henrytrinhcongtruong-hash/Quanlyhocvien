// src/hooks/useUserPermissions.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export type Module =
  | "hoc_sinh"
  | "so_do_lop"
  | "thoi_khoa_bieu"
  | "diem_danh"
  | "su_kien"
  | "bao_cao"
  | "quy"
  | "lich_truc"
  | "lich_thi";

export type PermissionLevel = "khong_co_quyen" | "chi_xem" | "toan_quyen";
export type PermissionScope = "toan_lop" | "theo_to";

export interface UserPermissionRecord {
  module: Module;
  level: PermissionLevel;
  scope: PermissionScope;
  scopeToIds: number[];
}

export interface CurrentUser {
  id: number;
  username: string;
  hoTen: string;
  roleLabel: string;
  assignedLop: string;
  isSuperAdmin: boolean;
}

const LEVEL_ORDER: Record<PermissionLevel, number> = {
  khong_co_quyen: 0,
  chi_xem: 1,
  toan_quyen: 2,
};

let cachedMe: { user: CurrentUser; permissions: UserPermissionRecord[] } | null = null;
let lastFetchTime = 0;

export function useUserPermissions() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<CurrentUser | null>(() => cachedMe?.user || null);
  const [permissions, setPermissions] = useState<UserPermissionRecord[]>(
    () => cachedMe?.permissions || []
  );
  const [loading, setLoading] = useState<boolean>(!cachedMe);

  const fetchPermissions = useCallback(async (force = false) => {
    // Re-use cache if fetched less than 15s ago unless forced
    const now = Date.now();
    if (!force && cachedMe && now - lastFetchTime < 15000) {
      setUser(cachedMe.user);
      setPermissions(cachedMe.permissions);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        cachedMe = data;
        lastFetchTime = Date.now();
        setUser(data.user);
        setPermissions(data.permissions || []);
      }
    } catch (err) {
      console.error("useUserPermissions fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPermissions();
    } else if (status === "unauthenticated") {
      cachedMe = null;
      setUser(null);
      setPermissions([]);
      setLoading(false);
    }
  }, [status, fetchPermissions]);

  const getModulePerm = useCallback(
    (module: Module): UserPermissionRecord | undefined => {
      return permissions.find((p) => p.module === module);
    },
    [permissions]
  );

  const can = useCallback(
    (
      module: Module,
      requiredLevel: PermissionLevel = "chi_xem",
      studentTo?: number
    ): boolean => {
      // SuperAdmin bypass
      if (user?.isSuperAdmin) return true;

      const perm = permissions.find((p) => p.module === module);
      if (!perm || perm.level === "khong_co_quyen") return false;

      const hasLevel = LEVEL_ORDER[perm.level] >= LEVEL_ORDER[requiredLevel];
      if (!hasLevel) return false;

      if (perm.scope === "theo_to" && studentTo !== undefined) {
        return perm.scopeToIds.includes(studentTo);
      }

      return true;
    },
    [user, permissions]
  );

  const canEdit = useCallback(
    (module: Module, studentTo?: number): boolean => {
      return can(module, "toan_quyen", studentTo);
    },
    [can]
  );

  const canView = useCallback(
    (module: Module, studentTo?: number): boolean => {
      return can(module, "chi_xem", studentTo);
    },
    [can]
  );

  const isScopeTheoTo = useCallback(
    (module: Module): { isTheoTo: boolean; scopeToIds: number[] } => {
      if (user?.isSuperAdmin) return { isTheoTo: false, scopeToIds: [] };
      const perm = permissions.find((p) => p.module === module);
      if (perm && perm.scope === "theo_to") {
        return { isTheoTo: true, scopeToIds: perm.scopeToIds || [] };
      }
      return { isTheoTo: false, scopeToIds: [] };
    },
    [user, permissions]
  );

  return {
    user,
    permissions,
    loading,
    can,
    canEdit,
    canView,
    getModulePerm,
    isScopeTheoTo,
    refresh: () => fetchPermissions(true),
  };
}
