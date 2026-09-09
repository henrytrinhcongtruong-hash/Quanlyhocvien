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
  const [activeMobileThu, setActiveMobileThu] = useState<number | "ALL">("ALL");
  const [mobileViewMode, setMobileViewMode] = useState<"cards" | "table">("cards");

  // Determine current day in Vietnam
  const currentJsDay = new Date().getDay();
  const currentThu = currentJsDay === 0 ? 8 : currentJsDay + 1; // 2=Thứ 2, ..., 6=Thứ 6

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

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

  // Load Timetable & Classes in parallel
  const loadTimetable = async () => {
    setLoading(true);
    try {
      const [res, classRes] = await Promise.all([
        fetch(`/api/timetable?lop=${selectedLop}&hocKy=${selectedHocKy}`),
        fetch("/api/classes"),
      ]);
      const [data, classData] = await Promise.all([res.json(), classRes.json()]);
      setTimetable(data.data || []);
      if (classData.data && classData.data.length > 0) setClassList(classData.data);
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
    // Optimistic local update (Instant 0ms UI update!)
    const updatedFormItem: TimetableItem = {
      id: form.id || Date.now(),
      thu: form.thu,
      tiet: form.tiet,
      buoi: "Tối",
      thoiGian: EVENING_TIMES[form.tiet]?.time || null,
      monHoc: form.monHoc,
      giaoVien: form.giaoVien.trim() || null,
      lop: selectedLop,
      hocKy: selectedHocKy,
      ghiChu: form.ghiChu.trim() || null,
    };

    setTimetable((prev) => {
      const idx = prev.findIndex((t) => t.thu === form.thu && t.tiet === form.tiet);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedFormItem };
        return next;
      }
      return [...prev, updatedFormItem];
    });

    setModalOpen(false);
    showToast("Đã lưu thời khóa biểu");

    // Sync in background
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

      if (!res.ok) {
        showToast("Lỗi khi đồng bộ lên máy chủ", "error");
        loadTimetable();
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
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

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleResetDefault}
            disabled={resetting}
            title="Khôi phục thời khóa biểu mẫu theo đúng kế hoạch"
          >
            <RotateCcw size={14} />
            <span className="hide-on-mobile">{resetting ? "Đang nạp..." : "Nạp TKB Chuẩn Mẫu"}</span>
            <span className="hide-on-desktop">{resetting ? "..." : "Mẫu"}</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Printer size={14} />
            <span className="hide-on-mobile">In Thời Khóa Biểu</span>
            <span className="hide-on-desktop">In</span>
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

      {/* Mobile Toolbar: View Mode Switch & Day Filter */}
      <div className="hide-on-desktop" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)" }}>
            🗓️ Thời khóa biểu tuần:
          </div>
          <div style={{ display: "flex", gap: 4, background: "var(--bg-muted)", padding: 3, borderRadius: 10 }}>
            <button
              type="button"
              onClick={() => setMobileViewMode("cards")}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                border: "none",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                background: mobileViewMode === "cards" ? "white" : "transparent",
                color: mobileViewMode === "cards" ? "var(--primary)" : "var(--text-secondary)",
                boxShadow: mobileViewMode === "cards" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              📱 Thẻ cả tuần
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode("table")}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                border: "none",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                background: mobileViewMode === "table" ? "white" : "transparent",
                color: mobileViewMode === "table" ? "var(--primary)" : "var(--text-secondary)",
                boxShadow: mobileViewMode === "table" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              📊 Bảng ma trận
            </button>
          </div>
        </div>

        {/* Mobile Day Pills */}
        <div className="mobile-day-tabs" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className={`mobile-tab-btn ${activeMobileThu === "ALL" ? "active" : ""}`}
            onClick={() => setActiveMobileThu("ALL")}
            style={{ fontWeight: 800 }}
          >
            ✨ Xem cả tuần (T2 → T6)
          </button>
          {DAYS.map((d) => {
            const isToday = d.thu === currentThu;
            return (
              <button
                key={d.thu}
                type="button"
                className={`mobile-tab-btn ${activeMobileThu === d.thu ? "active" : ""}`}
                onClick={() => setActiveMobileThu(d.thu)}
              >
                {d.label} {isToday ? "🌟" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Schedule Cards: Full-Week Stream */}
      {mobileViewMode === "cards" && (
        <div className="hide-on-desktop" style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          {DAYS.filter((d) => activeMobileThu === "ALL" || activeMobileThu === d.thu).map((d, dIdx) => {
            const isToday = d.thu === currentThu;
            const dayDayThemes = [
              { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", badge: "#dbeafe" },
              { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", badge: "#dcfce7" },
              { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff", badge: "#f3e8ff" },
              { bg: "#fffbeb", text: "#b45309", border: "#fde68a", badge: "#fef3c7" },
              { bg: "#fff1f2", text: "#be123c", border: "#fecdd3", badge: "#ffe4e6" },
            ];
            const theme = dayDayThemes[dIdx % dayDayThemes.length];

            return (
              <div
                key={d.thu}
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: isToday ? "2px solid #0284c7" : `1.5px solid ${theme.border}`,
                  boxShadow: isToday ? "0 6px 18px rgba(2, 132, 199, 0.12)" : "0 2px 8px rgba(0,0,0,0.03)",
                  overflow: "hidden",
                }}
              >
                {/* Day Header */}
                <div
                  style={{
                    padding: "10px 14px",
                    background: isToday ? "#e0f2fe" : theme.bg,
                    borderBottom: `1px solid ${theme.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 900, fontSize: "0.95rem", color: isToday ? "#0369a1" : theme.text }}>
                      {d.label}
                    </span>
                    {isToday && (
                      <span
                        style={{
                          background: "#0284c7",
                          color: "white",
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          padding: "1px 6px",
                          borderRadius: 6,
                          textTransform: "uppercase",
                        }}
                      >
                        Hôm nay
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      background: theme.badge,
                      color: theme.text,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 10,
                    }}
                  >
                    5 tiết học buổi tối
                  </span>
                </div>

                {/* Periods List for this Day */}
                <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {periodsList.map((tietNum) => {
                    const isBreakTime = tietNum === 3;
                    const timeInfo = EVENING_TIMES[tietNum];
                    const item = getPeriodItem(d.thu, tietNum);
                    const color = item?.monHoc ? getSubjectColor(item.monHoc) : null;

                    return (
                      <React.Fragment key={tietNum}>
                        {isBreakTime && (
                          <div
                            style={{
                              background: "#fef3c7",
                              border: "1px solid #fde68a",
                              padding: "6px 12px",
                              borderRadius: 8,
                              textAlign: "center",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              color: "#b45309",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                            }}
                          >
                            <Coffee size={13} />
                            <span>GIẢI LAO: 19h20 - 19h35 (15 phút)</span>
                          </div>
                        )}

                        <div
                          onClick={() => openEditCell(d.thu, tietNum)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: color ? color.bg : "#f8fafc",
                            border: color ? `1.5px solid ${color.border}` : "1px dashed var(--border)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 8,
                                background: "rgba(6, 182, 212, 0.15)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <span style={{ fontWeight: 900, fontSize: "0.9rem", color: "#0891b2", lineHeight: 1 }}>
                                T{tietNum}
                              </span>
                              <span style={{ fontSize: "0.58rem", color: "#475569", fontWeight: 700, marginTop: 1 }}>
                                {timeInfo.time.split(" - ")[0]}
                              </span>
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: color ? color.text : "var(--text-muted)" }}>
                                {item?.monHoc || "— Chưa xếp môn —"}
                              </div>
                              {item?.giaoVien && (
                                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 1, fontWeight: 600 }}>
                                  🧑‍🏫 GV: {item.giaoVien}
                                </div>
                              )}
                              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 1 }}>
                                ⏱️ {timeInfo.time}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: "rgba(6, 182, 212, 0.1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#0891b2",
                              flexShrink: 0,
                            }}
                          >
                            <Edit2 size={12} />
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Timetable Table (Pixel Perfect match to User's Excel) */}
      <div className={`card ${mobileViewMode === "cards" ? "hide-on-mobile" : ""}`} style={{ overflow: "hidden", borderRadius: 16, border: "2px solid #06b6d4" }}>
        {mobileViewMode === "table" && (
          <div className="hide-on-desktop" style={{ padding: "8px 14px", background: "#e0f2fe", color: "#0369a1", fontSize: "0.75rem", fontWeight: 700, textAlign: "center" }}>
            👉 Vuốt ngang để xem đủ 5 ngày (Thứ 2 → Thứ 6)
          </div>
        )}
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
              borderRadius: 20,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              padding: "24px 26px",
              width: "100%",
              maxWidth: 540,
              maxHeight: "calc(100vh - 40px)",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--border)",
              animation: "slideUp 0.18s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12, flexShrink: 0 }}>
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
