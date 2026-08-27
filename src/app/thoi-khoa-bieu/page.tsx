"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  CalendarDays,
  Clock,
  User,
  BookOpen,
  Sparkles,
  Moon,
  Coffee,
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
  lop: string;
  hocKy: string;
  ghiChu: string | null;
}

const EVENING_TIMES: Record<number, { time: string; duration: string }> = {
  1: { time: "18h00 - 18h40", duration: "40 phút" },
  2: { time: "18h40 - 19h20", duration: "40 phút" },
  3: { time: "19h35 - 20h15", duration: "40 phút" },
  4: { time: "20h15 - 20h55", duration: "40 phút" },
  5: { time: "20h55 - 21h35", duration: "40 phút" },
};

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

function PublicThoiKhoaBieuContent() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");

  const [activeLop, setActiveLop] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return urlLop || localStorage.getItem("admin_selected_class") || "12T2";
    }
    return urlLop || "12T2";
  });

  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHocKy, setSelectedHocKy] = useState("HK1");
  const [viewTab, setViewTab] = useState<"week" | "today">("week");

  // Determine current day in Vietnam
  const todayDate = new Date();
  const jsDay = todayDate.getDay();
  const currentThu = jsDay === 0 ? 8 : jsDay + 1; // 2=Thứ 2, ..., 6=Thứ 6

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

  const todayPeriods = timetable.filter((t) => t.thu === currentThu).sort((a, b) => a.tiet - b.tiet);
  const periodsList = [1, 2, 3, 4, 5];

  return (
    <div>
      {/* Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #06b6d4 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "30px 26px",
          marginBottom: 22,
          color: "white",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(30,27,75,0.25)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 46,
                height: 46,
                background: "rgba(255,255,255,0.15)",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(6px)",
              }}
            >
              <Moon size={26} color="#38bdf8" />
            </div>
            <div>
              <h1 style={{ color: "white", fontSize: "1.45rem", margin: 0 }}>
                Thời Khóa Biểu Buổi Tối — Lớp {activeLop}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", margin: 0 }}>
                Khung giờ học Buổi Tối: <strong>18h00 - 21h35</strong> (Bắt đầu từ ngày 07/09/2025)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule Highlight */}
      {currentThu >= 2 && currentThu <= 6 && todayPeriods.length > 0 && (
        <div
          className="card"
          style={{
            padding: "18px 22px",
            marginBottom: 20,
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
                {todayPeriods.length} tiết học buổi tối
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {todayPeriods.map((p) => {
              const color = getSubjectColor(p.monHoc);
              const timeInfo = EVENING_TIMES[p.tiet];
              return (
                <div
                  key={p.id}
                  style={{
                    background: "white",
                    border: `1px solid ${color.border}`,
                    borderRadius: 12,
                    padding: "10px 14px",
                    minWidth: 135,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    Tiết {p.tiet} • {timeInfo?.time || p.thoiGian}
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: color.text, marginTop: 2 }}>
                    {p.monHoc}
                  </div>
                  {p.giaoVien && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      🧑‍🏫 {p.giaoVien}
                    </div>
                  )}
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
          marginBottom: 16,
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
            }}
          >
            🗓️ Toàn bộ tuần (Thứ 2 - Thứ 6)
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
            }}
          >
            ⚡ Hôm nay ({DAYS.find((d) => d.thu === currentThu)?.label || "Nghỉ"})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <Clock size={14} /> Khung giờ 18h00 - 21h35
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="skeleton" style={{ height: 350, borderRadius: 16 }} />
      ) : viewTab === "today" ? (
        /* TODAY VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {todayPeriods.length === 0 ? (
            <div className="card" style={{ padding: "48px 20px", textAlign: "center" }}>
              <Sparkles size={40} color="var(--text-muted)" style={{ margin: "0 auto 10px" }} />
              <h3>Hôm nay không có tiết học buổi tối</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                Chúc các bạn học viên có một ngày nghỉ ngơi vui vẻ!
              </p>
            </div>
          ) : (
            todayPeriods.map((p) => {
              const color = getSubjectColor(p.monHoc);
              const timeInfo = EVENING_TIMES[p.tiet];
              return (
                <div
                  key={p.id}
                  className="card"
                  style={{
                    padding: "16px 20px",
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
                        width: 46,
                        height: 46,
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
                        ⏰ <strong>{timeInfo?.time || p.thoiGian}</strong> ({timeInfo?.duration})
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
        /* WEEKLY GRID (MATCHES USER'S EXACT EXCEL DESIGN) */
        <div className="card" style={{ overflow: "hidden", borderRadius: 16, border: "2px solid #06b6d4" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
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
                  {DAYS.map((d) => {
                    const isTodayCol = d.thu === currentThu;
                    return (
                      <th
                        key={d.thu}
                        style={{
                          padding: "14px 12px",
                          textAlign: "center",
                          fontSize: "1.05rem",
                          fontWeight: 800,
                          borderRight: "1px solid rgba(255,255,255,0.3)",
                          background: isTodayCol ? "#0891b2" : "transparent",
                          width: "17%",
                        }}
                      >
                        {d.label} {isTodayCol ? "🌟" : ""}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {periodsList.map((tietNum) => {
                  const isBreakTime = tietNum === 3;
                  const timeInfo = EVENING_TIMES[tietNum];

                  return (
                    <React.Fragment key={tietNum}>
                      {/* Giải lao sau Tiết 2 */}
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
                        {/* Tiết / Giờ */}
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

                        {/* 5 Days Columns */}
                        {DAYS.map((d) => {
                          const item = getPeriodItem(d.thu, tietNum);
                          const isTodayCol = d.thu === currentThu;

                          if (!item || !item.monHoc) {
                            return (
                              <td
                                key={d.thu}
                                style={{
                                  padding: "6px",
                                  borderRight: "1px solid var(--border)",
                                  background: isTodayCol ? "#f0fdf420" : "white",
                                  textAlign: "center",
                                  color: "var(--text-muted)",
                                  fontSize: "0.85rem",
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
                                padding: "6px 8px",
                                borderRight: "1px solid var(--border)",
                                background: isTodayCol ? "#f0fdf430" : "white",
                                verticalAlign: "middle",
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
      )}
    </div>
  );
}

export default function PublicThoiKhoaBieuPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 350, borderRadius: 16 }} />}>
        <PublicThoiKhoaBieuContent />
      </Suspense>
    </PublicLayout>
  );
}
