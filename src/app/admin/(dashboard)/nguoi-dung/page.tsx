"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  UserCog, Plus, Shield, CheckCircle, AlertCircle, Edit2,
  Trash2, Key, UserCheck, UserX, Save, X, School, Users,
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
  { key: "hoc_sinh", label: "Quản lý Học sinh" },
  { key: "diem_danh", label: "Điểm danh" },
  { key: "quy", label: "Quản lý Quỹ lớp" },
  { key: "lich_truc", label: "Lịch trực nhật" },
  { key: "su_kien", label: "Sự kiện & Công việc" },
  { key: "bao_cao", label: "Báo cáo & Thống kê" },
];

const PERMISSION_TEMPLATES = {
  gvcn: {
    label: "GVCN",
    desc: "Toàn quyền mọi module của lớp",
    perms: {
      hoc_sinh: { level: "toan_quyen", scope: "toan_lop" },
      diem_danh: { level: "toan_quyen", scope: "toan_lop" },
      quy: { level: "toan_quyen", scope: "toan_lop" },
      lich_truc: { level: "toan_quyen", scope: "toan_lop" },
      su_kien: { level: "toan_quyen", scope: "toan_lop" },
      bao_cao: { level: "toan_quyen", scope: "toan_lop" },
    },
  },
  lop_truong: {
    label: "Lớp trưởng / Lớp phó",
    desc: "Điểm danh, trực nhật, sự kiện toàn lớp; Quỹ và Báo cáo chỉ xem",
    perms: {
      hoc_sinh: { level: "chi_xem", scope: "toan_lop" },
      diem_danh: { level: "toan_quyen", scope: "toan_lop" },
      quy: { level: "chi_xem", scope: "toan_lop" },
      lich_truc: { level: "toan_quyen", scope: "toan_lop" },
      su_kien: { level: "toan_quyen", scope: "toan_lop" },
      bao_cao: { level: "chi_xem", scope: "toan_lop" },
    },
  },
  to_truong: {
    label: "Tổ trưởng",
    desc: "Chỉ điểm danh học sinh thuộc Tổ của mình",
    perms: {
      hoc_sinh: { level: "khong_co_quyen", scope: "theo_to" },
      diem_danh: { level: "toan_quyen", scope: "theo_to" },
      quy: { level: "khong_co_quyen", scope: "theo_to" },
      lich_truc: { level: "chi_xem", scope: "theo_to" },
      su_kien: { level: "chi_xem", scope: "theo_to" },
      bao_cao: { level: "khong_co_quyen", scope: "theo_to" },
    },
  },
};

type TemplateKey = keyof typeof PERMISSION_TEMPLATES;

export default function AdminNguoiDungPage() {
  const { data: session } = useSession();
  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;

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

  // Permission Matrix State: Record<moduleKey, { level, scope, scopeToIds: number[] }>
  const [permMatrix, setPermMatrix] = useState<Record<string, { level: string; scope: string; scopeToIds: number[] }>>({});

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
      setUsers(d.data || []);
      if (c.data && c.data.length > 0) setClassList(c.data);
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
    applyTemplate("gvcn");
    setModalOpen(true);
  }

  function openEdit(user: UserItem) {
    setEditingUser(user);
    setForm({
      username: user.username,
      password: "",
      hoTen: user.hoTen,
      roleLabel: user.roleLabel || "",
      assignedLop: user.assignedLop || "11AT3",
    });

    const matrix: Record<string, { level: string; scope: string; scopeToIds: number[] }> = {};
    for (const m of MODULES) {
      const existing = user.permissions.find(p => p.module === m.key);
      if (existing) {
        matrix[m.key] = {
          level: existing.level,
          scope: existing.scope,
          scopeToIds: JSON.parse(existing.scopeToIds || "[]"),
        };
      } else {
        matrix[m.key] = { level: "khong_co_quyen", scope: "toan_lop", scopeToIds: [] };
      }
    }
    setPermMatrix(matrix);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.username.trim() || !form.hoTen.trim()) {
      showToast("Vui lòng điền đủ thông tin", "error");
      return;
    }
    if (!editingUser && !form.password) {
      showToast("Vui lòng đặt mật khẩu", "error");
      return;
    }

    setSaving(true);
    const permsPayload = Object.entries(permMatrix).map(([module, val]) => ({
      module,
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
            assignedLop: form.assignedLop.trim() || "11AT3",
            ...(form.password ? { password: form.password } : {}),
          }),
        });

        // Update user permissions
        await fetch(`/api/users/${editingUser.id}/perms`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: permsPayload }),
        });

        showToast("Đã cập nhật thông tin và quyền hạn");
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
            assignedLop: form.assignedLop.trim() || "11AT3",
            permissions: permsPayload,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          showToast(err.error || "Lỗi tạo tài khoản", "error");
          setSaving(false);
          return;
        }
        showToast("Đã tạo tài khoản thành công");
      }
      setModalOpen(false);
      loadData();
    } catch {
      showToast("Có lỗi xảy ra", "error");
    } finally {
      setSaving(false);
    }
  }

  // Delete State
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
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
    <div className="animate-fade-in">
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 10000,
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 18px", borderRadius: 10,
            background: toast.type === "success" ? "var(--success)" : "var(--danger)",
            color: "white", fontWeight: 600, fontSize: "0.875rem",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: 4 }}>Quản lý tài khoản & phân quyền lớp</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Phân quyền chi tiết cho từng lớp học, GVCN, Ban cán sự và Tổ trưởng
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={14} /> Thêm tài khoản mới
        </button>
      </div>

      {/* User Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 6 }} />
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
                  <th style={{ width: 100 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {u.isSuperAdmin ? (
                          <span className="badge badge-primary" style={{ padding: "3px 6px" }}><Shield size={12} /> Admin</span>
                        ) : null}
                        <span style={{ fontWeight: 700, color: "var(--primary)" }}>{u.username}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.hoTen}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        Lớp {u.assignedLop || "11AT3"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      {u.roleLabel || "Thành viên"}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: 280 }}>
                      {u.isSuperAdmin ? (
                        <span style={{ color: "var(--primary)", fontWeight: 700 }}>Toàn quyền hệ thống</span>
                      ) : (
                        u.permissions.map(p => `${p.module} (${p.level === "toan_quyen" ? "Toàn quyền" : p.level === "chi_xem" ? "Chỉ xem" : "Không"})`).join(", ")
                      )}
                    </td>
                    <td>
                      {!u.isSuperAdmin && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => openEdit(u)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: 4 }}
                            title="Chỉnh sửa phân quyền"
                          >
                            <Key size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteUser(u)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}
                            title="Xóa người dùng"
                          >
                            <Trash2 size={14} />
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

      {/* Add / Edit Modal with Matrix — Bulletproof Top-Aligned Overlay */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            overflowY: "auto",
            padding: "36px 16px 60px",
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(6px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          {/* Modal Card */}
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 16,
              boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
              padding: "28px 32px",
              width: "100%",
              maxWidth: 680,
              zIndex: 10000,
              animation: "fadeIn 0.2s ease",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserCog size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>
                    {editingUser ? `Cập nhật quyền: ${editingUser.username}` : "Tạo tài khoản người dùng mới"}
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Điền thông tin tài khoản và thiết lập ma trận phân quyền
                  </div>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "var(--text-muted)" }}
                aria-label="Đóng"
              >
                <X size={22} />
              </button>
            </div>

            {/* Basic Info: Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label className="label">Tên đăng nhập *</label>
                <input
                  className="input"
                  disabled={!!editingUser}
                  value={form.username}
                  onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="VD: gvcn_12t2 hoặc totruong1"
                />
              </div>
              <div>
                <label className="label">Mật khẩu {editingUser ? "(Bỏ trống nếu không đổi)" : "*"}</label>
                <input
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Basic Info: Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
              <div>
                <label className="label">Họ và tên *</label>
                <input
                  className="input"
                  value={form.hoTen}
                  onChange={(e) => setForm(f => ({ ...f, hoTen: e.target.value }))}
                  placeholder="VD: Nguyễn Văn Tuấn"
                />
              </div>
              <div>
                <label className="label">Lớp phụ trách *</label>
                <select
                  className="select"
                  style={{ fontWeight: 700, color: "var(--primary)" }}
                  value={form.assignedLop}
                  onChange={(e) => setForm(f => ({ ...f, assignedLop: e.target.value }))}
                >
                  {classList.map(c => (
                    <option key={c} value={c}>
                      Lớp {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Chức danh</label>
                <input
                  className="input"
                  value={form.roleLabel}
                  onChange={(e) => setForm(f => ({ ...f, roleLabel: e.target.value }))}
                  placeholder="Giáo Viên Chủ Nhiệm"
                />
              </div>
            </div>

            {/* Quick Templates */}
            <div style={{ marginBottom: 16, background: "var(--bg-muted)", padding: "10px 14px", borderRadius: 10 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginRight: 8 }}>
                Áp dụng mẫu phân quyền nhanh:
              </span>
              <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {(Object.keys(PERMISSION_TEMPLATES) as TemplateKey[]).map(k => (
                  <button
                    key={k}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.78rem", padding: "4px 10px", fontWeight: 600 }}
                    onClick={() => applyTemplate(k)}
                  >
                    {PERMISSION_TEMPLATES[k].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Permission Matrix */}
            <h4 style={{ fontSize: "0.92rem", marginBottom: 10, fontWeight: 700 }}>
              Ma trận phân quyền theo module:
            </h4>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
              <table className="table" style={{ fontSize: "0.82rem" }}>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th style={{ width: 140 }}>Mức quyền</th>
                    <th style={{ width: 130 }}>Phạm vi</th>
                    <th>Tổ áp dụng</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(m => {
                    const current = permMatrix[m.key] || { level: "khong_co_quyen", scope: "toan_lop", scopeToIds: [] };
                    return (
                      <tr key={m.key}>
                        <td style={{ fontWeight: 600 }}>{m.label}</td>
                        <td>
                          <select
                            className="select"
                            style={{ minHeight: 32, padding: "4px 24px 4px 8px", fontSize: "0.8rem" }}
                            value={current.level}
                            onChange={(e) => {
                              const lvl = e.target.value;
                              setPermMatrix(prev => ({
                                ...prev,
                                [m.key]: { ...current, level: lvl },
                              }));
                            }}
                          >
                            <option value="khong_co_quyen">Không có quyền</option>
                            <option value="chi_xem">Chỉ xem</option>
                            <option value="toan_quyen">Toàn quyền</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className="select"
                            style={{ minHeight: 32, padding: "4px 24px 4px 8px", fontSize: "0.8rem" }}
                            value={current.scope}
                            disabled={current.level === "khong_co_quyen"}
                            onChange={(e) => {
                              const scp = e.target.value;
                              setPermMatrix(prev => ({
                                ...prev,
                                [m.key]: { ...current, scope: scp },
                              }));
                            }}
                          >
                            <option value="toan_lop">Toàn lớp</option>
                            <option value="theo_to">Theo tổ</option>
                          </select>
                        </td>
                        <td>
                          {current.scope === "theo_to" && (
                            <div style={{ display: "flex", gap: 4 }}>
                              {[1, 2, 3, 4].map(toNum => {
                                const selected = current.scopeToIds.includes(toNum);
                                return (
                                  <button
                                    key={toNum}
                                    type="button"
                                    onClick={() => {
                                      const nextIds = selected
                                        ? current.scopeToIds.filter(id => id !== toNum)
                                        : [...current.scopeToIds, toNum];
                                      setPermMatrix(prev => ({
                                        ...prev,
                                        [m.key]: { ...current, scopeToIds: nextIds },
                                      }));
                                    }}
                                    className={`btn btn-sm ${selected ? "btn-primary" : "btn-secondary"}`}
                                    style={{ padding: "2px 6px", fontSize: "0.72rem", minHeight: 24 }}
                                  >
                                    T{toNum}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 42, fontSize: "0.95rem" }} onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : <><Save size={16} /> Lưu người dùng & phân quyền</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== DELETE USER CONFIRM MODAL ====== */}
      {deleteUser !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10005 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(3px)" }}
            onClick={() => !deleting && setDeleteUser(null)}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              background: "white",
              borderRadius: 16,
              boxShadow: "var(--shadow-xl)",
              padding: "28px",
              width: "100%",
              maxWidth: 400,
              animation: "fadeIn 0.2s ease",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  background: "#fee2e2",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Trash2 size={26} color="#dc2626" />
              </div>
              <h3 style={{ fontSize: "1.2rem", color: "#1e293b", marginBottom: 6 }}>
                Xóa tài khoản người dùng?
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0, lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa tài khoản <strong style={{ color: "var(--primary)" }}>{deleteUser.username}</strong> ({deleteUser.hoTen})?
              </p>
            </div>

            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 20,
                fontSize: "0.8rem",
                color: "#991b1b",
                textAlign: "center",
              }}
            >
              ⚠️ Toàn bộ phân quyền của tài khoản này sẽ bị thu hồi vĩnh viễn.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setDeleteUser(null)}
                disabled={deleting}
              >
                Hủy bỏ
              </button>
              <button
                className="btn"
                style={{ flex: 1.4, background: "#dc2626", color: "white", borderColor: "#dc2626", fontWeight: 700 }}
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
