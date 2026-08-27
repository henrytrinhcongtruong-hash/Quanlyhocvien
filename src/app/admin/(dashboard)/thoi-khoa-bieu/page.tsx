"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  Clock,
  User,
  BookOpen,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Printer,
  Sparkles,
  Moon,
  RotateCcw,
  Coffee,
} from "lucide-react";

interface TimetableItem {
  id: number;
  thu: number;
  tiet: number;
  buoi: string;
  thoiGian: string | null;
  monHoc: string;
  giaoVien: string | null;
  lop: string;
  hocKy: string;
  ghiChu: string | null;
}

interface PeriodForm {
  id?: number;
  thu: number;
  tiet: number;
  monHoc: string;
  giaoVien: string;
  lop: string;
  hocKy: string;
  ghiChu: string;
}

// Khung giờ học Buổi Tối chuẩn Trung tâm GDNN - GDTX TP. Thủ Đức (Bắt đầu 18:00)
const EVENING_TIMES: Record<number, { time: string; duration: string }> = {
  1: { time: "18h00 - 18h40", duration: "40 phút" },
  2: { time: "18h40 - 19h20", duration: "40 phút" },
  3: { time: "19h35 - 20h15", duration: "40 phút" },
  4: { time: "20h15 - 20h55", duration: "40 phút" },
  5: { time: "20h55 - 21h35", duration: "40 phút" },
};

// 9 môn học chính + Chào Cờ / HĐTN
const SUBJECT_OPTIONS = [
  { value: "Chào Cờ", label: "🚩 Chào Cờ (Đầu tuần)" },
  { value: "Toán", label: "📐 Toán" },
  { value: "Ngữ văn", label: "📖 Ngữ văn" },
  { value: "Ngoại ngữ", label: "🌐 Ngoại ngữ" },
  { value: "Hóa học", label: "🧪 Hóa học" },
  { value: "Sinh học", label: "🔬 Sinh học" },
  { value: "Lịch sử", label: "🏛️ Lịch sử" },
  { value: "Địa lý", label: "🌍 Địa lý" },
  { value: "Tin học", label: "💻 Tin học" },
  { value: "HĐTN2", label: "🌟 HĐTN2 (Hoạt động trải nghiệm)" },
  { value: "HĐTN3", label: "🌟 HĐTN3 (Hoạt động trải nghiệm)" },
  { value: "HĐTN", label: "🌟 HĐTN" },
];

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Chào Cờ": { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" },
  "Toán": { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Ngữ văn": { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
  "Ngoại ngữ": { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  "Hóa học": { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  "Sinh học": { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  "Lịch sử": { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  "Địa lý": { bg: "#f8fafc", text: "#334155", border: "#cbd5e1" },
  "Tin học": { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
  "HĐTN": { bg: "#fdf4ff", text: "#a21caf", border: "#f5d0fe" },
  "HĐTN2": { bg: "#fdf4ff", text: "#a21caf", border: "#f5d0fe" },
  "HĐTN3": { bg: "#fdf4ff", text: "#a21caf", border: "#f5d0fe" },
};

function getSubjectColor(monHoc: string) {
  return SUBJECT_COLORS[monHoc] || { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
}

const DAYS = [
  { thu: 2, label: "Thứ 2" },
  { thu: 3, label: "Thứ 3" },
  { thu: 4, label: "Thứ 4" },
  { thu: 5, label: "Thứ 5" },
  { thu: 6, label: "Thứ 6" },
];

export default function AdminThoiKhoaBieuPage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const { data: session } = useSession();

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";

  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLop, setSelectedLop] = useState(() => {
    if (!isSuperAdmin && assignedLop) return assignedLop;
    return urlLop || "12T2";
  });
  const [selectedHocKy, setSelectedHocKy] = useState("HK1");
  const [classList, setClassList] = useState<string[]>(["12T2", "11AT3"]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PeriodForm>({
    thu: 2,
    tiet: 1,
    monHoc: "Chào Cờ",
    giaoVien: "",
    lop: "12T2",
    hocKy: "HK1",
    ghiChu: "",
  });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  function openEditCell(thu: number, tiet: number) {
    const existing = timetable.find((t) => t.thu === thu && t.tiet === tiet);
    setForm({
      id: existing?.id,
      thu,
      tiet,
      monHoc: existing?.monHoc || (thu === 2 && tiet === 1 ? "Chào Cờ" : "Toán"),
      giaoVien: existing?.giaoVien || "",
      lop: selectedLop,
      hocKy: selectedHocKy,
      ghiChu: existing?.ghiChu || "",
    });
    setModalOpen(true);
  }

  async function handleSavePeriod() {
    setSaving(true);
    try {
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thu: form.thu,
          tiet: form.tiet,
          monHoc: form.monHoc,
          giaoVien: form.giaoVien.trim() || null,
          lop: selectedLop,
          hocKy: selectedHocKy,
          ghiChu: form.ghiChu.trim() || null,
        }),
      });

      if (res.ok) {
        showToast("Đã lưu thời khóa biểu");
        setModalOpen(false);
        loadTimetable();
      } else {
        showToast("Lỗi khi lưu", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefault() {
    if (!confirm(`Bạn có chắc muốn đặt lại Thời khóa biểu Buổi Tối chuẩn cho Lớp ${selectedLop}?`)) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/timetable/reset?lop=${selectedLop}&hocKy=${selectedHocKy}`, { method: "POST" });
      if (res.ok) {
        showToast("Đã khôi phục Thời khóa biểu Buổi Tối chuẩn");
        loadTimetable();
      } else {
        showToast("Lỗi khi khôi phục", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setResetting(false);
    }
  }

  function getPeriodItem(thu: number, tiet: number): TimetableItem | undefined {
    return timetable.find((t) => t.thu === thu && t.tiet === tiet);
  }

  const periodsList = [1, 2, 3, 4, 5];

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
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Moon size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
                Thời Khóa Biểu Buổi Tối — Lớp {selectedLop}
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.825rem", margin: 0 }}>
                Khung giờ học Buổi Tối: <strong>18h00 - 21h35</strong> (Thứ 2 đến Thứ 6)
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleResetDefault}
            disabled={resetting}
            title="Khôi phục thời khóa biểu mẫu theo đúng kế hoạch"
          >
            <RotateCcw size={14} /> {resetting ? "Đang nạp..." : "Nạp TKB Chuẩn Mẫu"}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Printer size={14} /> In Thời Khóa Biểu
          </button>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "wrap",
          background: "white",
          padding: "12px 18px",
          borderRadius: 14,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            Chọn Lớp:
          </span>
          <select
            className="select"
            style={{ fontWeight: 800, color: "var(--primary)", minWidth: 120 }}
            value={selectedLop}
            onChange={(e) => setSelectedLop(e.target.value)}
          >
            {classList.map((c) => (
              <option key={c} value={c}>
                Lớp {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            Học kỳ:
          </span>
          <select
            className="select"
            style={{ minWidth: 120 }}
            value={selectedHocKy}
            onChange={(e) => setSelectedHocKy(e.target.value)}
          >
            <option value="HK1">Học kỳ I</option>
            <option value="HK2">Học kỳ II</option>
          </select>
        </div>
      </div>

      {/* Main Timetable Table (Pixel Perfect match to User's Excel) */}
      <div className="card" style={{ overflow: "hidden", borderRadius: 16, border: "2px solid #06b6d4" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#06b6d4", color: "white" }}>
                <th
                  style={{
                    width: 140,
                    padding: "14px 12px",
                    textAlign: "center",
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    borderRight: "1px solid rgba(255,255,255,0.3)",
                  }}
                >
                  Tiết / Giờ học
                </th>
                {DAYS.map((d) => (
                  <th
                    key={d.thu}
                    style={{
                      padding: "14px 12px",
                      textAlign: "center",
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      borderRight: "1px solid rgba(255,255,255,0.3)",
                      width: "17%",
                    }}
                  >
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodsList.map((tietNum) => {
                const isBreakTime = tietNum === 3;
                const timeInfo = EVENING_TIMES[tietNum];

                return (
                  <React.Fragment key={tietNum}>
                    {/* Giờ giải lao sau Tiết 2 */}
                    {isBreakTime && (
                      <tr style={{ background: "#fef3c7", borderBottom: "1px solid #fde68a" }}>
                        <td
                          colSpan={6}
                          style={{
                            padding: "8px 16px",
                            textAlign: "center",
                            fontSize: "0.825rem",
                            fontWeight: 800,
                            color: "#b45309",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <Coffee size={15} />
                            <span>GIẢI LAO: 19h20 - 19h35 (15 phút)</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {/* Tiết & Giờ học Column */}
                      <td
                        style={{
                          padding: "12px 10px",
                          textAlign: "center",
                          background: "#06b6d415",
                          borderRight: "2px solid #06b6d4",
                          verticalAlign: "middle",
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#0891b2" }}>
                          {tietNum}
                        </div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginTop: 2 }}>
                          {timeInfo.time}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                          ({timeInfo.duration})
                        </div>
                      </td>

                      {/* 5 Day Columns (Thứ 2 -> Thứ 6) */}
                      {DAYS.map((d) => {
                        const item = getPeriodItem(d.thu, tietNum);
                        const isMondayFlag = d.thu === 2 && tietNum === 1;

                        if (!item || !item.monHoc) {
                          return (
                            <td
                              key={d.thu}
                              onClick={() => openEditCell(d.thu, tietNum)}
                              style={{
                                padding: "8px",
                                borderRight: "1px solid var(--border)",
                                textAlign: "center",
                                verticalAlign: "middle",
                                cursor: "pointer",
                                background: "#fafafa",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f1f5f9";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#fafafa";
                              }}
                            >
                              <span style={{ color: "#cbd5e1", fontSize: "0.85rem", fontWeight: 600 }}>
                                + Chọn môn
                              </span>
                            </td>
                          );
                        }

                        const color = getSubjectColor(item.monHoc);

                        return (
                          <td
                            key={d.thu}
                            onClick={() => openEditCell(d.thu, tietNum)}
                            style={{
                              padding: "6px 8px",
                              borderRight: "1px solid var(--border)",
                              verticalAlign: "middle",
                              cursor: "pointer",
                            }}
                          >
                            <div
                              style={{
                                background: color.bg,
                                border: `1px solid ${color.border}`,
                                borderRadius: 10,
                                padding: "10px 12px",
                                minHeight: 62,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                textAlign: "center",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.02)";
                                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.06)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "none";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: "0.98rem",
                                  color: color.text,
                                  lineHeight: 1.2,
                                }}
                              >
                                {item.monHoc}
                              </div>

                              {item.giaoVien && (
                                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 3, fontWeight: 600 }}>
                                  🧑‍🏫 {item.giaoVien}
                                </div>
                              )}
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

      {/* ====== QUICK EDIT / SELECT SUBJECT MODAL ====== */}
      {modalOpen && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 999999 }}>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)" }}
            onClick={() => setModalOpen(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              background: "white",
              borderRadius: 20,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: "26px 28px",
              width: "92%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflowY: "auto",
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#0891b2" }}>
                  Xếp Môn: Thứ {form.thu} — Tiết {form.tiet}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.825rem", margin: 0, marginTop: 2 }}>
                  Khung giờ: <strong>{EVENING_TIMES[form.tiet]?.time}</strong> (Buổi Tối • Lớp {selectedLop})
                </p>
              </div>
              <button
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)" }}
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 1-Click Visual Subject Picker Grid */}
              <div>
                <label className="label" style={{ fontWeight: 800, fontSize: "0.875rem", marginBottom: 8, display: "block" }}>
                  ⚡ Chọn nhanh môn học (Bấm 1 chạm):
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                  {SUBJECT_OPTIONS.map((s) => {
                    const isSelected = form.monHoc === s.value;
                    const color = getSubjectColor(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, monHoc: s.value }))}
                        style={{
                          padding: "10px 8px",
                          borderRadius: 10,
                          border: isSelected ? `2px solid ${color.text}` : `1px solid ${color.border}`,
                          background: isSelected ? color.bg : "#ffffff",
                          color: isSelected ? color.text : "#334155",
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          textAlign: "center",
                          boxShadow: isSelected ? `0 0 0 2px ${color.border}` : "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, monHoc: "NONE" }))}
                    style={{
                      padding: "10px 8px",
                      borderRadius: 10,
                      border: form.monHoc === "NONE" ? "2px solid #ef4444" : "1px dashed #cbd5e1",
                      background: form.monHoc === "NONE" ? "#fee2e2" : "#f8fafc",
                      color: form.monHoc === "NONE" ? "#dc2626" : "#64748b",
                      fontWeight: form.monHoc === "NONE" ? 800 : 600,
                      fontSize: "0.825rem",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    ⚪ Trống (Không học)
                  </button>
                </div>
              </div>

              {/* Dropdown Selector */}
              <div>
                <label className="label" style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Hoặc chọn từ danh sách thả xuống:
                </label>
                <select
                  className="select"
                  style={{ fontWeight: 800, fontSize: "0.95rem", padding: "10px 14px", width: "100%" }}
                  value={form.monHoc}
                  onChange={(e) => setForm((f) => ({ ...f, monHoc: e.target.value }))}
                >
                  <option value="NONE">-- Trống (Không có tiết học) --</option>
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Giáo viên */}
              <div>
                <label className="label">Giáo viên phụ trách (tùy chọn)</label>
                <input
                  className="input"
                  value={form.giaoVien}
                  onChange={(e) => setForm((f) => ({ ...f, giaoVien: e.target.value }))}
                  placeholder="VD: Thầy Tuấn, Cô Lan..."
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="label">Ghi chú dặn dò (tùy chọn)</label>
                <input
                  className="input"
                  value={form.ghiChu}
                  onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
                  placeholder="VD: Mang đề cương ôn tập, làm bài..."
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSavePeriod} disabled={saving}>
                {saving ? "Đang lưu..." : <><Save size={14} /> Lưu tiết học</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
