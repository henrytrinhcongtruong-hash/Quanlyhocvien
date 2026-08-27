"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  BookOpen,
  Sparkles,
  Sun,
  Moon,
  Calendar,
  Layers,
  Flame,
  CheckCircle2,
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

function PublicThoiKhoaBieuContent() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");

  const [activeLop, setActiveLop] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return urlLop || localStorage.getItem("admin_selected_class") || "11AT3";
    }
    return urlLop || "11AT3";
  });

  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHocKy, setSelectedHocKy] = useState("HK1");
  const [viewTab, setViewTab] = useState<"week" | "today">("week");
  const [filterBuoi, setFilterBuoi] = useState<"ALL" | "Sáng" | "Chiều">("ALL");

  // Determine current day of week in Vietnam (0 = Sunday, 1 = Monday (Thứ 2), 2 = Tuesday (Thứ 3)...)
  const todayDate = new Date();
  const jsDay = todayDate.getDay(); // 0 is Sunday, 1 is Mon, 2 is Tue...
  const currentThu = jsDay === 0 ? 8 : jsDay + 1; // 2=Thứ 2, 3=Thứ 3... 7=Thứ 7

  // Sync class from URL
  useEffect(() => {
    if (urlLop && urlLop !== "ALL") {
      setActiveLop(urlLop);
    }
  }, [urlLop]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/timetable?lop=${activeLop}&hocKy=${selectedHocKy}`)
      .then((r) => r.json())
      .then((d) => {
        setTimetable(d.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeLop, selectedHocKy]);

  function getPeriodItem(thu: number, tiet: number): TimetableItem | undefined {
    return timetable.find((t) => t.thu === thu && t.tiet === tiet);
  }

  // Today's periods
  const todayPeriods = timetable.filter((t) => t.thu === currentThu).sort((a, b) => a.tiet - b.tiet);

  const morningPeriods = [1, 2, 3, 4, 5];
  const afternoonPeriods = [6, 7, 8, 9, 10];
  const displayPeriods =
    filterBuoi === "Sáng"
      ? morningPeriods
      : filterBuoi === "Chiều"
      ? afternoonPeriods
      : [...morningPeriods, ...afternoonPeriods];

  return (
    <div>
      {/* Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(213,80%,55%) 50%, hsl(160,70%,45%) 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "32px 28px",
          marginBottom: 24,
          color: "white",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(16,90,188,0.2)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 46,
                height: 46,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(6px)",
              }}
            >
              <CalendarDays size={26} color="white" />
            </div>
            <div>
              <h1 style={{ color: "white", fontSize: "1.5rem", margin: 0 }}>
                Thời Khóa Biểu Học Tập
              </h1>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.875rem", margin: 0 }}>
                Lớp {activeLop} • Kế hoạch tiết học, phòng học & giáo viên bộ môn
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Today Alert Card */}
      {currentThu >= 2 && currentThu <= 7 && todayPeriods.length > 0 && (
        <div
          className="card"
          style={{
            padding: "18px 22px",
            marginBottom: 22,
            background: "linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "1px solid #86efac",
            borderRadius: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="badge badge-success" style={{ fontWeight: 800 }}>
                🌟 HÔM NAY: {DAYS.find((d) => d.thu === currentThu)?.label}
              </span>
              <span style={{ fontSize: "0.85rem", color: "#166534", fontWeight: 700 }}>
                {todayPeriods.length} tiết học
              </span>
            </div>
          </div>

          {/* Today's period chips */}
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {todayPeriods.map((p) => {
              const color = getSubjectColor(p.monHoc);
              return (
                <div
                  key={p.id}
                  style={{
                    background: "white",
                    border: `1px solid ${color.border}`,
                    borderRadius: 12,
                    padding: "10px 14px",
                    minWidth: 140,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    Tiết {p.tiet} • {p.thoiGian || DEFAULT_TIMES[p.tiet]}
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: color.text, marginTop: 2 }}>
                    {p.monHoc}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
                    {p.phongHoc || "P.201"} {p.giaoVien ? `• ${p.giaoVien}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbar Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setViewTab("week")}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: viewTab === "week" ? "1px solid var(--primary)" : "1px solid var(--border)",
              background: viewTab === "week" ? "var(--primary)" : "white",
              color: viewTab === "week" ? "white" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            🗓️ Toàn bộ tuần
          </button>
          <button
            onClick={() => setViewTab("today")}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: viewTab === "today" ? "1px solid var(--primary)" : "1px solid var(--border)",
              background: viewTab === "today" ? "var(--primary)" : "white",
              color: viewTab === "today" ? "white" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            ⚡ Hôm nay ({DAYS.find((d) => d.thu === currentThu)?.label || "Chủ Nhật"})
          </button>
        </div>

        {/* Buổi Filter */}
        <div style={{ display: "flex", background: "var(--bg-muted)", padding: 3, borderRadius: 10, border: "1px solid var(--border)" }}>
          <button
            onClick={() => setFilterBuoi("ALL")}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "none",
              background: filterBuoi === "ALL" ? "white" : "transparent",
              color: filterBuoi === "ALL" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterBuoi("Sáng")}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "none",
              background: filterBuoi === "Sáng" ? "white" : "transparent",
              color: filterBuoi === "Sáng" ? "#d97706" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            Sáng
          </button>
          <button
            onClick={() => setFilterBuoi("Chiều")}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "none",
              background: filterBuoi === "Chiều" ? "white" : "transparent",
              color: filterBuoi === "Chiều" ? "#7c3aed" : "var(--text-secondary)",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            Chiều
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
      ) : viewTab === "today" ? (
        /* TODAY VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {todayPeriods.length === 0 ? (
            <div className="card" style={{ padding: "48px 20px", textAlign: "center" }}>
              <Sparkles size={40} color="var(--text-muted)" style={{ margin: "0 auto 10px" }} />
              <h3>Hôm nay không có tiết học nào</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                Chúc các bạn có một ngày nghỉ ngơi vui vẻ!
              </p>
            </div>
          ) : (
            todayPeriods.map((p) => {
              const color = getSubjectColor(p.monHoc);
              return (
                <div
                  key={p.id}
                  className="card card-hover"
                  style={{
                    padding: "18px 20px",
                    borderRadius: 14,
                    borderLeft: `5px solid ${color.text}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: color.bg,
                        border: `1px solid ${color.border}`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        color: color.text,
                      }}
                    >
                      <span style={{ fontSize: "0.65rem", textTransform: "uppercase" }}>TIẾT</span>
                      <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{p.tiet}</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                        {p.monHoc}
                      </h3>
                      <div style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: 2 }}>
                        ⏰ <strong>{p.thoiGian || DEFAULT_TIMES[p.tiet]}</strong> • Phòng <strong>{p.phongHoc || "201"}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    {p.giaoVien && (
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
                        🧑‍🏫 {p.giaoVien}
                      </div>
                    )}
                    {p.ghiChu && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: 2 }}>
                        💡 {p.ghiChu}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* WEEKLY GRID VIEW */
        <div className="card" style={{ overflow: "hidden", borderRadius: 16, border: "1px solid var(--border)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid var(--border)" }}>
                  <th style={{ width: 90, padding: "12px 10px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    Tiết
                  </th>
                  {DAYS.map((d) => {
                    const isTodayCol = d.thu === currentThu;
                    return (
                      <th
                        key={d.thu}
                        style={{
                          padding: "14px 12px",
                          textAlign: "center",
                          fontSize: "0.92rem",
                          fontWeight: 800,
                          color: isTodayCol ? "#166534" : "#1e293b",
                          background: isTodayCol ? "#f0fdf4" : "transparent",
                          borderLeft: "1px solid var(--border)",
                          width: "15%",
                        }}
                      >
                        {d.label} {isTodayCol ? "🌟" : ""}
                      </th>
                    );
                  })}
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
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              color: "#64748b",
                              letterSpacing: "0.05em",
                            }}
                          >
                            ☕ NGHỈ TRƯA — BUỔI CHIỀU
                          </td>
                        </tr>
                      )}
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {/* Tiết header */}
                        <td
                          style={{
                            padding: "12px 8px",
                            textAlign: "center",
                            background: "#fafbfc",
                            borderRight: "1px solid var(--border)",
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--primary)" }}>
                            Tiết {tietNum}
                          </div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                            {DEFAULT_TIMES[tietNum] || ""}
                          </div>
                        </td>

                        {/* 6 Day columns */}
                        {DAYS.map((d) => {
                          const item = getPeriodItem(d.thu, tietNum);
                          const isTodayCol = d.thu === currentThu;
                          if (!item) {
                            return (
                              <td
                                key={d.thu}
                                style={{
                                  padding: "6px",
                                  borderLeft: "1px solid var(--border)",
                                  background: isTodayCol ? "#f0fdf420" : "white",
                                  textAlign: "center",
                                  color: "var(--text-muted)",
                                  fontSize: "0.75rem",
                                }}
                              >
                                —
                              </td>
                            );
                          }

                          const color = getSubjectColor(item.monHoc);
                          return (
                            <td
                              key={d.thu}
                              style={{
                                padding: "6px",
                                borderLeft: "1px solid var(--border)",
                                background: isTodayCol ? "#f0fdf425" : "white",
                                verticalAlign: "top",
                              }}
                            >
                              <div
                                style={{
                                  background: color.bg,
                                  border: `1px solid ${color.border}`,
                                  borderRadius: 10,
                                  padding: "7px 9px",
                                  minHeight: 64,
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: "0.85rem", color: color.text }}>
                                    {item.monHoc}
                                  </div>
                                  {item.giaoVien && (
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                                      {item.giaoVien}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 4 }}>
                                  {item.phongHoc || "P.201"}
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
      )}
    </div>
  );
}

export default function PublicThoiKhoaBieuPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 400, borderRadius: 16 }} />}>
        <PublicThoiKhoaBieuContent />
      </Suspense>
    </PublicLayout>
  );
}
