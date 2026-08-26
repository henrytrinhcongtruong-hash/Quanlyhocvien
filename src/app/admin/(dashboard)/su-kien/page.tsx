"use client";
import React, { useState, useEffect } from "react";
import {
  Star, Plus, Edit2, Trash2, Calendar, CheckCircle, AlertCircle,
  Info, Clock, Users, Save, X, Search,
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

export default function AdminSuKienPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTrangThai, setFilterTrangThai] = useState("ALL");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState({
    tenSuKien: "",
    hangMuc: "Hoạt động trường",
    chiTiet: "",
    deadline: "",
    ketHoachTrienKhai: "",
    trangThai: "Sắp diễn ra",
    leadStudentId: "",
  });

  const [saving, setSaving] = useState(false);
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
      showToast("Lỗi tải sự kiện", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showToast("Đã tạo sự kiện mới");
      setModalOpen(false);
      loadData();
    } else {
      showToast("Lỗi khi lưu sự kiện", "error");
    }
    setSaving(false);
  }

  const filteredEvents = events.filter(e => {
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
            position: "fixed", top: 20, right: 20, zIndex: 1000,
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
          <h1 style={{ fontSize: "1.4rem", marginBottom: 4 }}>Quản lý sự kiện & công việc</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Kế hoạch triển khai, phân công phụ trách và theo dõi tiến độ
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setEditing(null);
            setForm({
              tenSuKien: "",
              hangMuc: "Hoạt động trường",
              chiTiet: "",
              deadline: "",
              ketHoachTrienKhai: "",
              trangThai: "Sắp diễn ra",
              leadStudentId: "",
            });
            setModalOpen(true);
          }}
        >
          <Plus size={14} /> Thêm sự kiện
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
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
          {TRANG_THAI_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Event Cards */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 90, borderRadius: 10 }} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <Star size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
          <p>Chưa có sự kiện nào</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredEvents.map(evt => {
            const leads = evt.members.filter(m => m.vaiTro === "Lead");
            return (
              <div key={evt.id} className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span className={`badge ${
                        evt.trangThai === "Đã xong" ? "badge-success" :
                        evt.trangThai === "Đang diễn ra" ? "badge-warning" : "badge-info"
                      }`}>
                        {evt.trangThai}
                      </span>
                      {evt.hangMuc && (
                        <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                          {evt.hangMuc}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: 6 }}>{evt.tenSuKien}</h3>
                    {evt.chiTiet && (
                      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 8 }}>
                        {evt.chiTiet}
                      </p>
                    )}
                    {leads.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 600 }}>
                        <Users size={14} color="var(--primary)" />
                        Phụ trách: {leads.map(l => l.student.hoTen).join(", ")}
                      </div>
                    )}
                  </div>

                  {evt.deadline && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                        Hạn chót
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {formatDate(evt.deadline)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={() => setModalOpen(false)} />
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "white", borderRadius: 14, boxShadow: "var(--shadow-lg)", padding: "28px",
            width: "100%", maxWidth: 480, animation: "fadeIn 0.2s ease",
          }}>
            <h3 style={{ marginBottom: 16 }}>Thêm sự kiện mới</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Tên sự kiện / công việc *</label>
                <input
                  className="input"
                  value={form.tenSuKien}
                  onChange={(e) => setForm(f => ({ ...f, tenSuKien: e.target.value }))}
                  placeholder="Ví dụ: Hội diễn văn nghệ 20/11"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Hạng mục</label>
                  <select
                    className="select"
                    value={form.hangMuc}
                    onChange={(e) => setForm(f => ({ ...f, hangMuc: e.target.value }))}
                  >
                    {HANG_MUC_OPTIONS.map(hm => <option key={hm} value={hm}>{hm}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Hạn chót (Deadline)</label>
                  <input
                    type="date"
                    className="input"
                    value={form.deadline}
                    onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label">Học sinh phụ trách chính (Lead)</label>
                <select
                  className="select"
                  value={form.leadStudentId}
                  onChange={(e) => setForm(f => ({ ...f, leadStudentId: e.target.value }))}
                >
                  <option value="">-- Chọn học sinh phụ trách --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.hoTen} (Tổ {s.to})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Chi tiết nội dung</label>
                <textarea
                  className="input"
                  style={{ minHeight: 70, resize: "vertical" }}
                  value={form.chiTiet}
                  onChange={(e) => setForm(f => ({ ...f, chiTiet: e.target.value }))}
                  placeholder="Mô tả công việc chi tiết..."
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : <><Save size={14} /> Lưu sự kiện</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
