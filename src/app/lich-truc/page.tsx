"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  Sparkles,
  Search,
  X,
  CheckCircle,
} from "lucide-react";
import { getCurrentISOWeek, THU_NAMES } from "@/lib/format";

interface DutyEntry {
  thu: string;
  thuOrder: number;
  students: string[];
}

function LichTrucInner() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const [activeLop, setActiveLop] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return urlLop || localStorage.getItem("admin_selected_class") || "12T2";
    }
    return urlLop || "12T2";
  });

  const [currentWeek, setCurrentWeek] = useState(getCurrentISOWeek());
  const [entries, setEntries] = useState<DutyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchStudent, setSearchStudent] = useState("");

  useEffect(() => {
    if (urlLop && urlLop !== "ALL") setActiveLop(urlLop);
  }, [urlLop]);

  useEffect(() => {
    setLoading(true);
    const lopQuery = activeLop && activeLop !== "ALL" ? `&lop=${activeLop}` : "";
    fetch(`/api/duty?week=${currentWeek}${lopQuery}`)
      .then((r) => r.json())
      .then((dutyData) => {
        setEntries(dutyData.entries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentWeek, activeLop]);

  function changeWeek(delta: number) {
    const [yearStr, weekStr] = currentWeek.split("-W");
    let year = Number(yearStr);
    let week = Number(weekStr) + delta;
    if (week < 1) {
      year--;
      week = 52;
    } else if (week > 52) {
      year++;
      week = 1;
    }
    setCurrentWeek(`${year}-W${String(week).padStart(2, "0")}`);
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 0 40px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #ea580c 100%)",
          borderRadius: 22,
          padding: "28px 28px 24px",
          color: "white",
          marginBottom: 24,
          boxShadow: "0 10px 30px rgba(217, 119, 6, 0.2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
            <CalendarIcon size={14} /> Lịch vệ sinh lớp học
          </div>
          <h1 style={{ color: "white", fontSize: "1.9rem", fontWeight: 900, margin: "0 0 6px" }}>
            Lịch Trực Nhật Lớp {activeLop}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem", margin: 0 }}>
            Phân công vệ sinh phòng học theo từng ngày trong tuần — Năm học 2025–2026
          </p>
        </div>
      </div>

      {/* Week Navigator & Search */}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: "16px 20px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          border: "1px solid #e2e8f0",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => changeWeek(-1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "8px 14px",
              borderRadius: 10,
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={16} /> Tuần trước
          </button>

          <div
            style={{
              padding: "8px 18px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 10,
              fontWeight: 800,
              color: "#b45309",
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CalendarIcon size={16} /> Tuần: {currentWeek}
          </div>

          <button
            onClick={() => changeWeek(1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "8px 14px",
              borderRadius: 10,
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Tuần sau <ChevronRight size={16} />
          </button>
        </div>

        {/* Search student box */}
        <div style={{ position: "relative", minWidth: 260 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Tìm tên học sinh trong lịch..."
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 32px 8px 34px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
          {searchStudent && (
            <button
              onClick={() => setSearchStudent("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Week Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
          gap: 16,
        }}
      >
        {THU_NAMES.map((thu, idx) => {
          const dayEntry = entries.find((e) => e.thu === thu);
          const studentList = dayEntry?.students || [];
          const dayColors = [
            { headerBg: "#f0fdf4", headerText: "#15803d", borderColor: "#bbf7d0", badge: "#dcfce7" },
            { headerBg: "#eff6ff", headerText: "#1d4ed8", borderColor: "#bfdbfe", badge: "#dbeafe" },
            { headerBg: "#fdf4ff", headerText: "#86198f", borderColor: "#f5d0fe", badge: "#fae8ff" },
            { headerBg: "#fffbeb", headerText: "#b45309", borderColor: "#fde68a", badge: "#fef3c7" },
            { headerBg: "#fef2f2", headerText: "#b91c1c", borderColor: "#fecaca", badge: "#fee2e2" },
          ];
          const colorTheme = dayColors[idx % dayColors.length];

          return (
            <div
              key={thu}
              style={{
                background: "white",
                borderRadius: 16,
                border: `1.5px solid ${colorTheme.borderColor}`,
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Day Header */}
              <div
                style={{
                  background: colorTheme.headerBg,
                  padding: "12px 14px",
                  borderBottom: `1px solid ${colorTheme.borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontWeight: 800, color: colorTheme.headerText, fontSize: "0.95rem" }}>
                  {thu}
                </div>
                <span
                  style={{
                    background: colorTheme.badge,
                    color: colorTheme.headerText,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                  }}
                >
                  {studentList.length} bạn
                </span>
              </div>

              {/* Students List */}
              <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {loading ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem" }}>
                    Đang tải...
                  </div>
                ) : studentList.length === 0 ? (
                  <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem", fontStyle: "italic" }}>
                    Chưa phân công
                  </div>
                ) : (
                  studentList.map((name, sIdx) => {
                    const isHighlighted = searchStudent && name.toLowerCase().includes(searchStudent.toLowerCase().trim());
                    return (
                      <div
                        key={sIdx}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: isHighlighted ? "#e0f2fe" : "#f8fafc",
                          border: isHighlighted ? "1.5px solid #38bdf8" : "1px solid #f1f5f9",
                          fontSize: "0.85rem",
                          fontWeight: isHighlighted ? 700 : 600,
                          color: isHighlighted ? "#0369a1" : "#334155",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: isHighlighted ? "#0284c7" : "#e2e8f0",
                            color: isHighlighted ? "white" : "#475569",
                            fontSize: "0.72rem",
                            fontWeight: 900,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {sIdx + 1}
                        </div>
                        <span style={{ flex: 1 }}>{name}</span>
                        {isHighlighted && <CheckCircle size={15} color="#0284c7" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LichTrucPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 400, borderRadius: 20 }} />}>
        <LichTrucInner />
      </Suspense>
    </PublicLayout>
  );
}
