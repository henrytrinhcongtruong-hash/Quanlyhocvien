"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, Plus, Search, Filter, Edit2, Trash2, Upload,
  Download, ChevronLeft, ChevronRight, X, Save, AlertCircle,
  User, CheckCircle, School, ArrowUpDown, ArrowUpAZ, ArrowDownAZ,
  FileSpreadsheet, FileUp, Lock,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { compareVietnameseNames } from "@/lib/utils";
import { compressImage } from "@/lib/imageUtils";
import { useUserPermissions } from "@/hooks/useUserPermissions";

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
  avatar?: string | null;
}

const EMPTY_FORM: FormData = {
  hoTen: "", tenGoi: "", ngaySinh: "", gioiTinh: "Nam", to: "1", lop: "12T2", ghiChu: "", avatar: null,
};

// ==================
// MAIN PAGE
// ==================
export default function HocSinhPage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const { data: session } = useSession();
  const { canEdit, loading: permsLoading } = useUserPermissions();
  const canManageStudents = canEdit("hoc_sinh");

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number | "ALL">("ALL");
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

  // File upload & Import Modal
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTargetClassMode, setImportTargetClassMode] = useState<"auto" | "existing" | "new">("auto");
  const [importSelectedClass, setImportSelectedClass] = useState("");
  const [importNewClassName, setImportNewClassName] = useState("");
  const [importError, setImportError] = useState("");

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
  // FETCH — students of active class
  // ==================
  const fetchStudents = async () => {
    setLoading(true);
    const activeClass = !isSuperAdmin ? assignedLop : filterLop;
    const params = new URLSearchParams();
    if (activeClass && activeClass !== "ALL") params.set("lop", activeClass);

    try {
      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();
      setAllStudents(data.data || []);
    } catch {
      setAllStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, filterTo, filterLop, perPage]);

  useEffect(() => {
    fetchStudents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLop, assignedLop, isSuperAdmin]);

  // ==================
  // MODAL
  // ==================
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const base64 = await compressImage(file, 280, 320, 0.8);
      setForm((f) => ({ ...f, avatar: base64 }));
      showToast("Đã tải và nén ảnh thành công!");
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm((f) => ({ ...f, avatar: ev.target?.result as string }));
        showToast("Đã tải ảnh lên thành công!");
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      lop: filterLop !== "ALL" ? filterLop : (classList[0] || "12T2"),
      avatar: null,
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
      avatar: s.avatar || null,
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
      avatar: form.avatar || null,
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
          setAllStudents((prev) => prev.map((s) => (s.id === editing.id ? savedStudent : s)));
          showToast("Đã cập nhật học sinh.");
        } else {
          setAllStudents((prev) => [savedStudent, ...prev]);
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
    setAllStudents((prev) => prev.filter((s) => s.id !== targetId));
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

  function openImportModal() {
    setImportFile(null);
    setImportError("");
    const defaultMode = filterLop !== "ALL" ? "existing" : "auto";
    setImportTargetClassMode(defaultMode);
    setImportSelectedClass(filterLop !== "ALL" ? filterLop : (classList[0] || "12T2"));
    setImportNewClassName("");
    setImportModalOpen(true);
  }

  async function handleExecuteImport() {
    if (!importFile) {
      setImportError("Vui lòng chọn file Excel để import.");
      return;
    }
    setImporting(true);
    setImportError("");

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      let targetLop = "";
      if (importTargetClassMode === "new") {
        targetLop = importNewClassName.trim().toUpperCase();
        if (!targetLop) {
          setImportError("Vui lòng nhập tên lớp mới (ví dụ: 10A1, 11B2...).");
          setImporting(false);
          return;
        }
      } else if (importTargetClassMode === "existing") {
        targetLop = importSelectedClass;
      }

      if (targetLop) {
        formData.append("lop", targetLop);
      }

      const res = await fetch("/api/students/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success !== false) {
        showToast(data.message || `Đã import ${data.count} học sinh thành công!`);
        setImportModalOpen(false);

        // Refresh class list & switch to newly imported class
        const cRes = await fetch("/api/classes");
        const cData = await cRes.json();
        if (cData.data && cData.data.length > 0) {
          setClassList(cData.data);
        }

        const finalClass = data.lop || targetLop;
        if (finalClass && finalClass !== "ALL") {
          setFilterLop(finalClass);
        } else {
          fetchStudents();
        }
      } else {
        setImportError(data.error || "Import thất bại. Vui lòng kiểm tra lại file Excel.");
      }
    } catch {
      setImportError("Lỗi kết nối máy chủ khi import.");
    } finally {
      setImporting(false);
    }
  }

  function handleExport() {
    const activeClass = !isSuperAdmin ? assignedLop : filterLop;
    const param = activeClass && activeClass !== "ALL" ? `?lop=${encodeURIComponent(activeClass)}` : "";
    window.open(`/api/students/export${param}`, "_blank");
  }

  const byTo = [1, 2, 3, 4].map((t) => allStudents.filter((s) => s.to === t).length);

  const filteredStudents = React.useMemo(() => {
    return allStudents.filter((s) => {
      if (filterTo > 0 && s.to !== filterTo) return false;
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchName = s.hoTen.toLowerCase().includes(query);
        const matchNick = s.tenGoi?.toLowerCase().includes(query);
        if (!matchName && !matchNick) return false;
      }
      return true;
    });
  }, [allStudents, filterTo, search]);

  const sortedStudents = React.useMemo(() => {
    if (sortOrder === "default") return filteredStudents;
    return [...filteredStudents].sort((a, b) => compareVietnameseNames(a.hoTen, b.hoTen, sortOrder));
  }, [filteredStudents, sortOrder]);

  const totalPages = perPage === "ALL" ? 1 : Math.max(1, Math.ceil(sortedStudents.length / perPage));

  const pagedStudents = React.useMemo(() => {
    if (perPage === "ALL" || sortedStudents.length <= perPage) return sortedStudents;
    const start = (page - 1) * perPage;
    return sortedStudents.slice(start, start + perPage);
  }, [sortedStudents, page, perPage]);

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

      {/* Read-only banner */}
      {!canManageStudents && !permsLoading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 12,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            marginBottom: 16,
            color: "#1d4ed8",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          <Lock size={15} color="#2563eb" style={{ flexShrink: 0 }} />
          <span>
            Chế độ chỉ xem: Bạn đang xem danh sách hồ sơ học sinh. Quyền thêm mới, chỉnh sửa hoặc import thuộc về Giáo Viên Chủ Nhiệm hoặc Admin.
          </span>
        </div>
      )}

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: 4 }}>
            Quản lý học sinh {filterLop !== "ALL" ? `— Lớp ${filterLop}` : "Toàn trường"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            {filteredStudents.length === allStudents.length
              ? `${allStudents.length} học sinh • 4 tổ`
              : `${filteredStudents.length} / ${allStudents.length} học sinh • 4 tổ`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {canManageStudents && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={openImportModal}
              disabled={importing}
              id="btn-import-excel"
            >
              <Upload size={14} />
              <span className="hide-on-mobile">Import Excel</span>
              <span className="hide-on-desktop">Import</span>
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={14} />
            Export
          </button>
          {canManageStudents && (
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <Plus size={14} />
              <span className="hide-on-mobile">Thêm học sinh</span>
              <span className="hide-on-desktop">Thêm HS</span>
            </button>
          )}
          {canManageStudents && filterLop !== "ALL" && (
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
              <span className="hide-on-mobile">Xóa lớp {filterLop}</span>
              <span className="hide-on-desktop">Xóa</span>
            </button>
          )}
        </div>
      </div>

      {/* Tổng hợp theo tổ - Horizontal scrollable chips on mobile */}
      <div className="mobile-chips-bar" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[1, 2, 3, 4].map((t, i) => (
          <div
            key={t}
            className="card"
            style={{
              padding: "7px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              cursor: "pointer",
              border: filterTo === t ? "2px solid var(--primary)" : undefined,
              background: filterTo === t ? "var(--primary-light)" : "#ffffff",
            }}
            onClick={() => setFilterTo(filterTo === t ? 0 : t)}
          >
            <Users size={13} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>Tổ {t}:</span>
            <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "0.95rem" }}>{byTo[i]}</span>
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

      {/* Table & Mobile Cards */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 8 }} />
            ))}
          </div>
        ) : sortedStudents.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
            <Users size={40} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>Không tìm thấy học sinh nào</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hide-on-mobile" style={{ overflowX: "auto" }}>
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
                  {pagedStudents.map((s, idx) => {
                    const rowNum = perPage === "ALL" ? idx + 1 : (page - 1) * perPage + idx + 1;
                    return (
                      <tr key={s.id}>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {rowNum}
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
                        {canManageStudents ? (
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
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Lock size={11} /> Chỉ xem
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>

            {/* Mobile Cards View (No horizontal scroll needed!) */}
            <div className="hide-on-desktop" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 8px" }}>
              {pagedStudents.map((s, idx) => {
                const rowNum = perPage === "ALL" ? idx + 1 : (page - 1) * perPage + idx + 1;
                return (
                  <div
                    key={s.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "#ffffff",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, width: 22 }}>
                        {rowNum}
                      </div>
                    {/* Avatar */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: s.avatar ? "transparent" : (s.gioiTinh === "Nữ" ? "#fce7f3" : "#e0f2fe"),
                        color: s.gioiTinh === "Nữ" ? "#db2777" : "#0284c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "0.8rem",
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

                    {/* Info */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.hoTen}
                        </span>
                        {s.tenGoi && (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
                            ({s.tenGoi})
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                        <span className="badge badge-info" style={{ fontSize: "0.68rem", padding: "1px 5px" }}>
                          {s.lop}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: "0.68rem", padding: "1px 5px" }}>
                          T{s.to}
                        </span>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: s.gioiTinh === "Nữ" ? "hsl(330,70%,50%)" : "var(--info)" }}>
                          {s.gioiTinh}
                        </span>
                        {s.ghiChu && (
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            • {s.ghiChu}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
                    {canManageStudents ? (
                      <>
                        <button
                          onClick={() => openEdit(s)}
                          style={{
                            background: "var(--primary-light)",
                            border: "1px solid var(--primary-border)",
                            borderRadius: 8,
                            padding: "6px 8px",
                            cursor: "pointer",
                            color: "var(--primary)",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Sửa"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          style={{
                            background: "#fee2e2",
                            border: "1px solid #fca5a5",
                            borderRadius: 8,
                            padding: "6px 8px",
                            cursor: "pointer",
                            color: "#dc2626",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Xóa"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Lock size={10} /> Chỉ xem
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

        {/* Pagination & Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderTop: "1px solid var(--border)",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.85rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
            <span>
              {perPage === "ALL" || totalPages <= 1
                ? `Tổng số: ${sortedStudents.length} học sinh`
                : `Đang xem ${(page - 1) * Number(perPage) + 1}–${Math.min(page * Number(perPage), sortedStudents.length)} / ${sortedStudents.length} học sinh`}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.8rem" }}>Hiển thị:</span>
              <select
                className="select"
                style={{ padding: "3px 8px", fontSize: "0.8rem", height: 28 }}
                value={perPage}
                onChange={(e) => {
                  const val = e.target.value === "ALL" ? "ALL" : Number(e.target.value);
                  setPerPage(val);
                  setPage(1);
                }}
              >
                <option value="ALL">Toàn bộ lớp (1 trang)</option>
                <option value={20}>20 / trang</option>
                <option value={40}>40 / trang</option>
                <option value={60}>60 / trang</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ padding: "4px 10px", fontSize: "0.85rem", fontWeight: 600 }}>
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ====== ADD/EDIT MODAL ====== */}
      {modalOpen && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            overflowY: "auto",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
              padding: "24px 26px",
              width: "100%",
              maxWidth: 520,
              maxHeight: "calc(100vh - 40px)",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--border)",
              animation: "slideUp 0.18s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
                {editing ? "Cập nhật thông tin học sinh" : "Thêm học sinh mới"}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4, display: "flex", flexDirection: "column", gap: 14 }}>
              {formError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--danger-light)", border: "1px solid var(--danger-border)", borderRadius: 10, color: "var(--danger)", fontSize: "0.875rem", fontWeight: 600 }}>
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <div>
                <label className="label">Họ và tên *</label>
                <input className="input" value={form.hoTen} onChange={(e) => setForm(f => ({ ...f, hoTen: e.target.value }))} placeholder="Nguyễn Văn A" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Tên gọi / Biệt danh</label>
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

              {/* Avatar Upload */}
              <div>
                <label className="label">Ảnh đại diện học sinh (Chân dung):</label>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div
                    style={{
                      width: 58,
                      height: 66,
                      borderRadius: 12,
                      border: "2px solid var(--border)",
                      background: "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                      position: "relative",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                    }}
                  >
                    {form.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.avatar} alt="Avatar Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <User size={26} color="#94a3b8" />
                    )}
                    {uploadingAvatar && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.55)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                        }}
                      >
                        Nén...
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <label
                        className="btn btn-secondary btn-sm"
                        style={{
                          cursor: uploadingAvatar ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          margin: 0,
                        }}
                      >
                        <Upload size={14} /> {uploadingAvatar ? "Đang xử lý..." : "Chọn ảnh từ máy..."}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          style={{ display: "none" }}
                          disabled={uploadingAvatar}
                        />
                      </label>

                      {form.avatar && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: "var(--danger)", borderColor: "var(--danger-border)", fontSize: "0.78rem" }}
                          onClick={() => setForm((f) => ({ ...f, avatar: null }))}
                        >
                          <Trash2 size={13} /> Xóa ảnh
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
                      Hệ thống tự nén ảnh tối ưu tốc độ và độ sắc nét khi in A4.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : (<><Save size={15} /> Lưu học sinh</>)}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ====== DELETE CONFIRM ====== */}
      {deleteId !== null && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            overflowY: "auto",
          }}
          onClick={() => setDeleteId(null)}
        >
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
              padding: "26px 24px",
              width: "100%",
              maxWidth: 400,
              margin: "auto",
              border: "1px solid var(--border)",
              animation: "slideUp 0.18s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ width: 52, height: 52, background: "var(--danger-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Trash2 size={24} color="var(--danger)" />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Xác nhận xóa học sinh?</h3>
              <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: "0.875rem", margin: "6px 0 0" }}>
                Tất cả dữ liệu điểm danh, đóng quỹ liên quan sẽ bị xóa theo.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>Hủy</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete} disabled={deleting}>
                {deleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ====== DELETE CLASS CONFIRM MODAL ====== */}
      {deleteClassModalOpen && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            overflowY: "auto",
          }}
          onClick={() => !deletingClass && setDeleteClassModalOpen(false)}
        >
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
              padding: "26px 24px",
              width: "100%",
              maxWidth: 460,
              maxHeight: "calc(100vh - 40px)",
              margin: "auto",
              border: "1px solid var(--border)",
              animation: "slideUp 0.18s ease-out",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
        </div>,
        document.body
      )}

      {/* ====== IMPORT EXCEL MODAL ====== */}
      {importModalOpen && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            overflowY: "auto",
          }}
          onClick={() => !importing && setImportModalOpen(false)}
        >
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              padding: "28px 26px",
              width: "100%",
              maxWidth: 520,
              maxHeight: "calc(100vh - 40px)",
              margin: "auto",
              border: "1px solid var(--border)",
              animation: "slideUp 0.2s ease-out",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: "rgba(16, 185, 129, 0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981"
                }}>
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text)" }}>
                    Import danh sách học sinh
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.825rem", color: "var(--text-muted)" }}>
                    Hỗ trợ file Excel (.xlsx, .xls) hoặc .csv
                  </p>
                </div>
              </div>
              <button
                onClick={() => !importing && setImportModalOpen(false)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", padding: 4, borderRadius: 6
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Chọn lớp đích */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>
                1. Lớp học áp dụng
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{
                  display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem",
                  padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
                  background: importTargetClassMode === "auto" ? "rgba(59, 130, 246, 0.05)" : "transparent",
                  cursor: "pointer"
                }}>
                  <input
                    type="radio"
                    name="importClassMode"
                    checked={importTargetClassMode === "auto"}
                    onChange={() => setImportTargetClassMode("auto")}
                  />
                  <span><strong>Tự động nhận diện</strong> (từ cột LỚP, tên sheet hoặc tiêu đề file)</span>
                </label>

                <label style={{
                  display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem",
                  padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
                  background: importTargetClassMode === "existing" ? "rgba(59, 130, 246, 0.05)" : "transparent",
                  cursor: "pointer"
                }}>
                  <input
                    type="radio"
                    name="importClassMode"
                    checked={importTargetClassMode === "existing"}
                    onChange={() => setImportTargetClassMode("existing")}
                  />
                  <span>Gán vào lớp có sẵn:</span>
                  {importTargetClassMode === "existing" && (
                    <select
                      className="form-control"
                      style={{ padding: "4px 8px", fontSize: "0.85rem", width: "auto", marginLeft: "auto" }}
                      value={importSelectedClass}
                      onChange={(e) => setImportSelectedClass(e.target.value)}
                    >
                      {classList.map((c) => (
                        <option key={c} value={c}>Lớp {c}</option>
                      ))}
                    </select>
                  )}
                </label>

                <label style={{
                  display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem",
                  padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
                  background: importTargetClassMode === "new" ? "rgba(59, 130, 246, 0.05)" : "transparent",
                  cursor: "pointer"
                }}>
                  <input
                    type="radio"
                    name="importClassMode"
                    checked={importTargetClassMode === "new"}
                    onChange={() => setImportTargetClassMode("new")}
                  />
                  <span>Tạo lớp mới:</span>
                  {importTargetClassMode === "new" && (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: 10A1, 11B2..."
                      style={{ padding: "4px 8px", fontSize: "0.85rem", width: 140, marginLeft: "auto", textTransform: "uppercase" }}
                      value={importNewClassName}
                      onChange={(e) => setImportNewClassName(e.target.value.toUpperCase())}
                      autoFocus
                    />
                  )}
                </label>
              </div>
            </div>

            {/* Step 2: Chọn File */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>
                2. Chọn file Excel danh sách
              </label>

              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImportFile(f);
                    setImportError("");
                  }
                }}
              />

              {!importFile ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) {
                      setImportFile(f);
                      setImportError("");
                    }
                  }}
                  style={{
                    border: "2px dashed var(--border)",
                    borderRadius: 14,
                    padding: "24px 16px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "var(--bg-card)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", background: "var(--primary-light)",
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
                    color: "var(--primary)"
                  }}>
                    <FileUp size={22} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 4 }}>
                    Bấm để chọn file hoặc kéo thả vào đây
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Hỗ trợ định dạng .xlsx, .xls, .csv (tối đa 5MB)
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(16, 185, 129, 0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                    <CheckCircle size={20} color="#10b981" />
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{importFile.name}</div>
                      <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                        {(importFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.775rem", padding: "4px 8px" }}
                    onClick={() => {
                      setImportFile(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    Chọn file khác
                  </button>
                </div>
              )}
            </div>

            {/* Note & Template download */}
            <div style={{
              background: "var(--bg-subtle, #f8fafc)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 18,
              fontSize: "0.8rem",
              lineHeight: 1.5,
              color: "var(--text-muted)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>💡 Gợi ý định dạng:</span>
                <a
                  href="/api/students/template"
                  download
                  style={{
                    color: "var(--primary)",
                    textDecoration: "none",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  <Download size={13} /> Tải file mẫu chuẩn (.xlsx)
                </a>
              </div>
              <div>
                Hệ thống tự động tương thích danh sách từ <strong>vnEdu, SMAS</strong>, tự động nhận diện cột Họ tên, ghép Họ và tên nếu tách riêng, và tự động chia đều 4 tổ nếu file chưa có cột Tổ.
              </div>
            </div>

            {/* Error message */}
            {importError && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 18,
                fontSize: "0.825rem",
                color: "#b91c1c",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}>
                <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{importError}</span>
              </div>
            )}

            {/* Footer actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setImportModalOpen(false)}
                disabled={importing}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary"
                onClick={handleExecuteImport}
                disabled={importing || !importFile}
                style={{ minWidth: 140, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                {importing ? "Đang import..." : "Bắt đầu Import"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
