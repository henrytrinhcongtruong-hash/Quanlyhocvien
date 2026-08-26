"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  User,
  BookOpen,
  FileText,
  Search,
  Sparkles,
  AlertCircle,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/format";

interface ExamSchedule {
  id: number;
  monHoc: string;
  tenKyThi: string;
  loaiKyThi: string;
  ngayThi: string;
  gioThi: string;
  thoiLuong: number;
  hinhThuc: string;
  phongThi: string | null;
  giamThi: string | null;
  phamViOnTap: string | null;
  lop: string;
  ghiChu: string | null;
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Toán Học": { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Ngữ Văn": { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
  "Tiếng Anh": { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  "Vật Lý": { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  "Hóa Học": { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  "Sinh Học": { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  "Lịch Sử": { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  "Địa Lý": { bg: "#f8fafc", text: "#334155", border: "#cbd5e1" },
  "Tin Học": { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
};

function getSubjectColor(monHoc: string) {
  return SUBJECT_COLORS[monHoc] || { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
}

function PublicLichThiContent() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");

  const [activeLop, setActiveLop] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return urlLop || localStorage.getItem("admin_selected_class") || "11AT3";
    }
    return urlLop || "11AT3";
  });

  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Tất cả");

  // Sync class
  useEffect(() => {
    if (urlLop && urlLop !== "ALL") {
      setActiveLop(urlLop);
    }
  }, [urlLop]);

  useEffect(() => {
    setLoading(true);
    const lopQuery = activeLop && activeLop !== "ALL" ? `?lop=${activeLop}` : "";
    fetch(`/api/exams${lopQuery}`)
      .then((r) => r.json())
      .then((d) => {
        setExams(d.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeLop]);

  // Find next nearest upcoming exam for Countdown Hero
  const now = new Date();
  const upcomingList = exams
    .filter((e) => new Date(e.ngayThi).getTime() + 24 * 60 * 60 * 1000 >= now.getTime())
    .sort((a, b) => new Date(a.ngayThi).getTime() - new Date(b.ngayThi).getTime());

  const nextExam = upcomingList[0];

  // Filtered exams
  const filteredExams = exams.filter((e) => {
    const matchType = filterType === "Tất cả" || e.loaiKyThi === filterType;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      e.monHoc.toLowerCase().includes(q) ||
      e.tenKyThi.toLowerCase().includes(q) ||
      (e.phamViOnTap && e.phamViOnTap.toLowerCase().includes(q));
    return matchType && matchSearch;
  });

  return (
    <div>
      {/* Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(213,80%,55%) 50%, hsl(265,70%,50%) 100%)",
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 44,
                height: 44,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(6px)",
              }}
            >
              <GraduationCap size={24} color="white" />
            </div>
            <div>
              <h1 style={{ color: "white", fontSize: "1.5rem", margin: 0 }}>
                Lịch Thi & Kiểm Tra Định Kỳ
              </h1>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.875rem", margin: 0 }}>
                Lớp {activeLop} • Kế hoạch ôn tập và thời gian kiểm tra chi tiết
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Exam Countdown Card */}
      {nextExam && (
        <div
          className="card"
          style={{
            padding: "20px 24px",
            marginBottom: 24,
            background: "linear-gradient(145deg, #f8fafc 0%, #eff6ff 100%)",
            border: "1px solid #bfdbfe",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                background: "#dbeafe",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Flame size={26} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#2563eb", letterSpacing: "0.05em" }}>
                Bài kiểm tra kế tiếp
              </div>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1e293b", marginTop: 2 }}>
                {nextExam.monHoc}: {nextExam.tenKyThi}
              </div>
              <div style={{ fontSize: "0.825rem", color: "#64748b", marginTop: 2 }}>
                📅 <strong>{formatDate(nextExam.ngayThi)}</strong> lúc <strong>{nextExam.gioThi}</strong> • Phòng {nextExam.phongThi || "Lớp học"}
              </div>
            </div>
          </div>

          <div
            style={{
              background: "white",
              padding: "10px 18px",
              borderRadius: 12,
              border: "1px solid #bfdbfe",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(37,99,235,0.08)",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>THỜI LƯỢNG</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1d4ed8" }}>{nextExam.thoiLuong} phút</div>
            <div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 700 }}>{nextExam.hinhThuc}</div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Tất cả", "15 Phút", "1 Tiết", "Giữa Kỳ", "Cuối Kỳ", "Khảo sát"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                border: filterType === t ? "1px solid var(--primary)" : "1px solid var(--border)",
                background: filterType === t ? "var(--primary)" : "white",
                color: filterType === t ? "white" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "0.825rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", minWidth: 220 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="input"
            style={{ paddingLeft: 34, height: 36, fontSize: "0.85rem" }}
            placeholder="Tìm môn học, kỳ thi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Exams Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <GraduationCap size={44} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.1rem", marginBottom: 4 }}>Không tìm thấy lịch thi phù hợp</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Hiện chưa có lịch thi hoặc kiểm tra nào được đăng ký trong danh mục này.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 16 }}>
          {filteredExams.map((item) => {
            const color = getSubjectColor(item.monHoc);
            const isToday = new Date(item.ngayThi).toDateString() === new Date().toDateString();
            return (
              <div
                key={item.id}
                className="card card-hover"
                style={{
                  padding: "20px",
                  borderRadius: 14,
                  border: isToday ? "2px solid #ef4444" : "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  {/* Top Bar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span
                      style={{
                        background: color.bg,
                        color: color.text,
                        border: `1px solid ${color.border}`,
                        padding: "4px 10px",
                        borderRadius: 8,
                        fontWeight: 800,
                        fontSize: "0.85rem",
                      }}
                    >
                      {item.monHoc}
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                      {item.loaiKyThi}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>
                    {item.tenKyThi}
                  </h3>

                  {/* Info details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.825rem", color: "var(--text-secondary)", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Calendar size={14} color="var(--primary)" />
                      <span>
                        <strong>{formatDate(item.ngayThi)}</strong> • Lúc <strong>{item.gioThi}</strong> ({item.thoiLuong} phút)
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <FileText size={14} color="#6366f1" />
                      <span>Hình thức: <strong>{item.hinhThuc}</strong></span>
                    </div>

                    {item.phongThi && (
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <MapPin size={14} color="#ec4899" />
                        <span>Phòng thi: <strong>{item.phongThi}</strong></span>
                      </div>
                    )}

                    {item.giamThi && (
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <User size={14} color="#059669" />
                        <span>Giám thị: <strong>{item.giamThi}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Knowledge scope */}
                  {item.phamViOnTap && (
                    <div
                      style={{
                        background: "var(--bg-muted)",
                        padding: "9px 12px",
                        borderRadius: 8,
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        borderLeft: "3px solid var(--primary)",
                        marginBottom: 10,
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>📖 Phạm vi ôn tập:</strong> {item.phamViOnTap}
                    </div>
                  )}

                  {item.ghiChu && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      💡 {item.ghiChu}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PublicLichThiPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 350, borderRadius: 16 }} />}>
        <PublicLichThiContent />
      </Suspense>
    </PublicLayout>
  );
}
