"use client";
import React, { useState, useEffect, Suspense, useMemo } from "react";
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
  Clock,
  MapPin,
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
      .then((d) => {
        setEntries(d.entries || []);
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

      {/* Week Navigator & Search Toolbar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          padding: "18px 22px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        {/* Week Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => changeWeek(-1)}
            style={{ borderRadius: 10, fontWeight: 700 }}
          >
            <ChevronLeft size={16} /> Tuần trước
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>
            <CalendarIcon size={18} color="#d97706" />
            Tuần: <span style={{ color: "#d97706" }}>{currentWeek}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => changeWeek(1)}
            style={{ borderRadius: 10, fontWeight: 700 }}
          >
            Tuần sau <ChevronRight size={16} />
          </button>
        </div>

        {/* Student Name Search in Duty */}
        <div style={{ position: "relative", minWidth: 260, flex: "0 1 320px" }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            className="input"
            style={{ paddingLeft: 40, height: 42, borderRadius: 12, border: "1.5px solid #cbd5e1", fontSize: "0.88rem" }}
            placeholder="🔍 Gõ tên học sinh để xem ngày trực..."
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
          />
          {searchStudent && (
            <button
              type="button"
              onClick={() => setSearchStudent("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Schedule 6 Days Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {THU_NAMES.map((thu, i) => {
          const dayGroup = entries.find((e) => e.thu === thu);
          const studentList = dayGroup?.students || [];
          const isMatched = searchStudent.trim() && studentList.some((s) => s.toLowerCase().includes(searchStudent.toLowerCase()));

          return (
            <div
              key={thu}
              style={{
                background: "#ffffff",
                borderRadius: 18,
                border: isMatched ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                overflow: "hidden",
                boxShadow: isMatched ? "0 8px 24px rgba(2,132,199,0.18)" : "0 3px 12px rgba(0,0,0,0.03)",
                transition: "all 0.18s ease",
              }}
            >
              {/* Day Header */}
              <div
                style={{
                  padding: "12px 16px",
                  background: isMatched ? "#e0f2fe" : i === 0 ? "#fef3c7" : "#f8fafc",
                  borderBottom: `1.5px solid ${isMatched ? "#bae6fd" : "#e2e8f0"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 900, fontSize: "0.95rem", color: isMatched ? "#0369a1" : i === 0 ? "#b45309" : "#0f172a" }}>
                  {thu}
                </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
                  {studentList.length} bạn
                </span>
              </div>

              {/* Student List */}
              <div style={{ padding: "16px", minHeight: 140 }}>
                {loading ? (
                  <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
                ) : studentList.length === 0 ? (
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>
                    Chưa phân công
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {studentList.map((name, sIdx) => {
                      const isHighlighted = searchStudent.trim() && name.toLowerCase().includes(searchStudent.toLowerCase());
                      return (
                        <div
                          key={sIdx}
                          style={{
                            padding: "8px 12px",
                            background: isHighlighted ? "#e0f2fe" : "#f8fafc",
                            borderRadius: 10,
                            border: `1px solid ${isHighlighted ? "#38bdf8" : "#e2e8f0"}`,
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            color: isHighlighted ? "#0369a1" : "#1e293b",
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
                    })}
                  </div>
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
