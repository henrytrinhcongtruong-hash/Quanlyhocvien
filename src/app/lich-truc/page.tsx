"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Sparkles } from "lucide-react";
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
      return urlLop || localStorage.getItem("admin_selected_class") || "11AT3";
    }
    return urlLop || "11AT3";
  });

  const [currentWeek, setCurrentWeek] = useState(getCurrentISOWeek());
  const [entries, setEntries] = useState<DutyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (urlLop && urlLop !== "ALL") setActiveLop(urlLop);
  }, [urlLop]);

  useEffect(() => {
    setLoading(true);
    const lopQuery = activeLop && activeLop !== "ALL" ? `&lop=${activeLop}` : "";
    fetch(`/api/duty?week=${currentWeek}${lopQuery}`)
      .then(r => r.json())
      .then(d => {
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
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>Lịch trực nhật Lớp {activeLop}</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Phân công vệ sinh lớp học theo tuần — Năm học 2025–2026
        </p>
      </div>

      {/* Week navigator */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="btn btn-secondary btn-sm" onClick={() => changeWeek(-1)}>
          <ChevronLeft size={16} /> Tuần trước
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "1.05rem" }}>
          <CalendarIcon size={18} color="var(--primary)" />
          Tuần: <span style={{ color: "var(--primary)" }}>{currentWeek}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => changeWeek(1)}>
          Tuần sau <ChevronRight size={16} />
        </button>
      </div>

      {/* Schedule grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {THU_NAMES.map((thu, i) => {
          const dayGroup = entries.find(e => e.thu === thu);
          const studentList = dayGroup?.students || [];

          return (
            <div key={thu} className="card" style={{ overflow: "hidden" }}>
              <div
                style={{
                  padding: "12px 14px",
                  background: i === 0 ? "var(--primary-light)" : "var(--bg-muted)",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: i === 0 ? "var(--primary)" : "var(--text-primary)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {thu}
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {studentList.length} HS
                </span>
              </div>

              <div style={{ padding: "14px", minHeight: 120 }}>
                {loading ? (
                  <div className="skeleton" style={{ height: 60 }} />
                ) : studentList.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>
                    Chưa phân công
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {studentList.map((name, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          padding: "8px 12px",
                          background: "var(--bg-page)",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          fontWeight: 600,
                          fontSize: "0.875rem",
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
                            background: "var(--primary-light)",
                            color: "var(--primary)",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {sIdx + 1}
                        </div>
                        {name}
                      </div>
                    ))}
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

export default function PublicLichTrucPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 200 }} />}>
        <LichTrucInner />
      </Suspense>
    </PublicLayout>
  );
}
