"use client";
import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  Star,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Info,
  Search,
  X,
  Sparkles,
  Tag,
} from "lucide-react";
import { formatDate } from "@/lib/format";

interface Event {
  id: number;
  tenSuKien: string;
  hangMuc: string | null;
  deadline: string | null;
  trangThai: string;
  members: { vaiTro: string; student: { hoTen: string } }[];
}

function SuKienInner() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const [activeLop, setActiveLop] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return urlLop || localStorage.getItem("admin_selected_class") || "12T2";
    }
    return urlLop || "12T2";
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Tất cả");

  useEffect(() => {
    if (urlLop && urlLop !== "ALL") setActiveLop(urlLop);
  }, [urlLop]);

  useEffect(() => {
    setLoading(true);
    fetch("/api/events?public=1")
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.data || d || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchStatus = filterStatus === "Tất cả" || e.trangThai === filterStatus;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        e.tenSuKien.toLowerCase().includes(q) ||
        (e.hangMuc && e.hangMuc.toLowerCase().includes(q)) ||
        e.members.some((m) => m.student.hoTen.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [events, filterStatus, search]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 0 40px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
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
            <Star size={14} /> Phong trào & Hoạt động
          </div>
          <h1 style={{ color: "white", fontSize: "1.9rem", fontWeight: 900, margin: "0 0 6px" }}>
            Sự Kiện & Phong Trào Lớp {activeLop}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem", margin: 0 }}>
            Kế hoạch hoạt động, thời hạn hoàn thành và danh sách phân công nhân sự phụ trách
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          padding: "16px 20px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            className="input"
            style={{ paddingLeft: 40, height: 42, borderRadius: 12, border: "1.5px solid #cbd5e1", fontSize: "0.88rem" }}
            placeholder="🔍 Tìm tên sự kiện, hạng mục hoặc học sinh phụ trách..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Tất cả", "Sắp diễn ra", "Đang diễn ra", "Đã xong"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                border: filterStatus === st ? "2px solid #d97706" : "1.5px solid #e2e8f0",
                background: filterStatus === st ? "#fef3c7" : "#ffffff",
                color: filterStatus === st ? "#b45309" : "#475569",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 18 }} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: "50px 20px",
            textAlign: "center",
            border: "2px dashed #cbd5e1",
          }}
        >
          <Star size={44} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#1e293b", margin: "0 0 4px" }}>
            Chưa có sự kiện nào phù hợp
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
            Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 18 }}>
          {filteredEvents.map((e) => (
            <div
              key={e.id}
              style={{
                background: "#ffffff",
                borderRadius: 18,
                border: "1.5px solid #e2e8f0",
                padding: "20px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 14,
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(el) => {
                el.currentTarget.style.transform = "translateY(-3px)";
                el.currentTarget.style.boxShadow = "0 8px 24px rgba(217, 119, 6, 0.12)";
                el.currentTarget.style.borderColor = "#fcd34d";
              }}
              onMouseLeave={(el) => {
                el.currentTarget.style.transform = "translateY(0)";
                el.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
                el.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <h3 style={{ fontSize: "1.08rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    {e.tenSuKien}
                  </h3>
                  <span
                    className={`badge ${
                      e.trangThai === "Đã xong"
                        ? "badge-success"
                        : e.trangThai === "Đang diễn ra"
                        ? "badge-warning"
                        : "badge-info"
                    }`}
                    style={{ fontSize: "0.72rem" }}
                  >
                    {e.trangThai}
                  </span>
                </div>

                {e.hangMuc && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "#64748b", background: "#f8fafc", padding: "3px 8px", borderRadius: 6, border: "1px solid #e2e8f0", marginBottom: 12 }}>
                    <Tag size={12} /> Hạng mục: <strong style={{ color: "#334155" }}>{e.hangMuc}</strong>
                  </div>
                )}

                {e.deadline && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#dc2626", fontWeight: 700 }}>
                    <Clock size={14} /> Hạn chót: {formatDate(e.deadline)}
                  </div>
                )}
              </div>

              {e.members && e.members.length > 0 && (
                <div style={{ borderTop: "1.5px dashed #f1f5f9", paddingTop: 12 }}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>
                    Nhân sự phụ trách:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {e.members.map((m, mIdx) => (
                      <span
                        key={mIdx}
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#0369a1",
                          background: "#e0f2fe",
                          border: "1px solid #bae6fd",
                          padding: "3px 8px",
                          borderRadius: 8,
                        }}
                      >
                        {m.student.hoTen} ({m.vaiTro})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SuKienPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 400, borderRadius: 20 }} />}>
        <SuKienInner />
      </Suspense>
    </PublicLayout>
  );
}
