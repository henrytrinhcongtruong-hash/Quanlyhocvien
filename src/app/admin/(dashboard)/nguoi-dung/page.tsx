"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  UserCog,
  Plus,
  Shield,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Key,
  Save,
  X,
  School,
  Users,
  Sparkles,
  Lock,
  User,
  Layers,
  Settings,
} from "lucide-react";

interface UserItem {
  id: number;
  username: string;
  hoTen: string;
  roleLabel: string | null;
  assignedLop: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  permissions: {
    module: string;
    level: string;
    scope: string;
    scopeToIds: string | null;
  }[];
}

const MODULES = [
  { key: "hoc_sinh", label: "Quản lý Học sinh", desc: "Hồ sơ, danh sách, xuất nhập Excel" },
  { key: "so_do_lop", label: "Sơ đồ lớp học", desc: "Sắp xếp chỗ ngồi, đổi chỗ kéo thả, xuất PDF bàn giáo viên" },
  { key: "thoi_khoa_bieu", label: "Thời khóa biểu", desc: "Thời khóa biểu các thứ trong tuần, tiết học" },
  { key: "lich_thi", label: "Lịch thi & Kiểm tra", desc: "Lịch kiểm tra 15p, 1 tiết, thi giữa kỳ & cuối kỳ" },
  { key: "diem_danh", label: "Điểm danh", desc: "Điểm danh hàng ngày, theo dõi chuyên cần" },
  { key: "quy", label: "Quản lý Quỹ lớp", desc: "Thu chi, đợt thu, sao kê dòng tiền" },
  { key: "lich_truc", label: "Lịch trực nhật", desc: "Phân công trực ban, đổi ca" },
  { key: "su_kien", label: "Sự kiện & Công việc", desc: "Kế hoạch, phân công công việc" },
  { key: "bao_cao", label: "Báo cáo & Thống kê", desc: "Tổng hợp số liệu báo cáo định kỳ" },
];

const PERMISSION_TEMPLATES = {
  gvcn: {
    label: "👑 Giáo Viên Chủ Nhiệm (GVCN)",
    desc: "Toàn quyền mọi module của lớp",
    badge: "#dbeafe",
    badgeColor: "#1d4ed8",
    perms: {
      hoc_sinh: { level: "toan_quyen", scope: "toan_lop" },
      so_do_lop: { level: "toan_quyen", scope: "toan_lop" },
      thoi_khoa_bieu: { level: "toan_quyen", scope: "toan_lop" },
      lich_thi: { level: "toan_quyen", scope: "toan_lop" },
      diem_danh: { level: "toan_quyen", scope: "toan_lop" },
      quy: { level: "toan_quyen", scope: "toan_lop" },
      lich_truc: { level: "toan_quyen", scope: "toan_lop" },
      su_kien: { level: "toan_quyen", scope: "toan_lop" },
      bao_cao: { level: "toan_quyen", scope: "toan_lop" },
    },
  },
  lop_truong: {
    label: "🌟 Lớp trưởng / Lớp phó",
    desc: "Điểm danh, Sơ đồ lớp, TKB, lịch thi, trực nhật, sự kiện",
    badge: "#fef3c7",
    badgeColor: "#b45309",
    perms: {
      hoc_sinh: { level: "chi_xem", scope: "toan_lop" },
      so_do_lop: { level: "toan_quyen", scope: "toan_lop" },
      thoi_khoa_bieu: { level: "toan_quyen", scope: "toan_lop" },
      lich_thi: { level: "toan_quyen", scope: "toan_lop" },
      diem_danh: { level: "toan_quyen", scope: "toan_lop" },
      quy: { level: "chi_xem", scope: "toan_lop" },
      lich_truc: { level: "toan_quyen", scope: "toan_lop" },
      su_kien: { level: "toan_quyen", scope: "toan_lop" },
      bao_cao: { level: "chi_xem", scope: "toan_lop" },
    },
  },
  to_truong: {
    label: "🛡️ Tổ trưởng",
    desc: "Điểm danh theo tổ; xem Sơ đồ lớp, TKB, lịch thi, danh sách, sự kiện",
    badge: "#e0e7ff",
    badgeColor: "#4338ca",
    perms: {
      hoc_sinh: { level: "khong_co_quyen", scope: "toan_lop" },
      so_do_lop: { level: "chi_xem", scope: "toan_lop" },
      thoi_khoa_bieu: { level: "chi_xem", scope: "toan_lop" },
      lich_thi: { level: "chi_xem", scope: "toan_lop" },
      diem_danh: { level: "toan_quyen", scope: "theo_to" },
      quy: { level: "khong_co_quyen", scope: "toan_lop" },
      lich_truc: { level: "khong_co_quyen", scope: "toan_lop" },
      su_kien: { level: "toan_quyen", scope: "toan_lop" },
      bao_cao: { level: "chi_xem", scope: "theo_to" },
    },
  },
  thu_quy: {
    label: "💰 Thủ quỹ lớp",
    desc: "Toàn quyền quản lý quỹ thu chi; xem Sơ đồ lớp, TKB, lịch thi",
    badge: "#dcfce7",
    badgeColor: "#15803d",
    perms: {
      hoc_sinh: { level: "chi_xem", scope: "toan_lop" },
      so_do_lop: { level: "chi_xem", scope: "toan_lop" },
      thoi_khoa_bieu: { level: "chi_xem", scope: "toan_lop" },
      lich_thi: { level: "chi_xem", scope: "toan_lop" },
      diem_danh: { level: "khong_co_quyen", scope: "toan_lop" },
      quy: { level: "toan_quyen", scope: "toan_lop" },
      lich_truc: { level: "khong_co_quyen", scope: "toan_lop" },
      su_kien: { level: "chi_xem", scope: "toan_lop" },
      bao_cao: { level: "chi_xem", scope: "toan_lop" },
    },
  },
  chi_xem: {
    label: "👁️ Chỉ xem (Viewer)",
    desc: "Chỉ được xem thông tin mọi mục, không được sửa đổi",
    badge: "#f1f5f9",
    badgeColor: "#475569",
    perms: {
      hoc_sinh: { level: "chi_xem", scope: "toan_lop" },
      so_do_lop: { level: "chi_xem", scope: "toan_lop" },
      thoi_khoa_bieu: { level: "chi_xem", scope: "toan_lop" },
      lich_thi: { level: "chi_xem", scope: "toan_lop" },
      diem_danh: { level: "chi_xem", scope: "toan_lop" },
      quy: { level: "chi_xem", scope: "toan_lop" },
      lich_truc: { level: "chi_xem", scope: "toan_lop" },
      su_kien: { level: "chi_xem", scope: "toan_lop" },
      bao_cao: { level: "chi_xem", scope: "toan_lop" },
    },
  },
};

type TemplateKey = keyof typeof PERMISSION_TEMPLATES;

export default function AdminNguoiDungPage() {
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [classList, setClassList] = useState<string[]>(["11AT3", "12T2"]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    username: "",
    password: "",
    hoTen: "",
    roleLabel: "Giáo Viên Chủ Nhiệm",
    assignedLop: "12T2",
  });

  // Permission Matrix State
  const [permMatrix, setPermMatrix] = useState<Record<string, { level: string; scope: string; scopeToIds: number[] }>>({});

  // Delete State
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/classes"),
      ]);
      const d = await uRes.json();
      const c = await cRes.json();
      const serverUsers: UserItem[] = d.data || [];
      if (c.data && c.data.length > 0) setClassList(c.data);

      // 1. Read persistent local storage
      let customUsers: UserItem[] = [];
      let deletedUsernames: string[] = [];
      try {
        customUsers = JSON.parse(localStorage.getItem("admin_custom_users") || "[]");
        deletedUsernames = JSON.parse(localStorage.getItem("admin_deleted_users") || "[]");
      } catch {}

      // 2. Filter out deleted users
      let mergedUsers = serverUsers.filter(
        (u) => !deletedUsernames.includes(u.username.toLowerCase())
      );

      // 3. Add any custom created users missing from the server
      const existingUsernames = new Set(mergedUsers.map((u) => u.username.toLowerCase()));
      const missingUsers = customUsers.filter(
        (u) =>
          !existingUsernames.has(u.username.toLowerCase()) &&
          !deletedUsernames.includes(u.username.toLowerCase())
      );

      if (missingUsers.length > 0) {
        mergedUsers = [...mergedUsers, ...missingUsers];
        // Background sync to seed the current cold-start serverless container
        fetch("/api/users/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customUsers: missingUsers }),
        }).catch(() => {});
      }

      setUsers(mergedUsers);
    } catch {
      showToast("Lỗi tải danh sách người dùng", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  function applyTemplate(templateKey: TemplateKey) {
    const t = PERMISSION_TEMPLATES[templateKey];
    const newMatrix: Record<string, { level: string; scope: string; scopeToIds: number[] }> = {};

    for (const m of MODULES) {
      const def = t.perms[m.key as keyof typeof t.perms];
      if (def) {
        newMatrix[m.key] = {
          level: def.level,
          scope: def.scope,
          scopeToIds: def.scope === "theo_to" ? [1] : [],
        };
      }
    }
    setPermMatrix(newMatrix);
  }

  function openCreate() {
    setEditingUser(null);
    setForm({
      username: "",
      password: "",
      hoTen: "",
      roleLabel: "Giáo Viên Chủ Nhiệm",
      assignedLop: classList[0] || "12T2",
    });
    // Default matrix: GVCN template
    applyTemplate("gvcn");
    setModalOpen(true);
  }

  function openEdit(user: UserItem) {
    setEditingUser(user);
    setForm({
      username: user.username,
      password: "",
      hoTen: user.hoTen,
      roleLabel: user.roleLabel || "Thành viên",
      assignedLop: user.assignedLop || classList[0] || "12T2",
    });

    const matrix: Record<string, { level: string; scope: string; scopeToIds: number[] }> = {};
    for (const m of MODULES) {
      const p = user.permissions.find((x) => x.module === m.key);
      if (p) {
        let toIds: number[] = [];
        try {
          toIds = p.scopeToIds ? JSON.parse(p.scopeToIds) : [];
        } catch {
          toIds = [];
        }
        matrix[m.key] = {
          level: p.level,
          scope: p.scope,
          scopeToIds: toIds,
        };
      } else {
        matrix[m.key] = { level: "khong_co_quyen", scope: "toan_lop", scopeToIds: [] };
      }
    }
    setPermMatrix(matrix);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.username.trim() && !editingUser) {
      showToast("Vui lòng nhập tên đăng nhập", "error");
      return;
    }
    if (!form.password && !editingUser) {
      showToast("Vui lòng nhập mật khẩu cho tài khoản mới", "error");
      return;
    }
    if (!form.hoTen.trim()) {
      showToast("Vui lòng nhập họ và tên", "error");
      return;
    }

    setSaving(true);

    const permsPayload = Object.entries(permMatrix).map(([moduleKey, val]) => ({
      module: moduleKey,
      level: val.level,
      scope: val.scope,
      scopeToIds: val.scopeToIds,
    }));

    try {
      if (editingUser) {
        // Update user basic info
        await fetch(`/api/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hoTen: form.hoTen.trim(),
            roleLabel: form.roleLabel.trim(),
            assignedLop: form.assignedLop.trim() || "12T2",
            ...(form.password ? { password: form.password } : {}),
          }),
        });

        // Update user permissions
        await fetch(`/api/users/${editingUser.id}/perms`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: permsPayload }),
        });

        // Update in localStorage
        try {
          const stored: UserItem[] = JSON.parse(localStorage.getItem("admin_custom_users") || "[]");
          const idx = stored.findIndex((u) => u.username.toLowerCase() === editingUser.username.toLowerCase());
          if (idx >= 0) {
            stored[idx] = {
              ...stored[idx],
              hoTen: form.hoTen.trim(),
              roleLabel: form.roleLabel.trim(),
              assignedLop: form.assignedLop.trim(),
              permissions: permsPayload.map((p) => ({ ...p, scopeToIds: JSON.stringify(p.scopeToIds) })),
            };
            localStorage.setItem("admin_custom_users", JSON.stringify(stored));
          }
        } catch {}

        showToast("Đã cập nhật thông tin và quyền hạn thành công");
      } else {
        // Create new user with permissions
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username.trim(),
            password: form.password,
            hoTen: form.hoTen.trim(),
            roleLabel: form.roleLabel.trim(),
            assignedLop: form.assignedLop.trim() || "12T2",
            permissions: permsPayload,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.error || "Lỗi tạo tài khoản", "error");
          setSaving(false);
          return;
        }

        const newUserItem: UserItem = {
          id: Date.now(),
          username: form.username.trim().toLowerCase(),
          hoTen: form.hoTen.trim(),
          roleLabel: form.roleLabel.trim(),
          assignedLop: form.assignedLop.trim(),
          isSuperAdmin: false,
          isActive: true,
          createdAt: new Date().toISOString(),
          permissions: permsPayload.map((p) => ({ ...p, scopeToIds: JSON.stringify(p.scopeToIds) })),
        };

        try {
          const stored: UserItem[] = JSON.parse(localStorage.getItem("admin_custom_users") || "[]");
          const filtered = stored.filter((u) => u.username.toLowerCase() !== newUserItem.username);
          filtered.push({ ...newUserItem, password: form.password } as any);
          localStorage.setItem("admin_custom_users", JSON.stringify(filtered));

          // Also remove from deleted list if previously deleted
          const deleted: string[] = JSON.parse(localStorage.getItem("admin_deleted_users") || "[]");
          localStorage.setItem(
            "admin_deleted_users",
            JSON.stringify(deleted.filter((uname) => uname !== newUserItem.username))
          );
        } catch {}

        showToast("Đã tạo tài khoản người dùng thành công");
      }
      setModalOpen(false);
      loadData();
    } catch {
      showToast("Có lỗi xảy ra khi lưu dữ liệu", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        // Update local storage
        try {
          const username = deleteUser.username.toLowerCase();
          const stored: UserItem[] = JSON.parse(localStorage.getItem("admin_custom_users") || "[]");
          localStorage.setItem(
            "admin_custom_users",
            JSON.stringify(stored.filter((u) => u.username.toLowerCase() !== username))
          );

          const deleted: string[] = JSON.parse(localStorage.getItem("admin_deleted_users") || "[]");
          if (!deleted.includes(username)) {
            deleted.push(username);
            localStorage.setItem("admin_deleted_users", JSON.stringify(deleted));
          }
        } catch {}

        showToast(data.message || "Đã xóa người dùng thành công");
        setDeleteUser(null);
        loadData();
      } else {
        showToast(data.error || "Lỗi khi xóa người dùng", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 18px",
            borderRadius: 10,
            background: toast.type === "success" ? "var(--success)" : "var(--danger)",
            color: "white",
            fontWeight: 600,
            fontSize: "0.875rem",
            boxShadow: "var(--shadow-lg)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 22,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <UserCog size={26} color="var(--primary)" />
            Quản lý tài khoản & phân quyền lớp
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Phân quyền chi tiết cho từng lớp học, GVCN, Ban cán sự và Tổ trưởng
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={15} /> Thêm tài khoản mới
        </button>
      </div>

      {/* User Table */}
      <div className="card" style={{ overflow: "hidden", borderRadius: 14 }}>
        {loading ? (
          <div style={{ padding: 32 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 8 }} />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tên đăng nhập</th>
                  <th>Họ và tên</th>
                  <th>Lớp phụ trách</th>
                  <th>Chức danh</th>
                  <th>Quyền hạn tóm tắt</th>
                  <th style={{ width: 110, textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {u.isSuperAdmin ? (
                          <span className="badge badge-primary" style={{ padding: "3px 8px" }}>
                            <Shield size={12} /> Admin
                          </span>
                        ) : null}
                        <span style={{ fontWeight: 700, color: "var(--primary)" }}>{u.username}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.hoTen}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        Lớp {u.assignedLop || "12T2"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      {u.roleLabel || "Thành viên"}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: 300 }}>
                      {u.isSuperAdmin ? (
                        <span style={{ color: "var(--primary)", fontWeight: 700 }}>Toàn quyền hệ thống</span>
                      ) : (
                        u.permissions
                          .map(
                            (p) =>
                              `${p.module} (${
                                p.level === "toan_quyen"
                                  ? "Toàn quyền"
                                  : p.level === "chi_xem"
                                  ? "Chỉ xem"
                                  : "Không"
                              })`
                          )
                          .join(", ")
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {!u.isSuperAdmin && (
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => openEdit(u)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "4px 8px" }}
                            title="Chỉnh sửa phân quyền"
                          >
                            <Key size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteUser(u)}
                            className="btn btn-sm"
                            style={{
                              background: "#fee2e2",
                              color: "#dc2626",
                              border: "1px solid #fca5a5",
                              padding: "4px 8px",
                            }}
                            title="Xóa người dùng"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====== BUNG RỘNG THOÁNG ĐÃNG: ADD / EDIT MODAL VIA PORTAL ====== */}
      {mounted &&
        modalOpen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99999,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "20px 16px",
              background: "rgba(15, 23, 42, 0.7)",
              backdropFilter: "blur(8px)",
              animation: "fadeIn 0.15s ease",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false);
            }}
          >
            {/* Expanded Modal Box */}
            <div
              style={{
                position: "relative",
                background: "#ffffff",
                borderRadius: 20,
                boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.4)",
                width: "100%",
                maxWidth: 960,
                maxHeight: "92vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: "1px solid var(--border)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "20px 28px",
                  borderBottom: "1px solid var(--border)",
                  background: "linear-gradient(to right, #f8fafc, #f1f5f9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "var(--primary)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 10px rgba(16,90,188,0.25)",
                    }}
                  >
                    <UserCog size={24} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                      {editingUser ? `Cập nhật tài khoản: ${editingUser.username}` : "Tạo tài khoản & Phân quyền mới"}
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "0.825rem", color: "var(--text-muted)" }}>
                      Thiết lập thông tin đăng nhập và ma trận phân quyền chi tiết từng module
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    cursor: "pointer",
                    padding: 8,
                    borderRadius: "50%",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}
                  aria-label="Đóng"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
                {/* SECTION 1: ACCOUNT DETAILS */}
                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 800,
                      color: "var(--primary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <User size={16} /> 1. Thông tin đăng nhập & hồ sơ
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                    <div>
                      <label className="label">Tên đăng nhập *</label>
                      <input
                        className="input"
                        disabled={!!editingUser}
                        value={form.username}
                        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                        placeholder="VD: gvcn_12t2 hoặc totruong1"
                        style={{ background: editingUser ? "var(--bg-muted)" : "white" }}
                      />
                    </div>
                    <div>
                      <label className="label">
                        Mật khẩu {editingUser ? "(Bỏ trống nếu giữ nguyên)" : "*"}
                      </label>
                      <input
                        type="password"
                        className="input"
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder={editingUser ? "••••••••" : "Nhập mật khẩu..."}
                      />
                    </div>
                    <div>
                      <label className="label">Họ và tên *</label>
                      <input
                        className="input"
                        value={form.hoTen}
                        onChange={(e) => setForm((f) => ({ ...f, hoTen: e.target.value }))}
                        placeholder="VD: Nguyễn Văn Tuấn"
                      />
                    </div>
                    <div>
                      <label className="label">Lớp phụ trách *</label>
                      <select
                        className="select"
                        style={{ fontWeight: 700, color: "var(--primary)" }}
                        value={form.assignedLop}
                        onChange={(e) => setForm((f) => ({ ...f, assignedLop: e.target.value }))}
                      >
                        {classList.map((c) => (
                          <option key={c} value={c}>
                            Lớp {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Chức danh / Vai trò</label>
                      <input
                        className="input"
                        value={form.roleLabel}
                        onChange={(e) => setForm((f) => ({ ...f, roleLabel: e.target.value }))}
                        placeholder="Giáo Viên Chủ Nhiệm..."
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: QUICK TEMPLATES */}
                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 800,
                      color: "var(--primary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Sparkles size={16} color="#d97706" /> 2. Chọn mẫu phân quyền nhanh
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                    {(Object.keys(PERMISSION_TEMPLATES) as TemplateKey[]).map((k) => {
                      const t = PERMISSION_TEMPLATES[k];
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => applyTemplate(k)}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            padding: "10px 14px",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.background = "#eff6ff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.background = "#f8fafc";
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>{t.label}</div>
                          <div style={{ fontSize: "0.725rem", color: "#64748b", lineHeight: 1.3 }}>{t.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION 3: PERMISSION MATRIX */}
                <div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 800,
                      color: "var(--primary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Layers size={16} /> 3. Ma trận phân quyền chi tiết
                  </div>

                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      overflow: "hidden",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <table className="table" style={{ margin: 0 }}>
                      <thead style={{ background: "#f8fafc" }}>
                        <tr>
                          <th style={{ width: "35%" }}>Module Chức năng</th>
                          <th style={{ width: "25%" }}>Mức quyền</th>
                          <th style={{ width: "20%" }}>Phạm vi</th>
                          <th style={{ width: "20%" }}>Tổ áp dụng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MODULES.map((m) => {
                          const current = permMatrix[m.key] || {
                            level: "khong_co_quyen",
                            scope: "toan_lop",
                            scopeToIds: [],
                          };
                          return (
                            <tr key={m.key} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td>
                                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{m.label}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.desc}</div>
                              </td>
                              <td>
                                <select
                                  className="select"
                                  style={{
                                    height: 36,
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    borderColor:
                                      current.level === "toan_quyen"
                                        ? "#86efac"
                                        : current.level === "chi_xem"
                                        ? "#93c5fd"
                                        : "var(--border)",
                                    background:
                                      current.level === "toan_quyen"
                                        ? "#f0fdf4"
                                        : current.level === "chi_xem"
                                        ? "#eff6ff"
                                        : "white",
                                    color:
                                      current.level === "toan_quyen"
                                        ? "#15803d"
                                        : current.level === "chi_xem"
                                        ? "#1d4ed8"
                                        : "var(--text-muted)",
                                  }}
                                  value={current.level}
                                  onChange={(e) => {
                                    const lvl = e.target.value;
                                    setPermMatrix((prev) => ({
                                      ...prev,
                                      [m.key]: { ...current, level: lvl },
                                    }));
                                  }}
                                >
                                  <option value="khong_co_quyen">🚫 Không có quyền</option>
                                  <option value="chi_xem">👁️ Chỉ xem</option>
                                  <option value="toan_quyen">⚡ Toàn quyền</option>
                                </select>
                              </td>
                              <td>
                                <select
                                  className="select"
                                  style={{ height: 36, fontSize: "0.85rem" }}
                                  value={current.scope}
                                  disabled={current.level === "khong_co_quyen"}
                                  onChange={(e) => {
                                    const scp = e.target.value;
                                    setPermMatrix((prev) => ({
                                      ...prev,
                                      [m.key]: { ...current, scope: scp },
                                    }));
                                  }}
                                >
                                  <option value="toan_lop">🏫 Toàn lớp</option>
                                  <option value="theo_to">👥 Theo tổ</option>
                                </select>
                              </td>
                              <td>
                                {current.scope === "theo_to" && current.level !== "khong_co_quyen" ? (
                                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                    {[1, 2, 3, 4].map((toNum) => {
                                      const selected = current.scopeToIds.includes(toNum);
                                      return (
                                        <button
                                          key={toNum}
                                          type="button"
                                          onClick={() => {
                                            const nextIds = selected
                                              ? current.scopeToIds.filter((id) => id !== toNum)
                                              : [...current.scopeToIds, toNum];
                                            setPermMatrix((prev) => ({
                                              ...prev,
                                              [m.key]: { ...current, scopeToIds: nextIds },
                                            }));
                                          }}
                                          style={{
                                            padding: "4px 8px",
                                            borderRadius: 6,
                                            border: selected ? "1px solid var(--primary)" : "1px solid var(--border)",
                                            background: selected ? "var(--primary)" : "#f8fafc",
                                            color: selected ? "white" : "#64748b",
                                            fontWeight: 700,
                                            fontSize: "0.75rem",
                                            cursor: "pointer",
                                          }}
                                        >
                                          T{toNum}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div
                style={{
                  padding: "18px 28px",
                  borderTop: "1px solid var(--border)",
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <button
                  className="btn btn-secondary"
                  style={{ minWidth: 100, height: 42 }}
                  onClick={() => setModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  className="btn btn-primary"
                  style={{ minWidth: 220, height: 42, fontSize: "0.95rem", fontWeight: 700 }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : <><Save size={16} /> Lưu người dùng & phân quyền</>}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ====== DELETE USER CONFIRM MODAL VIA PORTAL ====== */}
      {mounted &&
        deleteUser !== null &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 100000,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => !deleting && setDeleteUser(null)}
          >
            <div
              style={{
                background: "white",
                borderRadius: 18,
                boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.4)",
                padding: "28px 32px",
                width: "100%",
                maxWidth: 420,
                animation: "fadeIn 0.15s ease",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    background: "#fee2e2",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                  }}
                >
                  <Trash2 size={26} color="#dc2626" />
                </div>
                <h3 style={{ fontSize: "1.25rem", color: "#0f172a", marginBottom: 6, fontWeight: 800 }}>
                  Xóa tài khoản người dùng?
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0, lineHeight: 1.5 }}>
                  Bạn có chắc chắn muốn xóa tài khoản{" "}
                  <strong style={{ color: "var(--primary)" }}>{deleteUser.username}</strong> ({deleteUser.hoTen})?
                </p>
              </div>

              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 22,
                  fontSize: "0.825rem",
                  color: "#991b1b",
                  textAlign: "center",
                }}
              >
                ⚠️ Toàn bộ phân quyền của tài khoản này sẽ bị thu hồi vĩnh viễn.
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, height: 40 }}
                  onClick={() => setDeleteUser(null)}
                  disabled={deleting}
                >
                  Hủy bỏ
                </button>
                <button
                  className="btn"
                  style={{
                    flex: 1.4,
                    height: 40,
                    background: "#dc2626",
                    color: "white",
                    borderColor: "#dc2626",
                    fontWeight: 700,
                  }}
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
