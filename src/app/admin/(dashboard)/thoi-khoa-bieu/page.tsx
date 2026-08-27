"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  User,
  BookOpen,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Printer,
  Sparkles,
  Layers,
  School,
  Calendar,
  Sun,
  Moon,
} from "lucide-react";

interface TimetableItem {
  id: number;
  thu: number;
  tiet: number;
  buoi: string;
  thoiGian: string | null;
  monHoc: string;
  giaoVien: string | null;
  phongHoc: string | null;
  lop: string;
  hocKy: string;
  ghiChu: string | null;
}

interface PeriodForm {
  id?: number;
  thu: number;
  tiet: number;
  buoi: string;
  thoiGian: string;
  monHoc: string;
  giaoVien: string;
  phongHoc: string;
  lop: string;
  hocKy: string;
  ghiChu: string;
}

const DEFAULT_TIMES: Record<number, string> = {
  1: "07:15 - 08:00",
  2: "08:05 - 08:50",
  3: "09:05 - 09:50",
  4: "09:55 - 10:40",
  5: "10:45 - 11:30",
  6: "13:30 - 14:15",
  7: "14:20 - 15:05",
  8: "15:15 - 16:00",
  9: "16:05 - 16:50",
  10: "16:55 - 17:40",
};

const POPULAR_SUBJECTS = [
  "Chào Cờ",
  "Toán Học",
  "Ngữ Văn",
  "Tiếng Anh",
  "Vật Lý",
  "Hóa Học",
  "Sinh Học",
  "Lịch Sử",
  "Địa Lý",
  "Tin Học",
  "GDCD",
  "Công Nghệ",
  "Thể Dục",
  "HĐ Trải Nghiệm",
  "Sinh Hoạt Lớp",
];

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Chào Cờ": { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" },
  "Sinh Hoạt Lớp": { bg: "#fef3c7", text: "#b45309", border: "#fde68a" },
  "Toán Học": { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Ngữ Văn": { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
  "Tiếng Anh": { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  "Vật Lý": { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  "Hóa Học": { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  "Sinh Học": { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  "Lịch Sử": { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  "Địa Lý": { bg: "#f8fafc", text: "#334155", border: "#cbd5e1" },
  "Tin Học": { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
  "Thể Dục": { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  "GDCD": { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  "Công Nghệ": { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
  "HĐ Trải Nghiệm": { bg: "#fdf4ff", text: "#a21caf", border: "#f5d0fe" },
};

function getSubjectColor(monHoc: string) {
  return SUBJECT_COLORS[monHoc] || { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
}

const DAYS = [
  { thu: 2, label: "Thứ Hai" },
  { thu: 3, label: "Thứ Ba" },
  { thu: 4, label: "Thứ Tư" },
  { thu: 5, label: "Thứ Năm" },
  { thu: 6, label: "Thứ Sáu" },
  { thu: 7, label: "Thứ Bảy" },
];

export default function AdminThoiKhoaBieuPage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const { data: session } = useSession();

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "11AT3";

  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLop, setSelectedLop] = useState(() => {
    if (!isSuperAdmin && assignedLop) return assignedLop;
    return urlLop || "11AT3";
  });
  const [selectedHocKy, setSelectedHocKy] = useState("HK1");
  const [filterBuoi, setFilterBuoi] = useState<"ALL" | "Sáng" | "Chiều">("ALL");
  const [classList, setClassList] = useState<string[]>(["11AT3", "12T2"]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PeriodForm>({
    thu: 2,
    tiet: 1,
    buoi: "Sáng",
    thoiGian: DEFAULT_TIMES[1],
    monHoc: "Toán Học",
    giaoVien: "Thầy Tuấn",
    phongHoc: "Phòng 201",
    lop: "11AT3",
    hocKy: "HK1",
    ghiChu: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Load classes
  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) setClassList(d.data);
      })
      .catch(() => {});
  }, []);

  // Sync selectedLop
  useEffect(() => {
    if (!isSuperAdmin && assignedLop) {
      setSelectedLop(assignedLop);
      return;
    }
    if (urlLop && urlLop !== "ALL") {
      setSelectedLop(urlLop);
    }
  }, [urlLop, isSuperAdmin, assignedLop]);

  // Load Timetable
  const loadTimetable = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?lop=${selectedLop}&hocKy=${selectedHocKy}`);
      const data = await res.json();
      setTimetable(data.data || []);
    } catch {
      showToast("Lỗi tải thời khóa biểu", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLop, selectedHocKy]);

  function openAddPeriod(thu: number, tiet: number) {
    const buoi = tiet <= 5 ? "Sáng" : "Chiều";
    setForm({
      thu,
      tiet,
      buoi,
      thoiGian: DEFAULT_TIMES[tiet] || "07:15 - 08:00",
      monHoc: "Toán Học",
      giaoVien: "",
      phongHoc: "Phòng 201",
      lop: selectedLop,
      hocKy: selectedHocKy,
      ghiChu: "",
    });
    setModalOpen(true);
  }

  function openEditPeriod(item: TimetableItem) {
    setForm({
      id: item.id,
      thu: item.thu,
      tiet: item.tiet,
      buoi: item.buoi,
      thoiGian: item.thoiGian || DEFAULT_TIMES[item.tiet] || "",
      monHoc: item.monHoc,
      giaoVien: item.giaoVien || "",
      phongHoc: item.phongHoc || "",
      lop: item.lop,
      hocKy: item.hocKy,
      ghiChu: item.ghiChu || "",
    });
    setModalOpen(true);
  }

  async function handleSavePeriod() {
    if (!form.monHoc.trim()) {
      showToast("Vui lòng nhập tên môn học", "error");
      return;
    }
    setSaving(true);

    try {
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thu: form.thu,
          tiet: form.tiet,
          buoi: form.buoi,
          thoiGian: form.thoiGian,
          monHoc: form.monHoc.trim(),
          giaoVien: form.giaoVien.trim() || null,
          phongHoc: form.phongHoc.trim() || null,
          lop: selectedLop,
          hocKy: selectedHocKy,
          ghiChu: form.ghiChu.trim() || null,
        }),
      });

      if (res.ok) {
        showToast("Đã lưu tiết học thành công");
        setModalOpen(false);
        loadTimetable();
      } else {
        showToast("Lỗi khi lưu tiết học", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePeriod() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/timetable/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Đã xóa tiết học");
        setDeleteId(null);
        setModalOpen(false);
        loadTimetable();
      } else {
        showToast("Lỗi khi xóa tiết học", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setDeleting(false);
    }
  }

  // Find item by day & period
  function getPeriodItem(thu: number, tiet: number): TimetableItem | undefined {
    return timetable.find((t) => t.thu === thu && t.tiet === tiet);
  }

  // Periods range
  const morningPeriods = [1, 2, 3, 4, 5];
  const afternoonPeriods = [6, 7, 8, 9, 10];

  const displayPeriods =
    filterBuoi === "Sáng"
      ? morningPeriods
      : filterBuoi === "Chiều"
      ? afternoonPeriods
      : [...morningPeriods, ...afternoonPeriods];

  // Stats
  const totalPeriods = timetable.length;
  const morningCount = timetable.filter((t) => t.tiet <= 5).length;
  const afternoonCount = timetable.filter((t) => t.tiet > 5).length;
  const uniqueSubjects = new Set(timetable.map((t) => t.monHoc)).size;

  return (
    <div className="animate-fade-in">
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
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarDays size={26} color="var(--primary)" />
            Thời khóa biểu {selectedLop ? `— Lớp ${selectedLop}` : ""} ({selectedHocKy})
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Quản lý kế hoạch học tập, thời gian biểu và phòng học từng tiết trong tuần
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Printer size={14} /> In Thời khóa biểu
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => openAddPeriod(2, 1)}
          >
            <Plus size={14} /> Thêm tiết học
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="card" style={{ padding: "14px 18px", borderLeft: "4px solid var(--primary)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Tổng số tiết / tuần
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--primary)", marginTop: 2 }}>
            {totalPeriods}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
            {uniqueSubjects} môn học khác nhau
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Tiết buổi Sáng (T1 - T5)
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#d97706", marginTop: 2 }}>
            {morningCount}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
            Chính khóa buổi sáng
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px", borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
            Tiết buổi Chiều (T6 - T10)
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#7c3aed", marginTop: 2 }}>
            {afternoonCount}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
            Tự chọn & Bồi dưỡng
          </div>
        </div>
      </div>

      {/* Toolbar Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Class Select */}
          <select
            className="select"
            style={{ fontWeight: 700, color: "var(--primary)", minWidth: 140 }}
            value={selectedLop}
            onChange={(e) => setSelectedLop(e.target.value)}
          >
            {classList.map((c) => (
              <option key={c} value={c}>
                Lớp {c}
              </option>
            ))}
          </select>

          {/* Semester Select */}
          <select
            className="select"
            style={{ minWidth: 130 }}
            value={selectedHocKy}
            onChange={(e) => setSelectedHocKy(e.target.value)}
          >
            <option value="HK1">Học kỳ I</option>
            <option value="HK2">Học kỳ II</option>
          </select>
        </div>

        {/* Buổi Filter Buttons */}
        <div style={{ display: "flex", background: "var(--bg-muted)", padding: 3, borderRadius: 10, border: "1px solid var(--border)" }}>
          <button
            onClick={() => setFilterBuoi("ALL")}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              background: filterBuoi === "ALL" ? "white" : "transparent",
              color: filterBuoi === "ALL" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer",
              boxShadow: filterBuoi === "ALL" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            Tất cả buổi
          </button>
          <button
            onClick={() => setFilterBuoi("Sáng")}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              background: filterBuoi === "Sáng" ? "white" : "transparent",
              color: filterBuoi === "Sáng" ? "#d97706" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              boxShadow: filterBuoi === "Sáng" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <Sun size={13} /> Buổi Sáng
          </button>
          <button
            onClick={() => setFilterBuoi("Chiều")}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              background: filterBuoi === "Chiều" ? "white" : "transparent",
              color: filterBuoi === "Chiều" ? "#7c3aed" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              boxShadow: filterBuoi === "Chiều" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <Moon size={13} /> Buổi Chiều
          </button>
        </div>
      </div>

      {/* Timetable Weekly Grid */}
      <div className="card" style={{ overflow: "hidden", borderRadius: 16, border: "1px solid var(--border)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid var(--border)" }}>
                <th style={{ width: 100, padding: "14px 12px", textAlign: "center", fontSize: "0.825rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Tiết
                </th>
                {DAYS.map((d) => (
                  <th
                    key={d.thu}
                    style={{
                      padding: "14px 12px",
                      textAlign: "center",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: "#1e293b",
                      borderLeft: "1px solid var(--border)",
                      width: "15%",
                    }}
                  >
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayPeriods.map((tietNum) => {
                const isFirstAfternoon = tietNum === 6;
                return (
                  <React.Fragment key={tietNum}>
                    {isFirstAfternoon && filterBuoi === "ALL" && (
                      <tr style={{ background: "#f1f5f9" }}>
                        <td
                          colSpan={7}
                          style={{
                            padding: "8px 16px",
                            textAlign: "center",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                            color: "#64748b",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                          }}
                        >
                          ☕ NGHỈ TRƯA — BẮT ĐẦU BUỔI CHIỀU
                        </td>
                      </tr>
                    )}
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {/* Tiết Header Column */}
                      <td
                        style={{
                          padding: "12px 10px",
                          textAlign: "center",
                          background: "#fafbfc",
                          borderRight: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--primary)" }}>
                          Tiết {tietNum}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {DEFAULT_TIMES[tietNum] || ""}
                        </div>
                      </td>

                      {/* 6 Days Columns */}
                      {DAYS.map((d) => {
                        const item = getPeriodItem(d.thu, tietNum);
                        if (!item) {
                          return (
                            <td
                              key={d.thu}
                              style={{
                                padding: "8px",
                                borderLeft: "1px solid var(--border)",
                                verticalAlign: "top",
                                background: "#ffffff",
                              }}
                            >
                              <button
                                onClick={() => openAddPeriod(d.thu, tietNum)}
                                style={{
                                  width: "100%",
                                  height: 70,
                                  border: "1px dashed var(--border)",
                                  background: "transparent",
                                  borderRadius: 10,
                                  color: "var(--text-muted)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = "var(--primary)";
                                  e.currentTarget.style.color = "var(--primary)";
                                  e.currentTarget.style.background = "var(--primary-light)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = "var(--border)";
                                  e.currentTarget.style.color = "var(--text-muted)";
                                  e.currentTarget.style.background = "transparent";
                                }}
                              >
                                <Plus size={13} style={{ marginRight: 4 }} /> Thêm
                              </button>
                            </td>
                          );
                        }

                        const color = getSubjectColor(item.monHoc);
                        return (
                          <td
                            key={d.thu}
                            style={{
                              padding: "6px 8px",
                              borderLeft: "1px solid var(--border)",
                              verticalAlign: "top",
                            }}
                          >
                            <div
                              onClick={() => openEditPeriod(item)}
                              style={{
                                background: color.bg,
                                border: `1px solid ${color.border}`,
                                borderRadius: 10,
                                padding: "8px 10px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                position: "relative",
                                minHeight: 70,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.08)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "none";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 800, fontSize: "0.875rem", color: color.text, marginBottom: 2 }}>
                                  {item.monHoc}
                                </div>
                                {item.giaoVien && (
                                  <div style={{ fontSize: "0.73rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                    🧑‍🏫 {item.giaoVien}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                <span>{item.phongHoc || "P.201"}</span>
                                <Edit2 size={11} color={color.text} style={{ opacity: 0.7 }} />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== ADD / EDIT PERIOD MODAL ====== */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setModalOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              background: "white",
              borderRadius: 18,
              boxShadow: "var(--shadow-xl)",
              padding: "26px 30px",
              width: "100%",
              maxWidth: 500,
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <CalendarDays size={20} color="var(--primary)" />
                {form.id ? "Chỉnh sửa tiết học" : "Thêm tiết học mới"}
              </h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Row 1: Thứ & Tiết */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Thứ trong tuần *</label>
                  <select
                    className="select"
                    value={form.thu}
                    onChange={(e) => setForm((f) => ({ ...f, thu: Number(e.target.value) }))}
                  >
                    {DAYS.map((d) => (
                      <option key={d.thu} value={d.thu}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tiết học (1-10) *</label>
                  <select
                    className="select"
                    value={form.tiet}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      setForm((f) => ({
                        ...f,
                        tiet: t,
                        buoi: t <= 5 ? "Sáng" : "Chiều",
                        thoiGian: DEFAULT_TIMES[t] || f.thoiGian,
                      }));
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
                      <option key={t} value={t}>
                        Tiết {t} ({t <= 5 ? "Sáng" : "Chiều"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Môn học */}
              <div>
                <label className="label">Môn học *</label>
                <input
                  className="input"
                  list="subjects-datalist"
                  value={form.monHoc}
                  onChange={(e) => setForm((f) => ({ ...f, monHoc: e.target.value }))}
                  placeholder="Chọn hoặc nhập môn học..."
                />
                <datalist id="subjects-datalist">
                  {POPULAR_SUBJECTS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Row 3: Giáo viên & Phòng học */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Giáo viên phụ trách</label>
                  <input
                    className="input"
                    value={form.giaoVien}
                    onChange={(e) => setForm((f) => ({ ...f, giaoVien: e.target.value }))}
                    placeholder="VD: Thầy Tuấn, Cô Lan..."
                  />
                </div>
                <div>
                  <label className="label">Phòng học</label>
                  <input
                    className="input"
                    value={form.phongHoc}
                    onChange={(e) => setForm((f) => ({ ...f, phongHoc: e.target.value }))}
                    placeholder="VD: Phòng 201..."
                  />
                </div>
              </div>

              {/* Row 4: Khung giờ */}
              <div>
                <label className="label">Khung thời gian</label>
                <input
                  className="input"
                  value={form.thoiGian}
                  onChange={(e) => setForm((f) => ({ ...f, thoiGian: e.target.value }))}
                  placeholder="VD: 07:15 - 08:00"
                />
              </div>

              {/* Row 5: Ghi chú */}
              <div>
                <label className="label">Ghi chú / Dặn dò học sinh</label>
                <input
                  className="input"
                  value={form.ghiChu}
                  onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
                  placeholder="VD: Mang SGK tập 2, làm bài tập về nhà..."
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              {form.id && (
                <button
                  type="button"
                  className="btn"
                  style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fca5a5" }}
                  onClick={() => setDeleteId(form.id!)}
                  disabled={deleting}
                >
                  <Trash2 size={14} /> Xóa
                </button>
              )}
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSavePeriod} disabled={saving}>
                {saving ? "Đang lưu..." : <><Save size={14} /> Lưu tiết học</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== DELETE CONFIRM MODAL ====== */}
      {deleteId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100000 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.5)" }}
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
              boxShadow: "var(--shadow-xl)",
              padding: "24px",
              width: "100%",
              maxWidth: 360,
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  background: "#fee2e2",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                <Trash2 size={22} color="#dc2626" />
              </div>
              <h4 style={{ margin: 0, fontSize: "1.1rem" }}>Xóa tiết học này?</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                Tiết học sẽ được xóa khỏi thời khóa biểu của lớp.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>
                Hủy
              </button>
              <button
                className="btn"
                style={{ flex: 1, background: "#dc2626", color: "white", borderColor: "#dc2626" }}
                onClick={handleDeletePeriod}
                disabled={deleting}
              >
                {deleting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
