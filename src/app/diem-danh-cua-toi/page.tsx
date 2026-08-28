"use client";
import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  BookOpen,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar as CalendarIcon,
  Filter,
  User,
  X,
  Sparkles,
  ChevronRight,
  Award,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { TO_THEMES } from "@/lib/seatingTypes";

interface Student {
  id: number;
  hoTen: string;
  tenGoi?: string | null;
  to: number;
  lop: string;
  avatar?: string | null;
}

interface AttendanceRecord {
  id: number;
  ngay: string;
  loai: string;
  ghiChu: string | null;
}

function DiemDanhCuaToiInner() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const [activeLop, setActiveLop] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return urlLop || localStorage.getItem("admin_selected_class") || "12T2";
    }
    return urlLop || "12T2";
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTo, setFilterTo] = useState(0);

  useEffect(() => {
    if (urlLop && urlLop !== "ALL") setActiveLop(urlLop);
  }, [urlLop]);

  useEffect(() => {
    const lopQuery = activeLop && activeLop !== "ALL" ? `?lop=${activeLop}` : "";
    fetch(`/api/students${lopQuery}`)
      .then((r) => r.json())
      .then((d) => setStudents(d.data || []));
  }, [activeLop]);

  useEffect(() => {
    if (!selectedStudentId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    fetch(`/api/attendance?studentId=${selectedStudentId}`)
      .then((r) => r.json())
      .then((d) => {
        setRecords(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedStudentId]);

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchTo = filterTo === 0 || s.to === filterTo;
      const q = searchStudent.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.hoTen.toLowerCase().includes(q) ||
        (s.tenGoi && s.tenGoi.toLowerCase().includes(q));
      return matchTo && matchSearch;
    });
  }, [students, filterTo, searchStudent]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 0 40px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #059669 0%, #10b981 50%, #0284c7 100%)",
          borderRadius: 22,
          padding: "28px 28px 24px",
          color: "white",
          marginBottom: 24,
          boxShadow: "0 10px 30px rgba(16, 185, 129, 0.2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
            <BookOpen size={14} /> Tra cứu chuyên cần trực tuyến
          </div>
          <h1 style={{ color: "white", fontSize: "1.9rem", fontWeight: 900, margin: "0 0 6px" }}>
            Điểm Danh & Chuyên Cần Lớp {activeLop}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem", margin: 0 }}>
            Nhập tên học sinh để xem lịch sử có mặt, vắng phép, không phép hoặc đi trễ
          </p>
        </div>
      </div>

      {/* Student Search & Quick Select Panel */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          padding: "24px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={18} color="#10b981" /> Tìm kiếm học sinh cần tra cứu (Lớp {activeLop})
        </h2>

        {/* Live Search Bar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
            <Search size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              className="input"
              style={{ paddingLeft: 42, height: 46, borderRadius: 12, border: "1.5px solid #cbd5e1", fontSize: "0.92rem" }}
              placeholder="🔍 Gõ tên học sinh để tra cứu..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
            />
            {searchStudent && (
              <button
                type="button"
                onClick={() => setSearchStudent("")}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Tổ filter pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setFilterTo(0)}
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                border: filterTo === 0 ? "2px solid #10b981" : "1.5px solid #e2e8f0",
                background: filterTo === 0 ? "#dcfce7" : "#ffffff",
                color: filterTo === 0 ? "#15803d" : "#475569",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              Tất cả tổ
            </button>
            {[1, 2, 3, 4].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTo(t)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  border: filterTo === t ? "2px solid #10b981" : "1.5px solid #e2e8f0",
                  background: filterTo === t ? "#dcfce7" : "#ffffff",
                  color: filterTo === t ? "#15803d" : "#475569",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Tổ {t}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Student Chips Selection */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
            maxHeight: 280,
            overflowY: "auto",
            padding: "4px 2px",
          }}
        >
          {filteredStudents.map((st) => {
            const isSelected = selectedStudentId === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStudentId(st.id)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: isSelected ? "2px solid #10b981" : "1.5px solid #e2e8f0",
                  background: isSelected ? "#ecfdf5" : "#f8fafc",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 4px 12px rgba(16, 185, 129, 0.18)" : "none",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: isSelected ? "#065f46" : "#0f172a" }}>
                    {st.hoTen}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Tổ {st.to} {st.tenGoi ? `• "${st.tenGoi}"` : ""}
                  </div>
                </div>
                {isSelected ? (
                  <CheckCircle size={18} color="#10b981" />
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "#0284c7", fontWeight: 700 }}>Chọn →</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Student Attendance Details Panel */}
      {selectedStudent && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 22,
            padding: "26px",
            border: "1.5px solid #e2e8f0",
            boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #f1f5f9", paddingBottom: 16, marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "#dcfce7",
                  border: "2px solid #bbf7d0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "1.2rem",
                  color: "#15803d",
                  overflow: "hidden",
                }}
              >
                {selectedStudent.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedStudent.avatar} alt={selectedStudent.hoTen} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  selectedStudent.hoTen.substring(0, 2)
                )}
              </div>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a", margin: "0 0 2px" }}>
                  {selectedStudent.hoTen}
                </h2>
                <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
                  Tổ {selectedStudent.to} • Lớp {selectedStudent.lop}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 800 }}>
                Tổng ghi nhận: {records.length} buổi
              </span>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
          ) : records.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", background: "#f0fdf4", borderRadius: 16, border: "1.5px solid #bbf7d0" }}>
              <Award size={42} color="#16a34a" style={{ margin: "0 auto 10px" }} />
              <h3 style={{ fontWeight: 900, color: "#15803d", fontSize: "1.1rem", margin: "0 0 4px" }}>
                Chuyên cần xuất sắc 100%!
              </h3>
              <p style={{ color: "#166534", fontSize: "0.88rem", margin: 0 }}>
                Học sinh chưa có lượt vắng hay đi trễ nào được ghi nhận trong học kỳ.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Ngày ghi nhận</th>
                    <th>Loại tình trạng</th>
                    <th>Lý do / Ghi chú của giáo viên</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>{formatDate(r.ngay)}</td>
                      <td>
                        <span
                          className={`badge ${
                            r.loai === "Vắng có phép"
                              ? "badge-warning"
                              : r.loai === "Vắng không phép"
                              ? "badge-danger"
                              : "badge-info"
                          }`}
                        >
                          {r.loai}
                        </span>
                      </td>
                      <td style={{ color: "#475569", fontSize: "0.88rem" }}>
                        {r.ghiChu || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DiemDanhCuaToiPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 400, borderRadius: 20 }} />}>
        <DiemDanhCuaToiInner />
      </Suspense>
    </PublicLayout>
  );
}
