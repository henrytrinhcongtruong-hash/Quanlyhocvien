"use client";
import React, { useState, useEffect } from "react";
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

interface Student {
  id: number;
  hoTen: string;
  to: number;
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

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showToast(editing ? "Đã cập nhật sự kiện thành công" : "Đã tạo sự kiện mới thành công");
      setModalOpen(false);
      loadData();
    } else {
      showToast("Lỗi khi lưu sự kiện", "error");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/events/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Đã xóa sự kiện thành công");
      loadData();
    } else {
      showToast("Có lỗi khi xóa sự kiện", "error");
    }
    setDeleting(false);
    setDeleteId(null);
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
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
            onClick={() => setModalOpen(false)}
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
              maxWidth: 500,
              maxHeight: "90vh",
              overflowY: "auto",
              animation: "fadeIn 0.2s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Star size={20} color="#eab308" />
                {editing ? "Chỉnh sửa sự kiện" : "Thêm sự kiện mới"}
              </h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                <label className="label">Học sinh phụ trách chính (Lead)</label>
                <select
                  className="select"
                  value={form.leadStudentId}
                  onChange={(e) => setForm((f) => ({ ...f, leadStudentId: e.target.value }))}
                >
                  <option value="">-- Chọn học sinh phụ trách --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.hoTen} (Tổ {s.to})
                    </option>
                  ))}
                </select>
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

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : <><Save size={14} /> {editing ? "Lưu thay đổi" : "Lưu sự kiện"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== DELETE CONFIRM MODAL ====== */}
      {deleteId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }}
            onClick={() => setDeleteId(null)}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              background: "white",
              borderRadius: 14,
              boxShadow: "var(--shadow-lg)",
              padding: "26px",
              width: "100%",
              maxWidth: 380,
              animation: "fadeIn 0.2s ease",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: "var(--danger-light)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Trash2 size={22} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: "1.15rem", marginBottom: 6 }}>Xác nhận xóa sự kiện?</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
                Sự kiện và danh sách phân công liên quan sẽ bị xóa khỏi hệ thống.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>
                Hủy
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete} disabled={deleting}>
                {deleting ? "Đang xóa..." : "Xóa sự kiện"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
