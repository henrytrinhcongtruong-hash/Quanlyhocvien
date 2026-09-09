"use client";
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Star,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Users,
  Save,
  X,
  Search,
  CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/format";

function normalizeVN(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

interface Student {
  id: number;
  hoTen: string;
  tenGoi?: string | null;
  to: number;
  lop?: string;
}

interface EventMember {
  id: number;
  studentId: number;
  vaiTro: string;
  student: Student;
}

interface EventItem {
  id: number;
  tenSuKien: string;
  hangMuc: string | null;
  chiTiet: string | null;
  deadline: string | null;
  ketHoachTrienKhai: string | null;
  trangThai: string;
  members: EventMember[];
}

const TRANG_THAI_OPTIONS = ["Sắp diễn ra", "Đang diễn ra", "Đã xong"] as const;
const HANG_MUC_OPTIONS = [
  "Hoạt động trường",
  "Văn nghệ",
  "Học tập - Thi cử",
  "Họp phụ huynh",
  "Tham quan - Dã ngoại",
  "Khác",
];

const EMPTY_FORM = {
  tenSuKien: "",
  hangMuc: "Hoạt động trường",
  chiTiet: "",
  deadline: "",
  ketHoachTrienKhai: "",
  trangThai: "Sắp diễn ra",
  leadStudentId: "",
};

export default function AdminSuKienPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTrangThai, setFilterTrangThai] = useState("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [selectedToFilter, setSelectedToFilter] = useState<number | "ALL">("ALL");

  // Selected student object & filtered list for Modal
  const selectedLeadStudentObj = useMemo(() => {
    if (!form.leadStudentId) return null;
    return students.find((s) => s.id === Number(form.leadStudentId));
  }, [students, form.leadStudentId]);

  const filteredModalStudents = useMemo(() => {
    let list = students;
    if (selectedToFilter !== "ALL") {
      list = list.filter((s) => s.to === selectedToFilter);
    }
    if (!studentSearchQuery.trim()) return list;
    const q = normalizeVN(studentSearchQuery);
    return list.filter((s) => {
      const nameNorm = normalizeVN(s.hoTen);
      const nickNorm = s.tenGoi ? normalizeVN(s.tenGoi) : "";
      const toStr = `to ${s.to}`;
      const lopStr = s.lop ? `lop ${s.lop.toLowerCase()}` : "";
      return nameNorm.includes(q) || nickNorm.includes(q) || toStr.includes(q) || lopStr.includes(q);
    });
  }, [students, studentSearchQuery, selectedToFilter]);

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const [evtRes, stdRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/students"),
      ]);
      const evtData = await evtRes.json();
      const stdData = await stdRes.json();

      setEvents(evtData.data || []);
      setStudents(stdData.data || []);
    } catch {
      showToast("Lỗi tải danh sách sự kiện", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setStudentSearchQuery("");
    setSelectedToFilter("ALL");
    setModalOpen(true);
  }

  function openEdit(evt: EventItem) {
    setEditing(evt);
    const lead = evt.members.find((m) => m.vaiTro === "Lead");
    setForm({
      tenSuKien: evt.tenSuKien,
      hangMuc: evt.hangMuc || "Hoạt động trường",
      chiTiet: evt.chiTiet || "",
      deadline: evt.deadline ? new Date(evt.deadline).toISOString().split("T")[0] : "",
      ketHoachTrienKhai: evt.ketHoachTrienKhai || "",
      trangThai: evt.trangThai || "Sắp diễn ra",
      leadStudentId: lead ? String(lead.studentId) : "",
    });
    setStudentSearchQuery("");
    setSelectedToFilter("ALL");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.tenSuKien.trim()) {
      showToast("Vui lòng nhập tên sự kiện", "error");
      return;
    }
    setSaving(true);

    const membersPayload = form.leadStudentId
      ? [{ studentId: Number(form.leadStudentId), vaiTro: "Lead" }]
      : [];

    const body = {
      tenSuKien: form.tenSuKien.trim(),
      hangMuc: form.hangMuc,
      chiTiet: form.chiTiet.trim() || null,
      deadline: form.deadline || null,
      ketHoachTrienKhai: form.ketHoachTrienKhai.trim() || null,
      trangThai: form.trangThai,
      members: membersPayload,
    };

    const url = editing ? `/api/events/${editing.id}` : "/api/events";
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const savedItem = await res.json();
        if (editing) {
          setEvents((prev) => prev.map((e) => (e.id === editing.id ? savedItem : e)));
          showToast("Đã cập nhật sự kiện thành công");
        } else {
          setEvents((prev) => [savedItem, ...prev]);
          showToast("Đã tạo sự kiện mới thành công");
        }
        setModalOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Lỗi khi lưu sự kiện", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const targetId = deleteId;
    setDeleting(true);

    // Optimistic UI: Remove instantly (0ms)
    setEvents((prev) => prev.filter((e) => e.id !== targetId));
    setDeleteId(null);
    setDeleting(false);
    showToast("Đã xóa sự kiện thành công");

    // Sync in background
    try {
      const res = await fetch(`/api/events/${targetId}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("Lỗi đồng bộ xóa trên máy chủ", "error");
        loadData();
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    }
  }

  const filteredEvents = events.filter((e) => {
    const matchSearch = !search || e.tenSuKien.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterTrangThai === "ALL" || e.trangThai === filterTrangThai;
    return matchSearch && matchStatus;
  });

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

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <Star size={24} color="#eab308" />
            Quản lý sự kiện & công việc
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Kế hoạch triển khai, phân công phụ trách và theo dõi tiến độ
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={14} /> Thêm sự kiện mới
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Tìm tên sự kiện..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: 160 }}
          value={filterTrangThai}
          onChange={(e) => setFilterTrangThai(e.target.value)}
        >
          <option value="ALL">Tất cả trạng thái</option>
          {TRANG_THAI_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Event Cards */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <Star size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
          <p style={{ marginBottom: 14 }}>Chưa có sự kiện nào</p>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={14} /> Thêm sự kiện ngay
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredEvents.map((evt) => {
            const leads = evt.members.filter((m) => m.vaiTro === "Lead");
            return (
              <div
                key={evt.id}
                className="card card-hover"
                style={{
                  padding: "18px 22px",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span
                        className={`badge ${
                          evt.trangThai === "Đã xong"
                            ? "badge-success"
                            : evt.trangThai === "Đang diễn ra"
                            ? "badge-warning"
                            : "badge-info"
                        }`}
                      >
                        {evt.trangThai}
                      </span>
                      {evt.hangMuc && (
                        <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                          {evt.hangMuc}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 6 }}>{evt.tenSuKien}</h3>
                    {evt.chiTiet && (
                      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 8 }}>
                        {evt.chiTiet}
                      </p>
                    )}
                    {leads.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.825rem",
                          color: "var(--text-primary)",
                          fontWeight: 600,
                        }}
                      >
                        <Users size={14} color="var(--primary)" />
                        Phụ trách: {leads.map((l) => l.student.hoTen).join(", ")}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                    {evt.deadline && (
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          Hạn chót
                        </div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {formatDate(evt.deadline)}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons: Sửa & Xóa */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.8rem", padding: "6px 12px" }}
                        onClick={() => openEdit(evt)}
                      >
                        <Edit2 size={13} /> Sửa
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{
                          background: "#fee2e2",
                          color: "#dc2626",
                          border: "1px solid #fca5a5",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: "0.8rem",
                          padding: "6px 12px",
                        }}
                        onClick={() => setDeleteId(evt.id)}
                      >
                        <Trash2 size={13} color="#dc2626" /> Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== ADD / EDIT MODAL ====== */}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexShrink: 0 }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Star size={20} color="#eab308" />
                {editing ? "Chỉnh sửa sự kiện" : "Thêm sự kiện mới"}
              </h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Tên sự kiện / công việc *</label>
                <input
                  className="input"
                  value={form.tenSuKien}
                  onChange={(e) => setForm((f) => ({ ...f, tenSuKien: e.target.value }))}
                  placeholder="Ví dụ: Hội diễn văn nghệ 20/11"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Hạng mục</label>
                  <select
                    className="select"
                    value={form.hangMuc}
                    onChange={(e) => setForm((f) => ({ ...f, hangMuc: e.target.value }))}
                  >
                    {HANG_MUC_OPTIONS.map((hm) => (
                      <option key={hm} value={hm}>
                        {hm}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Trạng thái</label>
                  <select
                    className="select"
                    value={form.trangThai}
                    onChange={(e) => setForm((f) => ({ ...f, trangThai: e.target.value }))}
                  >
                    {TRANG_THAI_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Hạn chót (Deadline)</label>
                <input
                  type="date"
                  className="input"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className="label" style={{ margin: 0 }}>Học sinh phụ trách chính (Lead)</label>
                  {selectedLeadStudentObj ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle size={13} /> {selectedLeadStudentObj.hoTen} (Tổ {selectedLeadStudentObj.to})
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, leadStudentId: "" }))}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--danger)",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: "0 4px",
                        }}
                      >
                        (Bỏ chọn)
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Chưa chọn</span>
                  )}
                </div>

                {/* Ô tìm kiếm tên học sinh */}
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="🔍 Gõ tìm tên học sinh phụ trách (ví dụ: An, Duy, Linh, Tổ 1...)"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    style={{
                      paddingLeft: 36,
                      paddingRight: studentSearchQuery ? 34 : 12,
                      borderRadius: 10,
                      fontSize: "0.88rem",
                      background: "var(--bg-muted)",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchQuery("")}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: 2,
                      }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Bộ lọc nhanh theo Tổ */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  {(["ALL", 1, 2, 3, 4] as const).map((toVal) => (
                    <button
                      key={toVal}
                      type="button"
                      onClick={() => setSelectedToFilter(toVal)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        border: selectedToFilter === toVal ? "1px solid var(--primary)" : "1px solid var(--border)",
                        background: selectedToFilter === toVal ? "var(--primary)" : "var(--bg-muted)",
                        color: selectedToFilter === toVal ? "#ffffff" : "var(--text-secondary)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {toVal === "ALL" ? "Tất cả tổ" : `Tổ ${toVal}`}
                    </button>
                  ))}
                </div>

                {/* Danh sách học sinh cuộn mượt mà */}
                <div
                  style={{
                    maxHeight: 180,
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 6,
                    background: "white",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {filteredModalStudents.length === 0 ? (
                    <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      Không tìm thấy học sinh nào khớp với &ldquo;{studentSearchQuery}&rdquo;
                    </div>
                  ) : (
                    filteredModalStudents.map((s) => {
                      const isSelected = form.leadStudentId === String(s.id);
                      const toColors: Record<number, { bg: string; text: string; border: string }> = {
                        1: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
                        2: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
                        3: { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
                        4: { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
                      };
                      const toStyle = toColors[s.to] || toColors[1];

                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            if (isSelected) {
                              setForm((f) => ({ ...f, leadStudentId: "" }));
                            } else {
                              setForm((f) => ({ ...f, leadStudentId: String(s.id) }));
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: 8,
                            cursor: "pointer",
                            background: isSelected ? "var(--primary-light)" : "transparent",
                            border: isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "var(--bg-muted)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                background: toStyle.bg,
                                color: toStyle.text,
                                border: `1px solid ${toStyle.border}`,
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: "0.72rem",
                                fontWeight: 800,
                              }}
                            >
                              Tổ {s.to}
                            </span>
                            <div>
                              <div style={{ fontWeight: isSelected ? 800 : 600, fontSize: "0.88rem", color: isSelected ? "var(--primary)" : "var(--text-primary)" }}>
                                {s.hoTen}
                              </div>
                              {s.lop && (
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                  Lớp {s.lop} {s.tenGoi ? `• Tên gọi: ${s.tenGoi}` : ""}
                                </div>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: "var(--primary)",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <CheckCircle size={14} />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="label">Chi tiết nội dung</label>
                <textarea
                  className="input"
                  style={{ minHeight: 70, resize: "vertical" }}
                  value={form.chiTiet}
                  onChange={(e) => setForm((f) => ({ ...f, chiTiet: e.target.value }))}
                  placeholder="Mô tả công việc chi tiết..."
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : <><Save size={15} /> {editing ? "Lưu thay đổi" : "Lưu sự kiện"}</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ====== DELETE CONFIRM MODAL ====== */}
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
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  background: "var(--danger-light)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Trash2 size={24} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: "1.15rem", margin: 0 }}>Xác nhận xóa sự kiện?</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "6px 0 0" }}>
                Sự kiện và danh sách phân công liên quan sẽ bị xóa khỏi hệ thống.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>
                Hủy
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete} disabled={deleting}>
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
