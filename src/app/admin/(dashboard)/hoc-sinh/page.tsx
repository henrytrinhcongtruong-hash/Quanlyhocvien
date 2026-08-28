"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, Plus, Search, Filter, Edit2, Trash2, Upload,
  Download, ChevronLeft, ChevronRight, X, Save, AlertCircle,
  User, CheckCircle, School, ArrowUpDown, ArrowUpAZ, ArrowDownAZ,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { compareVietnameseNames } from "@/lib/utils";

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
  avatar?: string | null;
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
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("admin_student_sort_order") as "default" | "asc" | "desc") || "default";
    }
    return "default";
  });

  const handleSetSortOrder = (newOrder: "default" | "asc" | "desc") => {
    setSortOrder(newOrder);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_student_sort_order", newOrder);
    }
  };

  const [filterTo, setFilterTo] = useState(0);
  const [filterLop, setFilterLop] = useState(() => {
    if (!isSuperAdmin && assignedLop) return assignedLop;
    return urlLop || "12T2";
  });
  const [classList, setClassList] = useState<string[]>(["12T2", "11AT3"]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Delete Class State
  const [deleteClassModalOpen, setDeleteClassModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState("");
  const [deletingClass, setDeletingClass] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // File upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDeleteClass() {
    if (!classToDelete) return;
    setDeletingClass(true);
    try {
      const res = await fetch(`/api/classes?lop=${encodeURIComponent(classToDelete)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Đã xóa hoàn toàn lớp ${classToDelete}.`);
        setDeleteClassModalOpen(false);
        // Refresh class list & update filter
        const cRes = await fetch("/api/classes");
        const cData = await cRes.json();
        const newClasses = cData.data || [];
        setClassList(newClasses);
        setFilterLop(newClasses[0] || "ALL");
        fetchStudents();
      } else {
        showToast(data.error || "Có lỗi khi xóa lớp.", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    }
    setDeletingClass(false);
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
  // FETCH — parallel classes + students
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

    try {
      const [studentRes, classRes] = await Promise.all([
        fetch(`/api/students?${params}`),
        fetch("/api/classes"),
      ]);
      const [data, classData] = await Promise.all([
        studentRes.json(), classRes.json(),
      ]);
      setStudents(data.data || []);
      setTotal(data.total || 0);
      if (classData.data && classData.data.length > 0) setClassList(classData.data);
    } catch {
      setStudents([]);
      setTotal(0);
    }
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

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const savedStudent: Student = await res.json();
        if (editing) {
          setStudents((prev) => prev.map((s) => (s.id === editing.id ? savedStudent : s)));
          showToast("Đã cập nhật học sinh.");
        } else {
          setStudents((prev) => [savedStudent, ...prev]);
          showToast("Đã thêm học sinh mới.");
        }
        setModalOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || "Có lỗi xảy ra.");
      }
    } catch {
      setFormError("Lỗi kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const targetId = deleteId;
    setDeleting(true);

    // Optimistic UI: Remove from list in 0ms!
    setStudents((prev) => prev.filter((s) => s.id !== targetId));
    setDeleteId(null);
    setDeleting(false);
    showToast("Đã xóa học sinh.");

    // Sync in background
    try {
      const res = await fetch(`/api/students/${targetId}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("Có lỗi khi xóa trên máy chủ.", "error");
        fetchStudents();
      }
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    }
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

  const sortedStudents = React.useMemo(() => {
    if (sortOrder === "default") return students;
    return [...students].sort((a, b) => compareVietnameseNames(a.hoTen, b.hoTen, sortOrder));
  }, [students, sortOrder]);

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
          {filterLop !== "ALL" && (
            <button
              className="btn btn-sm"
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                border: "1px solid #fca5a5",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
              onClick={() => {
                setClassToDelete(filterLop);
                setDeleteClassModalOpen(true);
              }}
              title={`Xóa bỏ hoàn toàn lớp ${filterLop} và dữ liệu liên quan`}
            >
              <Trash2 size={14} color="#dc2626" />
              Xóa lớp {filterLop}
            </button>
          )}
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

      {/* Search + Filter + Sort */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Tìm tên học sinh..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}
            >
              <X size={13} />
            </button>
          )}
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

        {/* Nút Sort Tên A-Z / Z-A */}
        <button
          type="button"
          className={`btn btn-sm ${sortOrder !== "default" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => {
            if (sortOrder === "default") handleSetSortOrder("asc");
            else if (sortOrder === "asc") handleSetSortOrder("desc");
            else handleSetSortOrder("default");
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
          title="Bấm để đổi sắp xếp tên: A-Z -> Z-A -> Mặc định"
        >
          {sortOrder === "asc" ? (
            <>
              <ArrowUpAZ size={15} /> Tên: A → Z
            </>
          ) : sortOrder === "desc" ? (
            <>
              <ArrowDownAZ size={15} /> Tên: Z → A
            </>
          ) : (
            <>
              <ArrowUpDown size={14} /> Sắp xếp tên
            </>
          )}
        </button>

        {(search || filterTo > 0 || filterLop !== "ALL" || sortOrder !== "default") && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setSearch(""); setFilterTo(0); setFilterLop("ALL"); handleSetSortOrder("default"); }}
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
        ) : sortedStudents.length === 0 ? (
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
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => {
                      if (sortOrder === "default") handleSetSortOrder("asc");
                      else if (sortOrder === "asc") handleSetSortOrder("desc");
                      else handleSetSortOrder("default");
                    }}
                    title="Bấm để đổi chiều sắp xếp tên: A-Z -> Z-A -> Mặc định"
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span>Họ và tên</span>
                      {sortOrder === "asc" ? (
                        <span className="badge badge-primary" style={{ padding: "1px 6px", fontSize: "0.7rem" }}>
                          <ArrowUpAZ size={12} /> A-Z
                        </span>
                      ) : sortOrder === "desc" ? (
                        <span className="badge badge-primary" style={{ padding: "1px 6px", fontSize: "0.7rem" }}>
                          <ArrowDownAZ size={12} /> Z-A
                        </span>
                      ) : (
                        <ArrowUpDown size={12} style={{ color: "var(--text-muted)" }} />
                      )}
                    </div>
                  </th>
                  <th>Tên gọi</th>
                  <th>Lớp</th>
                  <th>Tổ</th>
                  <th>Giới tính</th>
                  <th>Ghi chú</th>
                  <th style={{ width: 90 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {(page - 1) * PER_PAGE + idx + 1}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: s.avatar ? "transparent" : (s.gioiTinh === "Nữ" ? "#fce7f3" : "#e0f2fe"),
                            color: s.gioiTinh === "Nữ" ? "#db2777" : "#0284c7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.75rem",
                            overflow: "hidden",
                            flexShrink: 0,
                            border: "1px solid var(--border)",
                          }}
                        >
                          {s.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.avatar} alt={s.hoTen} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            s.hoTen.substring(0, 1)
                          )}
                        </div>
                        <span>{s.hoTen}</span>
                      </div>
                    </td>
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

      {/* ====== DELETE CLASS CONFIRM MODAL ====== */}
      {deleteClassModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)" }}
            onClick={() => !deletingClass && setDeleteClassModalOpen(false)}
          />
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "white", borderRadius: 18, boxShadow: "var(--shadow-xl)", padding: "28px 24px",
            width: "100%", maxWidth: 440, animation: "fadeIn 0.2s ease", border: "1px solid var(--border)"
          }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{
                width: 56, height: 56, background: "#fee2e2", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px"
              }}>
                <Trash2 size={28} color="#dc2626" />
              </div>
              <h3 style={{ fontSize: "1.25rem", color: "#1e293b", marginBottom: 6 }}>
                Xóa bỏ hoàn toàn Lớp <span style={{ color: "#dc2626" }}>{classToDelete}</span>?
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.5, margin: 0 }}>
                Bạn đang yêu cầu ngừng quản lý và gỡ bỏ toàn bộ lớp này khỏi hệ thống.
              </p>
            </div>

            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12,
              padding: "14px 16px", marginBottom: 22, fontSize: "0.825rem", color: "#991b1b"
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={16} color="#dc2626" /> Toàn bộ dữ liệu sau sẽ bị xóa vĩnh viễn:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Danh sách toàn bộ học sinh lớp <strong>{classToDelete}</strong></li>
                <li>Toàn bộ lịch sử <strong>Điểm danh & Chuyên cần</strong></li>
                <li>Hồ sơ thu & đóng <strong>Quỹ lớp</strong></li>
                <li>Lịch <strong>Trực nhật</strong> & Phân công sự kiện</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setDeleteClassModalOpen(false)}
                disabled={deletingClass}
              >
                Hủy bỏ
              </button>
              <button
                className="btn"
                style={{ flex: 1.4, background: "#dc2626", color: "white", borderColor: "#dc2626", fontWeight: 700 }}
                onClick={handleDeleteClass}
                disabled={deletingClass}
              >
                {deletingClass ? "Đang xóa dữ liệu..." : `Xác nhận xóa Lớp ${classToDelete}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
