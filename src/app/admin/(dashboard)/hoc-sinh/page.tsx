"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, Plus, Search, Filter, Edit2, Trash2, Upload,
  Download, ChevronLeft, ChevronRight, X, Save, AlertCircle,
  User, CheckCircle, School,
} from "lucide-react";
import { formatDate } from "@/lib/format";

// ==================
// TYPES
// ==================
interface Student {
  id: number;
  hoTen: string;
  tenGoi: string | null;
  ngaySinh: string | null;
  gioiTinh: string;
  to: number;
  lop: string;
  ghiChu: string | null;
}

interface FormData {
  hoTen: string;
  tenGoi: string;
  ngaySinh: string;
  gioiTinh: string;
  to: string;
  lop: string;
  ghiChu: string;
}

const EMPTY_FORM: FormData = {
  hoTen: "", tenGoi: "", ngaySinh: "", gioiTinh: "Nam", to: "1", lop: "12T2", ghiChu: "",
};

const PER_PAGE = 20;

// ==================
// MAIN PAGE
// ==================
export default function HocSinhPage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const { data: session } = useSession();

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "11AT3";

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTo, setFilterTo] = useState(0);
  const [filterLop, setFilterLop] = useState(() => {
    if (!isSuperAdmin && assignedLop) return assignedLop;
    return urlLop || "ALL";
  });
  const [classList, setClassList] = useState<string[]>(["11AT3", "12T2"]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // File upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Load distinct classes
  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) setClassList(d.data);
      })
      .catch(() => {});
  }, []);

  // Sync with URL query parameter or assignedLop
  useEffect(() => {
    if (!isSuperAdmin && assignedLop) {
      setFilterLop(assignedLop);
      return;
    }
    if (urlLop) {
      setFilterLop(urlLop);
    }
  }, [urlLop, isSuperAdmin, assignedLop]);

  // ==================
  // FETCH
  // ==================
  const fetchStudents = async () => {
    setLoading(true);
    const activeClass = !isSuperAdmin ? assignedLop : filterLop;
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(PER_PAGE),
    });
    if (search) params.set("search", search);
    if (filterTo > 0) params.set("to", String(filterTo));
    if (activeClass && activeClass !== "ALL") params.set("lop", activeClass);

    const res = await fetch(`/api/students?${params}`);
    const data = await res.json();
    setStudents(data.data || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
  }, [search, filterTo, filterLop]);

  useEffect(() => {
    fetchStudents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterTo, filterLop]);

  // ==================
  // MODAL
  // ==================
  function openAdd() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      lop: filterLop !== "ALL" ? filterLop : (classList[0] || "12T2"),
    });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    setForm({
      hoTen: s.hoTen,
      tenGoi: s.tenGoi || "",
      ngaySinh: s.ngaySinh ? new Date(s.ngaySinh).toISOString().split("T")[0] : "",
      gioiTinh: s.gioiTinh,
      to: String(s.to),
      lop: s.lop,
      ghiChu: s.ghiChu || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.hoTen.trim()) {
      setFormError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!form.to || Number(form.to) < 1 || Number(form.to) > 4) {
      setFormError("Tổ phải từ 1 đến 4.");
      return;
    }
    setSaving(true);
    setFormError("");

    const body = {
      hoTen: form.hoTen.trim(),
      tenGoi: form.tenGoi.trim() || null,
      ngaySinh: form.ngaySinh || null,
      gioiTinh: form.gioiTinh,
      to: Number(form.to),
      lop: form.lop?.trim() || "12T2",
      ghiChu: form.ghiChu.trim() || null,
    };

    const url = editing ? `/api/students/${editing.id}` : "/api/students";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showToast(editing ? "Đã cập nhật học sinh." : "Đã thêm học sinh mới.");
      setModalOpen(false);
      fetchStudents();
    } else {
      const err = await res.json();
      setFormError(err.error || "Có lỗi xảy ra.");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/students/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Đã xóa học sinh.");
      fetchStudents();
    } else {
      showToast("Có lỗi khi xóa.", "error");
    }
    setDeleting(false);
    setDeleteId(null);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/students/import", { method: "POST", body: formData });
    if (res.ok) {
      const d = await res.json();
      showToast(`Đã import ${d.count} học sinh thành công.`);
      fetchStudents();
    } else {
      showToast("Import thất bại. Kiểm tra lại file Excel.", "error");
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleExport() {
    window.open("/api/students/export", "_blank");
  }

  const totalPages = Math.ceil(total / PER_PAGE);
  const byTo = [1, 2, 3, 4].map((t) => students.filter((s) => s.to === t).length);

  return (
    <div className="animate-fade-in">
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 1000,
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

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: 4 }}>
            Quản lý học sinh {filterLop !== "ALL" ? `— Lớp ${filterLop}` : "Toàn trường"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            {total} học sinh • 4 tổ
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: "none" }} id="import-excel" />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            <Upload size={14} />
            {importing ? "Đang import..." : "Import Excel"}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={14} />
            Export
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={14} />
            Thêm học sinh
          </button>
        </div>
      </div>

      {/* Tổng hợp theo tổ */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[1, 2, 3, 4].map((t, i) => (
          <div
            key={t}
            className="card"
            style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", border: filterTo === t ? "2px solid var(--primary)" : undefined }}
            onClick={() => setFilterTo(filterTo === t ? 0 : t)}
          >
            <Users size={14} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>Tổ {t}:</span>
            <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "1rem" }}>{byTo[i]}</span>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Tìm tên học sinh..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ flex: "0 0 140px", fontWeight: 700, color: "var(--primary)" }}
          value={filterLop}
          onChange={(e) => setFilterLop(e.target.value)}
        >
          <option value="ALL">🏫 Tất cả các lớp</option>
          {classList.map((c) => (
            <option key={c} value={c}>
              Lớp {c}
            </option>
          ))}
        </select>
        <select
          className="select"
          style={{ flex: "0 0 120px" }}
          value={filterTo}
          onChange={(e) => setFilterTo(Number(e.target.value))}
        >
          <option value={0}>Tất cả tổ</option>
          {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Tổ {t}</option>)}
        </select>
        {(search || filterTo > 0 || filterLop !== "ALL") && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setSearch(""); setFilterTo(0); setFilterLop("ALL"); }}
          >
            <X size={13} /> Bỏ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 42, marginBottom: 6, borderRadius: 6 }} />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: 64, textAlign: "center", color: "var(--text-muted)" }}>
            <Users size={40} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>Không tìm thấy học sinh nào</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Họ và tên</th>
                  <th>Tên gọi</th>
                  <th>Lớp</th>
                  <th>Tổ</th>
                  <th>Giới tính</th>
                  <th>Ghi chú</th>
                  <th style={{ width: 90 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {(page - 1) * PER_PAGE + idx + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.hoTen}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{s.tenGoi || "—"}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                        {s.lop}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>Tổ {s.to}</span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: "0.8rem", fontWeight: 600,
                        color: s.gioiTinh === "Nữ" ? "hsl(330,70%,50%)" : "var(--info)",
                      }}>
                        {s.gioiTinh}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {s.ghiChu || "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => openEdit(s)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "5px 7px", borderRadius: 6, color: "var(--primary)", display: "flex", alignItems: "center" }}
                          title="Sửa"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "5px 7px", borderRadius: 6, color: "var(--danger)", display: "flex", alignItems: "center" }}
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} / {total}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ padding: "5px 12px", fontSize: "0.85rem", fontWeight: 600 }}>
                {page} / {totalPages}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====== ADD/EDIT MODAL ====== */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={() => setModalOpen(false)} />
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "white", borderRadius: 14, boxShadow: "var(--shadow-lg)", padding: "28px 28px",
            width: "100%", maxWidth: 480, maxHeight: "90dvh", overflowY: "auto",
            animation: "fadeIn 0.2s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>
                {editing ? "Cập nhật học sinh" : "Thêm học sinh mới"}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={18} color="var(--text-muted)" />
              </button>
            </div>

            {formError && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "var(--danger-light)", border: "1px solid var(--danger-border)", borderRadius: 8, color: "var(--danger)", fontSize: "0.875rem", fontWeight: 600, marginBottom: 16 }}>
                <AlertCircle size={14} />
                {formError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Họ và tên *</label>
                <input className="input" value={form.hoTen} onChange={(e) => setForm(f => ({ ...f, hoTen: e.target.value }))} placeholder="Nguyễn Văn A" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Tên gọi</label>
                  <input className="input" value={form.tenGoi} onChange={(e) => setForm(f => ({ ...f, tenGoi: e.target.value }))} placeholder="An" />
                </div>
                <div>
                  <label className="label">Lớp *</label>
                  <input className="input" value={form.lop} onChange={(e) => setForm(f => ({ ...f, lop: e.target.value }))} placeholder="12T2" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Giới tính</label>
                  <select className="select" value={form.gioiTinh} onChange={(e) => setForm(f => ({ ...f, gioiTinh: e.target.value }))}>
                    <option>Nam</option>
                    <option>Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tổ *</label>
                  <select className="select" value={form.to} onChange={(e) => setForm(f => ({ ...f, to: e.target.value }))}>
                    <option value="1">Tổ 1</option>
                    <option value="2">Tổ 2</option>
                    <option value="3">Tổ 3</option>
                    <option value="4">Tổ 4</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Ghi chú (Lớp cũ, thông tin khác...)</label>
                <input className="input" value={form.ghiChu} onChange={(e) => setForm(f => ({ ...f, ghiChu: e.target.value }))} placeholder="Ví dụ: Lớp cũ: 11AT3" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : (<><Save size={14} /> Lưu</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== DELETE CONFIRM ====== */}
      {deleteId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={() => setDeleteId(null)} />
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "white", borderRadius: 14, boxShadow: "var(--shadow-lg)", padding: "28px",
            width: "100%", maxWidth: 380, animation: "fadeIn 0.2s ease",
          }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, background: "var(--danger-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Trash2 size={22} color="var(--danger)" />
              </div>
              <h3>Xác nhận xóa?</h3>
              <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: "0.875rem" }}>
                Tất cả dữ liệu liên quan sẽ bị xóa theo.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>Hủy</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete} disabled={deleting}>
                {deleting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
