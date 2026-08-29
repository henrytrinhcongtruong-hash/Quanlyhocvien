"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  MapPin,
  User,
  BookOpen,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  FileText,
  Sparkles,
  ChevronRight,
  School,
  LayoutGrid,
  List,
} from "lucide-react";
import { formatDate } from "@/lib/format";

// ==================
// TYPES & CONSTANTS
// ==================
interface ExamSchedule {
  id: number;
  monHoc: string;
  tenKyThi: string;
  loaiKyThi: string;
  ngayThi: string;
  gioThi: string;
  thoiLuong: number;
  hinhThuc: string;
  phongThi: string | null;
  giamThi: string | null;
  phamViOnTap: string | null;
  lop: string;
  ghiChu: string | null;
}

interface FormData {
  monHoc: string;
  tenKyThi: string;
  loaiKyThi: string;
  ngayThi: string;
  gioThi: string;
  thoiLuong: string;
  hinhThuc: string;
  phongThi: string;
  giamThi: string;
  phamViOnTap: string;
  lop: string;
  ghiChu: string;
}

const EMPTY_FORM: FormData = {
  monHoc: "Toán Học",
  tenKyThi: "Kiểm tra 1 tiết",
  loaiKyThi: "1 Tiết",
  ngayThi: new Date().toISOString().split("T")[0],
  gioThi: "07:30",
  thoiLuong: "45",
  hinhThuc: "Trắc nghiệm",
  phongThi: "Phòng 201",
  giamThi: "",
  phamViOnTap: "",
  lop: "12T2",
  ghiChu: "",
};

const POPULAR_SUBJECTS = [
  "Toán Học",
  "Ngữ Văn",
  "Tiếng Anh",
  "Vật Lý",
  "Hóa Học",
  "Sinh Học",
  "Lịch Sử",
  "Địa Lý",
  "GDCD",
  "Tin Học",
  "Công Nghệ",
];

const EXAM_TYPES = [
  "Tất cả loại",
  "15 Phút",
  "1 Tiết",
  "Giữa Kỳ",
  "Cuối Kỳ",
  "Khảo sát",
  "Thi Thử",
];

// Color mapping for subjects
const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Toán Học": { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Ngữ Văn": { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
  "Tiếng Anh": { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  "Vật Lý": { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  "Hóa Học": { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  "Sinh Học": { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  "Lịch Sử": { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  "Địa Lý": { bg: "#f8fafc", text: "#334155", border: "#cbd5e1" },
  "Tin Học": { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
};

function getSubjectColor(monHoc: string) {
  return SUBJECT_COLORS[monHoc] || { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
}

function getCountdownBadge(ngayThiStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDate = new Date(ngayThiStr);
  examDate.setHours(0, 0, 0, 0);

  const diffTime = examDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return <span className="badge badge-neutral">Đã thi ({Math.abs(diffDays)} ngày trước)</span>;
  }
  if (diffDays === 0) {
    return <span className="badge badge-danger" style={{ animation: "pulse 1.5s infinite" }}>🔥 HÔM NAY THI</span>;
  }
  if (diffDays === 1) {
    return <span className="badge badge-warning">⚡ Ngày mai thi</span>;
  }
  if (diffDays <= 3) {
    return <span className="badge badge-warning">Còn {diffDays} ngày nữa</span>;
  }
  return <span className="badge badge-info">Còn {diffDays} ngày</span>;
}

// ==================
// MAIN COMPONENT
// ==================
export default function LichThiAdminPage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const { data: session } = useSession();

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";

  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Tất cả loại");
  const [filterMon, setFilterMon] = useState("Tất cả môn");
  const [filterLop, setFilterLop] = useState(() => {
    if (!isSuperAdmin && assignedLop) return assignedLop;
    return urlLop || "ALL";
  });
  const [classList, setClassList] = useState<string[]>(["11AT3", "12T2"]);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExamSchedule | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Sync active class
  useEffect(() => {
    if (!isSuperAdmin && assignedLop) {
      setFilterLop(assignedLop);
      return;
    }
    if (urlLop) {
      setFilterLop(urlLop);
    }
  }, [urlLop, isSuperAdmin, assignedLop]);

  // Fetch Exams & Class List in parallel
  const fetchExams = async () => {
    setLoading(true);
    const activeClass = !isSuperAdmin ? assignedLop : filterLop;
    const params = new URLSearchParams();
    if (activeClass && activeClass !== "ALL") params.set("lop", activeClass);
    if (filterType !== "Tất cả loại") params.set("type", filterType);
    if (filterMon !== "Tất cả môn") params.set("mon", filterMon);

    try {
      const [res, classRes] = await Promise.all([
        fetch(`/api/exams?${params}`),
        fetch("/api/classes"),
      ]);
      const [data, classData] = await Promise.all([res.json(), classRes.json()]);
      setExams(data.data || []);
      if (classData.data && classData.data.length > 0) setClassList(classData.data);
    } catch {
      showToast("Lỗi kết nối khi tải lịch thi", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLop, filterType, filterMon]);

  // Modal actions
  function openAdd() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      lop: filterLop !== "ALL" ? filterLop : (classList[0] || "12T2"),
      ngayThi: new Date().toISOString().split("T")[0],
    });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item: ExamSchedule) {
    setEditing(item);
    setForm({
      monHoc: item.monHoc,
      tenKyThi: item.tenKyThi,
      loaiKyThi: item.loaiKyThi,
      ngayThi: new Date(item.ngayThi).toISOString().split("T")[0],
      gioThi: item.gioThi,
      thoiLuong: String(item.thoiLuong),
      hinhThuc: item.hinhThuc,
      phongThi: item.phongThi || "",
      giamThi: item.giamThi || "",
      phamViOnTap: item.phamViOnTap || "",
      lop: item.lop,
      ghiChu: item.ghiChu || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.monHoc.trim()) {
      setFormError("Vui lòng chọn hoặc nhập tên môn học.");
      return;
    }
    if (!form.tenKyThi.trim()) {
      setFormError("Vui lòng nhập tên bài kiểm tra / kỳ thi.");
      return;
    }
    if (!form.ngayThi) {
      setFormError("Vui lòng chọn ngày thi.");
      return;
    }

    setSaving(true);
    setFormError("");

    const body = {
      monHoc: form.monHoc.trim(),
      tenKyThi: form.tenKyThi.trim(),
      loaiKyThi: form.loaiKyThi,
      ngayThi: form.ngayThi,
      gioThi: form.gioThi.trim() || "07:30",
      thoiLuong: Number(form.thoiLuong) || 45,
      hinhThuc: form.hinhThuc,
      phongThi: form.phongThi.trim() || null,
      giamThi: form.giamThi.trim() || null,
      phamViOnTap: form.phamViOnTap.trim() || null,
      lop: form.lop?.trim() || "12T2",
      ghiChu: form.ghiChu.trim() || null,
    };

    const url = editing ? `/api/exams/${editing.id}` : "/api/exams";
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const savedExam: ExamSchedule = await res.json();
        if (editing) {
          setExams((prev) => prev.map((item) => (item.id === editing.id ? savedExam : item)));
          showToast("Đã cập nhật lịch thi.");
        } else {
          setExams((prev) => [savedExam, ...prev]);
          showToast("Đã thêm lịch thi mới.");
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
    setExams((prev) => prev.filter((item) => item.id !== targetId));
    setDeleteId(null);
    setDeleting(false);
    showToast("Đã xóa lịch thi.");

    // Sync in background
    try {
      const res = await fetch(`/api/exams/${targetId}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("Có lỗi khi xóa trên máy chủ.", "error");
        fetchExams();
      }
    } catch {
      showToast("Lỗi kết nối máy chủ.", "error");
    }
  }

  // Filtered by search
  const filteredExams = exams.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.monHoc.toLowerCase().includes(q) ||
      e.tenKyThi.toLowerCase().includes(q) ||
      (e.phongThi && e.phongThi.toLowerCase().includes(q)) ||
      (e.giamThi && e.giamThi.toLowerCase().includes(q)) ||
      (e.phamViOnTap && e.phamViOnTap.toLowerCase().includes(q))
    );
  });

  // Summary Metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingExams = exams.filter((e) => new Date(e.ngayThi) >= today);
  const shortTests = exams.filter((e) => e.loaiKyThi === "15 Phút" || e.loaiKyThi === "1 Tiết");
  const majorExams = exams.filter((e) => e.loaiKyThi === "Giữa Kỳ" || e.loaiKyThi === "Cuối Kỳ");

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

      {/* Page Header */}
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
            <GraduationCap size={26} color="var(--primary)" />
            Quản lý Lịch thi & Kiểm tra {filterLop !== "ALL" ? `— Lớp ${filterLop}` : "Toàn trường"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Lên kế hoạch kiểm tra 15p, 1 tiết, thi giữa kỳ & học kỳ cho học sinh
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "var(--bg-muted)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
            <button
              onClick={() => setViewMode("cards")}
              style={{
                background: viewMode === "cards" ? "white" : "transparent",
                border: "none",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontWeight: 600,
                fontSize: "0.8rem",
                color: viewMode === "cards" ? "var(--primary)" : "var(--text-muted)",
                boxShadow: viewMode === "cards" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <LayoutGrid size={14} /> Thẻ
            </button>
            <button
              onClick={() => setViewMode("table")}
              style={{
                background: viewMode === "table" ? "white" : "transparent",
                border: "none",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontWeight: 600,
                fontSize: "0.8rem",
                color: viewMode === "table" ? "var(--primary)" : "var(--text-muted)",
                boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <List size={14} /> Bảng
            </button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={14} />
            Thêm lịch thi mới
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="card" style={{ padding: "16px 18px", borderLeft: "4px solid var(--primary)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Tổng số bài thi & KT
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--primary)", marginTop: 4 }}>
            {exams.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
            Toàn bộ lịch đã lên
          </div>
        </div>

        <div className="card" style={{ padding: "16px 18px", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Sắp diễn ra
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#d97706", marginTop: 4 }}>
            {upcomingExams.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
            Kỳ thi từ hôm nay trở đi
          </div>
        </div>

        <div className="card" style={{ padding: "16px 18px", borderLeft: "4px solid #059669" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Kiểm tra 15p & 1 Tiết
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#059669", marginTop: 4 }}>
            {shortTests.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
            Định kỳ thường xuyên
          </div>
        </div>

        <div className="card" style={{ padding: "16px 18px", borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Giữa Kỳ & Cuối Kỳ
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#7c3aed", marginTop: 4 }}>
            {majorExams.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
            Kỳ thi quan trọng
          </div>
        </div>
      </div>

      {/* Toolbar Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
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
            placeholder="Tìm môn học, kỳ thi, phòng thi, giám thị..."
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
          style={{ flex: "0 0 140px" }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          {EXAM_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          className="select"
          style={{ flex: "0 0 140px" }}
          value={filterMon}
          onChange={(e) => setFilterMon(e.target.value)}
        >
          <option value="Tất cả môn">Tất cả môn học</option>
          {POPULAR_SUBJECTS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <GraduationCap size={44} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.1rem", marginBottom: 6 }}>Chưa có lịch thi nào</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: 16 }}>
            Bấm nút &quot;Thêm lịch thi mới&quot; để thiết lập kế hoạch kiểm tra cho học sinh.
          </p>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={14} /> Thêm lịch thi ngay
          </button>
        </div>
      ) : viewMode === "cards" ? (
        /* CARDS GRID VIEW */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 16 }}>
          {filteredExams.map((item) => {
            const color = getSubjectColor(item.monHoc);
            return (
              <div
                key={item.id}
                className="card card-hover"
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderRadius: 14,
                  border: `1px solid var(--border)`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div>
                  {/* Top Bar: Subject & Badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          background: color.bg,
                          color: color.text,
                          border: `1px solid ${color.border}`,
                          padding: "4px 10px",
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: "0.85rem",
                        }}
                      >
                        {item.monHoc}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                        Lớp {item.lop}
                      </span>
                    </div>
                    {getCountdownBadge(item.ngayThi)}
                  </div>

                  {/* Exam Title */}
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>
                    {item.tenKyThi}
                  </h3>

                  {/* Schedule Details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.825rem", color: "var(--text-secondary)", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Calendar size={14} color="var(--primary)" />
                      <span>
                        <strong>{formatDate(item.ngayThi)}</strong> • Lúc <strong>{item.gioThi}</strong> ({item.thoiLuong} phút)
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <FileText size={14} color="#6366f1" />
                      <span>
                        Hình thức: <strong>{item.hinhThuc}</strong>
                      </span>
                    </div>

                    {item.phongThi && (
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <MapPin size={14} color="#ec4899" />
                        <span>Phòng thi: <strong>{item.phongThi}</strong></span>
                      </div>
                    )}

                    {item.giamThi && (
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <User size={14} color="#059669" />
                        <span>Giám thị: <strong>{item.giamThi}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Scope of Knowledge */}
                  {item.phamViOnTap && (
                    <div
                      style={{
                        background: "var(--bg-muted)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        marginBottom: 10,
                        borderLeft: "3px solid var(--primary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>📖 Phạm vi ôn tập:</strong> {item.phamViOnTap}
                    </div>
                  )}

                  {item.ghiChu && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", marginBottom: 10 }}>
                      ⚠️ Lưu ý: {item.ghiChu}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>
                    <Edit2 size={13} /> Sửa
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 size={13} /> Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Môn học</th>
                  <th>Kỳ thi / Bài KT</th>
                  <th>Lớp</th>
                  <th>Ngày & Giờ</th>
                  <th>Thời lượng</th>
                  <th>Hình thức</th>
                  <th>Phòng thi</th>
                  <th>Giám thị</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((item) => {
                  const color = getSubjectColor(item.monHoc);
                  return (
                    <tr key={item.id}>
                      <td>
                        <span
                          style={{
                            background: color.bg,
                            color: color.text,
                            border: `1px solid ${color.border}`,
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontWeight: 700,
                            fontSize: "0.8rem",
                          }}
                        >
                          {item.monHoc}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.tenKyThi}</td>
                      <td>
                        <span className="badge badge-neutral">Lớp {item.lop}</span>
                      </td>
                      <td>
                        <div>{formatDate(item.ngayThi)}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.gioThi}</div>
                      </td>
                      <td>{item.thoiLuong} phút</td>
                      <td>{item.hinhThuc}</td>
                      <td>{item.phongThi || "—"}</td>
                      <td>{item.giamThi || "—"}</td>
                      <td>{getCountdownBadge(item.ngayThi)}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
              maxWidth: 580,
              maxHeight: "calc(100vh - 40px)",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--border)",
              animation: "slideUp 0.18s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexShrink: 0 }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <GraduationCap size={22} color="var(--primary)" />
                {editing ? "Chỉnh sửa lịch thi" : "Thêm lịch thi & kiểm tra mới"}
              </h2>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4, display: "flex", flexDirection: "column", gap: 14 }}>
              {formError && (
                <div
                  style={{
                    background: "var(--danger-light)",
                    color: "var(--danger)",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <AlertCircle size={15} /> {formError}
                </div>
              )}

              {/* Row 1: Mon hoc & Loai ky thi */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Môn học *</label>
                  <input
                    className="input"
                    list="subjects-list"
                    value={form.monHoc}
                    onChange={(e) => setForm((f) => ({ ...f, monHoc: e.target.value }))}
                    placeholder="Chọn hoặc nhập môn..."
                  />
                  <datalist id="subjects-list">
                    {POPULAR_SUBJECTS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="label">Loại kỳ thi *</label>
                  <select
                    className="select"
                    value={form.loaiKyThi}
                    onChange={(e) => setForm((f) => ({ ...f, loaiKyThi: e.target.value }))}
                  >
                    <option value="15 Phút">Kiểm tra 15 Phút</option>
                    <option value="1 Tiết">Kiểm tra 1 Tiết (45p)</option>
                    <option value="Giữa Kỳ">Thi Giữa Kỳ</option>
                    <option value="Cuối Kỳ">Thi Cuối Kỳ</option>
                    <option value="Khảo sát">Khảo sát năng lực</option>
                    <option value="Thi Thử">Thi thử tốt nghiệp</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Ten ky thi & Lop */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Tên bài thi / Kỳ thi *</label>
                  <input
                    className="input"
                    value={form.tenKyThi}
                    onChange={(e) => setForm((f) => ({ ...f, tenKyThi: e.target.value }))}
                    placeholder="Ví dụ: Kiểm tra 1 tiết — Chương 1 Hàm Số"
                  />
                </div>
                <div>
                  <label className="label">Lớp áp dụng *</label>
                  <select
                    className="select"
                    value={form.lop}
                    onChange={(e) => setForm((f) => ({ ...f, lop: e.target.value }))}
                  >
                    {classList.map((c) => (
                      <option key={c} value={c}>
                        Lớp {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Ngay thi & Gio thi & Thoi luong */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Ngày thi *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.ngayThi}
                    onChange={(e) => setForm((f) => ({ ...f, ngayThi: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Giờ bắt đầu</label>
                  <input
                    type="time"
                    className="input"
                    value={form.gioThi}
                    onChange={(e) => setForm((f) => ({ ...f, gioThi: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Thời lượng (phút)</label>
                  <select
                    className="select"
                    value={form.thoiLuong}
                    onChange={(e) => setForm((f) => ({ ...f, thoiLuong: e.target.value }))}
                  >
                    <option value="15">15 phút</option>
                    <option value="45">45 phút</option>
                    <option value="50">50 phút</option>
                    <option value="60">60 phút</option>
                    <option value="90">90 phút</option>
                    <option value="120">120 phút</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Hinh thuc & Phong thi & Giam thi */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Hình thức thi</label>
                  <select
                    className="select"
                    value={form.hinhThuc}
                    onChange={(e) => setForm((f) => ({ ...f, hinhThuc: e.target.value }))}
                  >
                    <option value="Trắc nghiệm">Trắc nghiệm</option>
                    <option value="Tự luận">Tự luận</option>
                    <option value="Trắc nghiệm + Tự luận">TN + Tự luận</option>
                    <option value="Vấn đáp">Vấn đáp</option>
                    <option value="Thực hành">Thực hành</option>
                  </select>
                </div>
                <div>
                  <label className="label">Phòng thi</label>
                  <input
                    className="input"
                    value={form.phongThi}
                    onChange={(e) => setForm((f) => ({ ...f, phongThi: e.target.value }))}
                    placeholder="Phòng 201"
                  />
                </div>
                <div>
                  <label className="label">Giám thị / Phụ trách</label>
                  <input
                    className="input"
                    value={form.giamThi}
                    onChange={(e) => setForm((f) => ({ ...f, giamThi: e.target.value }))}
                    placeholder="Thầy Huy..."
                  />
                </div>
              </div>

              {/* Row 5: Pham vi on tap */}
              <div>
                <label className="label">Phạm vi kiến thức ôn tập</label>
                <input
                  className="input"
                  value={form.phamViOnTap}
                  onChange={(e) => setForm((f) => ({ ...f, phamViOnTap: e.target.value }))}
                  placeholder="Ví dụ: Chương 1: Đồ thị hàm số, Bài 1 đến 5..."
                />
              </div>

              {/* Row 6: Ghi chu */}
              <div>
                <label className="label">Ghi chú / Dụng cụ cần mang theo</label>
                <input
                  className="input"
                  value={form.ghiChu}
                  onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
                  placeholder="Ví dụ: Máy tính fx-580VNX, bút chì 2B, compa..."
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : <><Save size={15} /> Lưu lịch thi</>}
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
            <div style={{ textAlign: "center", marginBottom: 18 }}>
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
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Xác nhận xóa lịch thi?</h3>
              <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: "0.875rem" }}>
                Lịch kiểm tra này sẽ bị xóa khỏi hệ thống.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>
                Hủy
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete} disabled={deleting}>
                {deleting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
