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
  Filter,
  Download,
} from "lucide-react";
import { SeatSlotData, generateEmptySlots } from "@/lib/seatingTypes";

const TO_COLORS: Record<number, { bg: string; text: string; border: string; glow: string }> = {
  1: { bg: "#e0f2fe", text: "#0369a1", border: "#38bdf8", glow: "rgba(2, 132, 199, 0.4)" },
  2: { bg: "#dcfce7", text: "#15803d", border: "#4ade80", glow: "rgba(22, 163, 74, 0.4)" },
  3: { bg: "#fef3c7", text: "#b45309", border: "#fcd34d", glow: "rgba(217, 119, 6, 0.4)" },
  4: { bg: "#f3e8ff", text: "#7e22ce", border: "#c084fc", glow: "rgba(147, 51, 234, 0.4)" },
};

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
  const [filterTo, setFilterTo] = useState<number>(0); // 0 = All, 1, 2, 3, 4
  const [slots, setSlots] = useState<SeatSlotData[]>([]);
  const [title, setTitle] = useState("SƠ ĐỒ LỚP 12T2");
  const [gvcn, setGvcn] = useState("KIM LIÊN");
  const [slogan, setSlogan] = useState("12T2 – CÙNG NHAU VƯỢT VŨ MÔN, CÙNG NHAU CHIẾN THẮNG!");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

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
          setTitle(d.chart.title || `SƠ ĐỒ LỚP ${activeLop}`);
          setGvcn(d.chart.gvcn || "KIM LIÊN");
          setSlogan(d.chart.slogan || "12T2 – CÙNG NHAU VƯỢT VŨ MÔN, CÙNG NHAU CHIẾN THẮNG!");

          const studentsList = d.students || [];
          let loadedSlots: SeatSlotData[] = d.chart.slots || [];
          if (loadedSlots.length < 56) {
            const empty = generateEmptySlots();
            loadedSlots = empty.map((e) => {
              const found = loadedSlots.find((l) => l.row === e.row && l.col === e.col);
              return found || e;
            });
          }

          // Backfill 'to' from students list if available
          loadedSlots = loadedSlots.map((s) => {
            if (s.studentId) {
              const st = studentsList.find((st: { id: number; to: number }) => st.id === s.studentId);
              if (st) return { ...s, to: st.to };
            }
            if (s.studentName) {
              const st = studentsList.find((st: { hoTen: string; to: number }) => st.hoTen.toLowerCase().includes(s.studentName?.toLowerCase() || ""));
              if (st) return { ...s, to: st.to };
            }
            return s;
          });

          setSlots(loadedSlots);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeLop, selectedMonth]);

  // 1-Click Direct Full-Height A4 PDF Download
  async function handleDownloadPdf() {
    const element = document.getElementById("seating-chart-print-area");
    if (!element) {
      window.print();
      return;
    }

    setExportingPdf(true);
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default;
      const jsPdfModule = await import("jspdf");
      const jsPDF = jsPdfModule.default;

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 4;
      const marginY = 4;
      const renderWidth = pageWidth - marginX * 2; // 202mm
      const renderHeight = pageHeight - marginY * 2; // 289mm

      pdf.addImage(imgData, "PNG", marginX, marginY, renderWidth, renderHeight);
      pdf.save(`So_do_lop_${activeLop}_A4_${selectedMonth.replace(/[\s/]+/g, "_")}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      window.print();
    } finally {
      setExportingPdf(false);
    }
  }

  // Render Seat Card Component
  function renderSeatCard(slot: SeatSlotData) {
    const isSearched =
      searchQuery.trim().length > 1 &&
      slot.studentName &&
      slot.studentName.toLowerCase().includes(searchQuery.trim().toLowerCase());

    const hasStudent = !!slot.studentName;
    const isMatchingTo = filterTo === 0 || (slot.to !== null && slot.to !== undefined && slot.to === filterTo);
    const isDimmed = filterTo !== 0 && (!slot.to || slot.to !== filterTo);
    const toConfig = slot.to ? TO_COLORS[slot.to] : null;

    return (
      <div
        key={slot.id}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          userSelect: "none",
          transition: "all 0.15s ease",
          opacity: isDimmed ? 0.3 : 1,
          transform: isSearched ? "scale(1.06)" : isMatchingTo && filterTo !== 0 ? "scale(1.02)" : "none",
          zIndex: isSearched ? 10 : 1,
          width: "100%",
        }}
      >
        {/* RECTANGULAR PHOTO CONTAINER (98px x 104px, Bo tròn nhẹ 4 góc) */}
        <div
          style={{
            width: 98,
            height: 104,
            borderRadius: 14,
            background: hasStudent ? (toConfig ? toConfig.bg : "#f1f5f9") : "#ffffff",
            border: isSearched
              ? "3px solid #ef4444"
              : filterTo !== 0 && isMatchingTo
              ? `3px solid ${toConfig?.border || "#0284c7"}`
              : hasStudent
              ? `2.5px solid ${toConfig ? toConfig.border : "#cbd5e1"}`
              : "2px dashed #94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: isSearched
              ? "0 0 14px rgba(239,68,68,0.5)"
              : filterTo !== 0 && isMatchingTo
              ? `0 0 12px ${toConfig?.glow || "rgba(2,132,199,0.3)"}`
              : hasStudent
              ? "0 3px 6px rgba(0,0,0,0.06)"
              : "none",
            marginBottom: 5,
            position: "relative",
            transition: "all 0.15s ease",
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
                  background: toConfig ? toConfig.bg : "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "1.45rem",
                  color: toConfig ? toConfig.text : "#0369a1",
                }}
              >
                {slot.studentName?.substring(0, 2) || <User size={32} color="#0284c7" />}
              </div>
            )
          ) : (
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>—</span>
          )}

          {/* Tổ Badge */}
          {hasStudent && slot.to && (
            <div
              title={`Tổ ${slot.to}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                background: toConfig?.border || "#0284c7",
                color: "white",
                fontSize: "0.65rem",
                fontWeight: 900,
                padding: "2px 6px",
                borderRadius: "11px 0 8px 0",
              }}
            >
              T{slot.to}
            </div>
          )}
        </div>

        {/* Name Capsule Box (Non-clipped 3 lines allowed) */}
        <div
          style={{
            width: "100%",
            maxWidth: 112,
            minHeight: 46,
            borderRadius: 14,
            border: isSearched
              ? "2px solid #ef4444"
              : filterTo !== 0 && isMatchingTo
              ? `2px solid ${toConfig?.border || "#000000"}`
              : hasStudent
              ? "2px solid #000000"
              : "1px dashed #cbd5e1",
            background: isSearched
              ? "#fee2e2"
              : filterTo !== 0 && isMatchingTo && toConfig
              ? toConfig.bg
              : hasStudent
              ? "#ffffff"
              : "#f8fafc",
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
              fontSize: "0.72rem",
              fontWeight: 900,
              color: isSearched
                ? "#dc2626"
                : filterTo !== 0 && isMatchingTo && toConfig
                ? toConfig.text
                : hasStudent
                ? "#000000"
                : "#94a3b8",
              lineHeight: 1.22,
              textTransform: "uppercase",
              wordBreak: "break-word",
              display: "block",
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
      {/* Full-Height A4 Print CSS Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 5mm;
          }
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #seating-chart-print-area, #seating-chart-print-area * {
            visibility: visible;
          }
          #seating-chart-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 288mm !important;
            min-height: 288mm !important;
            max-height: 288mm !important;
            margin: 0 !important;
            padding: 16px 20px 14px !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: 2.5px solid #000000 !important;
            border-radius: 18px !important;
            display: flex !important;
            flex-direction: column !important;
            justifyContent: space-between !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            overflow: hidden !important;
          }
          .no-print, header, nav, aside, footer {
            display: none !important;
          }
        }
      `}</style>

      {/* Banner */}
      <div
        className="no-print"
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
                  Khung ảnh 92px • Tràn đầy khổ giấy A4 • Áp dụng: <strong>{selectedMonth}</strong> • GVCN: {gvcn}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ background: "rgba(255,255,255,0.2)", color: "white", borderColor: "rgba(255,255,255,0.4)" }}
                onClick={handleDownloadPdf}
                disabled={exportingPdf}
              >
                <Download size={14} /> {exportingPdf ? "Đang tạo PDF..." : "Tải PDF A4"}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ background: "rgba(255,255,255,0.2)", color: "white", borderColor: "rgba(255,255,255,0.4)" }}
                onClick={() => window.print()}
              >
                <Printer size={14} /> In Sơ Đồ A4
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Month Filter Toolbar */}
      <div
        className="no-print"
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 220, maxWidth: 340 }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            className="input"
            style={{ width: "100%", padding: "6px 12px", fontSize: "0.875rem" }}
            placeholder="🔍 Tìm tên học sinh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter By Tổ (Tổ 1 - Tổ 4) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", padding: "4px 8px", borderRadius: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
            <Filter size={12} /> Tổ:
          </span>
          {[
            { id: 0, label: "Tất cả", color: "#64748b", bg: "#f1f5f9" },
            { id: 1, label: "Tổ 1", color: "#0284c7", bg: "#e0f2fe" },
            { id: 2, label: "Tổ 2", color: "#16a34a", bg: "#dcfce7" },
            { id: 3, label: "Tổ 3", color: "#d97706", bg: "#fef3c7" },
            { id: 4, label: "Tổ 4", color: "#9333ea", bg: "#f3e8ff" },
          ].map((t) => {
            const isActive = filterTo === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTo(t.id)}
                style={{
                  border: isActive ? `2px solid ${t.color}` : "1px solid transparent",
                  background: isActive ? t.bg : "transparent",
                  color: isActive ? t.color : "#64748b",
                  fontWeight: isActive ? 800 : 600,
                  fontSize: "0.78rem",
                  padding: "3px 9px",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {t.label}
              </button>
            );
          })}
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
          id="seating-chart-print-area"
          className="card"
          style={{
            background: "#ffffff",
            backgroundImage: "radial-gradient(#e2e8f0 1.2px, transparent 1.2px)",
            backgroundSize: "22px 22px",
            borderRadius: 22,
            border: "2.5px solid #000000",
            padding: "26px 28px 22px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
            maxWidth: 980,
            margin: "0 auto",
          }}
        >
          {/* 7 Rows Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((rowNum) => {
              const leftSlots = slots.filter((s) => s.row === rowNum && s.block === "left");
              const rightSlots = slots.filter((s) => s.row === rowNum && s.block === "right");

              return (
                <div
                  key={`row-${rowNum}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 34px 1fr",
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
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      color: "#94a3b8",
                      letterSpacing: "1px",
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

          {/* Teacher's Desk */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              justifyContent: "flex-end",
              paddingRight: 16,
            }}
          >
            <div
              style={{
                width: 320,
                background: "#ffffff",
                border: "3px solid #1e293b",
                borderRadius: 18,
                padding: "12px 20px",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 900,
                  color: "#1e293b",
                  letterSpacing: "2px",
                }}
              >
                TEACHER'S DESK
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "2.5px solid #000000",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div style={{ flex: 1, minWidth: 280 }}>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 900,
                  color: "#000000",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                }}
              >
                {title}
              </div>
              {slogan && (
                <div style={{ fontSize: "0.825rem", color: "#475569", fontStyle: "italic", marginTop: 4 }}>
                  "{slogan}"
                </div>
              )}
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 3, fontWeight: 600 }}>
                Áp dụng: {selectedMonth} • Hệ thống Quanlyhocvien
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
              <div
                style={{
                  border: "2.5px solid #000000",
                  borderRadius: 16,
                  padding: "6px 16px",
                  fontSize: "0.9rem",
                  fontWeight: 900,
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
                  border: "2.5px solid #000000",
                  borderRadius: 16,
                  padding: "6px 16px",
                  fontSize: "0.9rem",
                  fontWeight: 900,
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
