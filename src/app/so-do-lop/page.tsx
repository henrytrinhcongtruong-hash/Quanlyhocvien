"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  LayoutGrid,
  Search,
  User,
  Printer,
  Calendar,
  Sparkles,
  School,
} from "lucide-react";
import { SeatSlotData, generateEmptySlots } from "@/lib/seatingTypes";

function PublicSoDoLopContent() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");

  const [activeLop, setActiveLop] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return urlLop || localStorage.getItem("admin_selected_class") || "12T2";
    }
    return urlLop || "12T2";
  });

  const [selectedMonth, setSelectedMonth] = useState("Tháng 09/2025");
  const [monthList, setMonthList] = useState<string[]>(["Tháng 09/2025"]);
  const [slots, setSlots] = useState<SeatSlotData[]>([]);
  const [title, setTitle] = useState("CLASSROOM SEATING CHART");
  const [gvcn, setGvcn] = useState("Phí Huỳnh Anh Hào");
  const [slogan, setSlogan] = useState("Kỷ Cương - Trách Nhiệm - Hiệu Quả - Phát Triển");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Sync class
  useEffect(() => {
    if (urlLop && urlLop !== "ALL") {
      setActiveLop(urlLop);
    }
  }, [urlLop]);

  // Load Months
  useEffect(() => {
    fetch(`/api/seating/months?lop=${activeLop}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.months && d.months.length > 0) {
          setMonthList(d.months);
          if (!d.months.includes(selectedMonth)) {
            setSelectedMonth(d.months[0]);
          }
        }
      })
      .catch(() => {});
  }, [activeLop, selectedMonth]);

  // Load Chart
  useEffect(() => {
    setLoading(true);
    fetch(`/api/seating?lop=${activeLop}&month=${encodeURIComponent(selectedMonth)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.chart) {
          setTitle(d.chart.title || "CLASSROOM SEATING CHART");
          setGvcn(d.chart.gvcn || "Phí Huỳnh Anh Hào");
          setSlogan(d.chart.slogan || "Kỷ Cương - Trách Nhiệm - Hiệu Quả - Phát Triển");
          let loadedSlots: SeatSlotData[] = d.chart.slots || [];
          if (loadedSlots.length < 56) {
            const empty = generateEmptySlots();
            loadedSlots = empty.map((e) => {
              const found = loadedSlots.find((l) => l.row === e.row && l.col === e.col);
              return found || e;
            });
          }
          setSlots(loadedSlots);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeLop, selectedMonth]);

  // Render Seat Card Component
  function renderSeatCard(slot: SeatSlotData) {
    const isSearched =
      searchQuery.trim().length > 1 &&
      slot.studentName &&
      slot.studentName.toLowerCase().includes(searchQuery.trim().toLowerCase());

    const hasStudent = !!slot.studentName;

    return (
      <div
        key={slot.id}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          userSelect: "none",
          transition: "all 0.2s ease",
          transform: isSearched ? "scale(1.12)" : "none",
          zIndex: isSearched ? 10 : 1,
        }}
      >
        {/* Photo Container */}
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: "50%",
            background: hasStudent ? "#f1f5f9" : "#ffffff",
            border: isSearched
              ? "3px solid #ef4444"
              : hasStudent
              ? "2px solid #cbd5e1"
              : "2px dashed #94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: isSearched
              ? "0 0 16px rgba(239,68,68,0.5)"
              : hasStudent
              ? "0 4px 8px rgba(0,0,0,0.06)"
              : "none",
            marginBottom: 6,
          }}
        >
          {hasStudent ? (
            slot.studentPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.studentPhoto}
                alt={slot.studentName || "Avatar"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "1.1rem",
                  color: "#0369a1",
                }}
              >
                {slot.studentName?.substring(0, 2) || <User size={24} color="#0284c7" />}
              </div>
            )
          ) : (
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>—</span>
          )}
        </div>

        {/* Name Capsule Box */}
        <div
          style={{
            width: "100%",
            maxWidth: 96,
            minHeight: 36,
            borderRadius: 14,
            border: isSearched ? "2px solid #ef4444" : hasStudent ? "2px solid #000000" : "1px dashed #cbd5e1",
            background: isSearched ? "#fee2e2" : hasStudent ? "#ffffff" : "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 6px",
            textAlign: "center",
            boxShadow: hasStudent ? "0 2px 4px rgba(0,0,0,0.04)" : "none",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 900,
              color: isSearched ? "#dc2626" : hasStudent ? "#000000" : "#94a3b8",
              lineHeight: 1.15,
              textTransform: "uppercase",
              wordBreak: "break-word",
            }}
          >
            {slot.studentName || "TRỐNG"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #0f172a 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "30px 26px",
          marginBottom: 22,
          color: "white",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(2,132,199,0.25)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                <LayoutGrid size={26} color="#38bdf8" />
              </div>
              <div>
                <h1 style={{ color: "white", fontSize: "1.45rem", margin: 0 }}>
                  Sơ Đồ Chỗ Ngồi Lớp Học — Lớp {activeLop}
                </h1>
                <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", margin: 0 }}>
                  2 Dãy bàn đều 7 hàng ngang (56 chỗ) • Áp dụng: <strong>{selectedMonth}</strong> • GVCN: {gvcn}
                </p>
              </div>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              style={{ background: "rgba(255,255,255,0.2)", color: "white", borderColor: "rgba(255,255,255,0.4)" }}
              onClick={() => window.print()}
            >
              <Printer size={14} /> In Sơ Đồ
            </button>
          </div>
        </div>
      </div>

      {/* Search & Month Filter Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 12,
          background: "white",
          padding: "12px 18px",
          borderRadius: 14,
          border: "1px solid var(--border)",
        }}
      >
        {/* Search Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 240, maxWidth: 380 }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            className="input"
            style={{ width: "100%", padding: "6px 12px", fontSize: "0.875rem" }}
            placeholder="🔍 Nhập tên học sinh để tìm vị trí ngồi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Month Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            Chọn tháng:
          </span>
          <select
            className="select"
            style={{ fontWeight: 700 }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Seating Chart Poster */}
      {loading ? (
        <div className="skeleton" style={{ height: 600, borderRadius: 20 }} />
      ) : (
        <div
          className="card"
          style={{
            background: "#ffffff",
            backgroundImage: "radial-gradient(#e2e8f0 1.2px, transparent 1.2px)",
            backgroundSize: "24px 24px",
            borderRadius: 24,
            border: "2px solid #e2e8f0",
            padding: "36px 32px 28px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
            maxWidth: 960,
            margin: "0 auto",
          }}
        >
          {/* 7 Rows Grid (Both Left and Right Blocks have full 7 rows) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((rowNum) => {
              const leftSlots = slots.filter((s) => s.row === rowNum && s.block === "left");
              const rightSlots = slots.filter((s) => s.row === rowNum && s.block === "right");

              return (
                <div
                  key={`row-${rowNum}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 40px 1fr",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* Dãy Trái (4 cột) */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 10,
                    }}
                  >
                    {leftSlots.map((s) => renderSeatCard(s))}
                  </div>

                  {/* Lối đi */}
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: "#cbd5e1",
                    }}
                  >
                    H{rowNum}
                  </div>

                  {/* Dãy Phải (4 cột) */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 10,
                    }}
                  >
                    {rightSlots.map((s) => renderSeatCard(s))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Teacher's Desk below seating rows */}
          <div
            style={{
              marginTop: 26,
              display: "flex",
              justifyContent: "flex-end",
              paddingRight: 20,
            }}
          >
            <div
              style={{
                width: 320,
                background: "#ffffff",
                border: "3px solid #1e293b",
                borderRadius: 20,
                padding: "12px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 900,
                  color: "#1e293b",
                  letterSpacing: "1px",
                }}
              >
                TEACHER'S DESK
              </div>
              <div
                style={{
                  width: 36,
                  height: 10,
                  background: "#facc15",
                  borderRadius: "0 0 8px 8px",
                  border: "2px solid #1e293b",
                  borderTop: "none",
                  marginTop: 2,
                }}
              />
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, marginTop: 2 }}>
                BÀN GIÁO VIÊN
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: "2px solid #000000",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "1.7rem",
                  fontWeight: 900,
                  color: "#000000",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                }}
              >
                {title}
              </div>
              {slogan && (
                <div style={{ fontSize: "0.8rem", color: "#64748b", fontStyle: "italic", marginTop: 4 }}>
                  "{slogan}"
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
              <div
                style={{
                  border: "2px solid #000000",
                  borderRadius: 20,
                  padding: "6px 16px",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#000000",
                  background: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Class:</span>
                <span style={{ color: "#0284c7" }}>{activeLop}</span>
              </div>

              <div
                style={{
                  border: "2px solid #000000",
                  borderRadius: 20,
                  padding: "6px 16px",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#000000",
                  background: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span>Teacher:</span>
                <span style={{ color: "#0284c7" }}>{gvcn}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicSoDoLopPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 600, borderRadius: 20 }} />}>
        <PublicSoDoLopContent />
      </Suspense>
    </PublicLayout>
  );
}
