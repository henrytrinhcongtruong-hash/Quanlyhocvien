"use client";
import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  User,
  X,
  CreditCard,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatVND, formatDate } from "@/lib/format";
import { TO_THEMES } from "@/lib/seatingTypes";

interface FeeSummary {
  tongThu: number;
  tongChi: number;
  conLai: number;
  soHSDaDong: number;
  tongHS: number;
  chiTheoHangMuc: { hangMucChi: string; total: number }[];
}

interface Student {
  id: number;
  hoTen: string;
  tenGoi?: string | null;
  to: number;
  lop: string;
  avatar?: string | null;
}

interface StudentFee {
  kyThu: string;
  soTien: number;
  hinhThucDong: string;
  trangThai: string;
  ngayDong: string | null;
}

function QuyLopInner() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const [activeLop, setActiveLop] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return urlLop || localStorage.getItem("admin_selected_class") || "12T2";
    }
    return urlLop || "12T2";
  });

  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [loadingFee, setLoadingFee] = useState(false);
  const [filterTo, setFilterTo] = useState(0);

  useEffect(() => {
    if (urlLop && urlLop !== "ALL") setActiveLop(urlLop);
  }, [urlLop]);

  useEffect(() => {
    const lopQuery = activeLop && activeLop !== "ALL" ? `?lop=${activeLop}` : "";
    fetch(`/api/fees/summary${lopQuery}`).then((r) => r.json()).then(setSummary);
    fetch(`/api/students${lopQuery}`).then((r) => r.json()).then((d) => setStudents(d.data || []));
  }, [activeLop]);

  useEffect(() => {
    if (!selectedStudentId) {
      setStudentFees([]);
      return;
    }
    setLoadingFee(true);
    fetch(`/api/fees?studentId=${selectedStudentId}`)
      .then((r) => r.json())
      .then((d) => {
        setStudentFees(d.data || []);
        setLoadingFee(false);
      });
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
          background: "linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%)",
          borderRadius: 22,
          padding: "28px 28px 24px",
          color: "white",
          marginBottom: 24,
          boxShadow: "0 10px 30px rgba(2, 132, 199, 0.2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
            <Wallet size={14} /> Minh bạch tài chính lớp học
          </div>
          <h1 style={{ color: "white", fontSize: "1.9rem", fontWeight: 900, margin: "0 0 6px" }}>
            Công Khai Quỹ Lớp {activeLop}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem", margin: 0 }}>
            Theo dõi minh bạch toàn bộ các khoản thu, chi và tình hình đóng quỹ của từng học sinh
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 26 }}>
          <div style={{ background: "#ffffff", border: "1.5px solid #bbf7d0", borderRadius: 18, padding: "20px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#16a34a", fontSize: "1.7rem", fontWeight: 900 }}>
                  {formatVND(summary.tongThu)}
                </div>
                <div style={{ color: "#475569", fontSize: "0.82rem", fontWeight: 700, marginTop: 4 }}>
                  Tổng quỹ đã thu ({activeLop})
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArrowDownRight size={24} color="#16a34a" />
              </div>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#15803d", fontWeight: 700, marginTop: 10 }}>
              ✓ {summary.soHSDaDong} / {summary.tongHS} học sinh đã đóng đủ
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1.5px solid #fecaca", borderRadius: 18, padding: "20px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#dc2626", fontSize: "1.7rem", fontWeight: 900 }}>
                  {formatVND(summary.tongChi)}
                </div>
                <div style={{ color: "#475569", fontSize: "0.82rem", fontWeight: 700, marginTop: 4 }}>
                  Tổng chi phí đã sử dụng
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArrowUpRight size={24} color="#dc2626" />
              </div>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#b91c1c", fontWeight: 700, marginTop: 10 }}>
              {summary.chiTheoHangMuc?.length || 0} khoản chi được phê duyệt
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", borderRadius: 18, padding: "20px", color: "white", boxShadow: "0 8px 24px rgba(2,132,199,0.25)" }}>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase" }}>
              Số dư quỹ hiện tại
            </div>
            <div style={{ color: "white", fontSize: "1.8rem", fontWeight: 900, marginTop: 6 }}>
              {formatVND(summary.conLai)}
            </div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.82rem", marginTop: 8 }}>
              Sẵn sàng cho các hoạt động lớp
            </div>
          </div>
        </div>
      )}

      {/* Tra Cứu Đóng Quỹ Cá Nhân Panel With Live Search */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 22,
          padding: "24px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          marginBottom: 26,
        }}
      >
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={18} color="#0284c7" />
          Tra cứu tình trạng đóng quỹ cá nhân (Lớp {activeLop})
        </h2>

        {/* Live Search Bar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
            <Search size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              className="input"
              style={{ paddingLeft: 42, height: 46, borderRadius: 12, border: "1.5px solid #cbd5e1", fontSize: "0.92rem" }}
              placeholder="🔍 Gõ tên học sinh để tra cứu đóng quỹ..."
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
                border: filterTo === 0 ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                background: filterTo === 0 ? "#e0f2fe" : "#ffffff",
                color: filterTo === 0 ? "#0369a1" : "#475569",
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
                  border: filterTo === t ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                  background: filterTo === t ? "#e0f2fe" : "#ffffff",
                  color: filterTo === t ? "#0369a1" : "#475569",
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
            maxHeight: 260,
            overflowY: "auto",
            padding: "4px 2px",
            marginBottom: selectedStudent ? 20 : 0,
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
                  border: isSelected ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                  background: isSelected ? "#f0f9ff" : "#f8fafc",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 4px 12px rgba(2, 132, 199, 0.18)" : "none",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: isSelected ? "#0369a1" : "#0f172a" }}>
                    {st.hoTen}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Tổ {st.to} {st.tenGoi ? `• "${st.tenGoi}"` : ""}
                  </div>
                </div>
                {isSelected ? (
                  <CheckCircle size={18} color="#0284c7" />
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "#0284c7", fontWeight: 700 }}>Chọn →</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Student Payment Details */}
        {selectedStudent && (
          <div style={{ borderTop: "1.5px solid #f1f5f9", paddingTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#0369a1" }}>
                {selectedStudent.hoTen.substring(0, 2)}
              </div>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Lịch sử đóng quỹ: {selectedStudent.hoTen}
                </h3>
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  Tổ {selectedStudent.to} • Lớp {selectedStudent.lop}
                </div>
              </div>
            </div>

            {loadingFee ? (
              <div className="skeleton" style={{ height: 80, borderRadius: 12 }} />
            ) : studentFees.length === 0 ? (
              <div style={{ padding: "20px", background: "#f8fafc", borderRadius: 12, textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
                Chưa có dữ liệu đóng quỹ ghi nhận cho học sinh này.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kỳ thu</th>
                      <th>Số tiền</th>
                      <th>Hình thức</th>
                      <th>Trạng thái</th>
                      <th>Ngày đóng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentFees.map((f, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: "#0f172a" }}>{f.kyThu}</td>
                        <td style={{ fontWeight: 800, color: "#0369a1" }}>{formatVND(f.soTien)}</td>
                        <td style={{ color: "#475569" }}>{f.hinhThucDong}</td>
                        <td>
                          <span className={`badge ${f.trangThai === "Đã Đóng" ? "badge-success" : "badge-danger"}`}>
                            {f.trangThai === "Đã Đóng" ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {f.trangThai}
                          </span>
                        </td>
                        <td style={{ color: "#64748b", fontSize: "0.85rem" }}>
                          {formatDate(f.ngayDong)}
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

      {/* Chi tiết các khoản chi theo hạng mục */}
      {summary?.chiTheoHangMuc && summary.chiTheoHangMuc.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 22,
            padding: "24px",
            border: "1.5px solid #e2e8f0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginBottom: 16 }}>
            Báo cáo chi tiết các hạng mục chi tiêu
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {summary.chiTheoHangMuc.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "14px 16px",
                  background: "#f8fafc",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" }}>
                  {item.hangMucChi}
                </span>
                <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "#dc2626" }}>
                  {formatVND(item.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuyLopPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 400, borderRadius: 20 }} />}>
        <QuyLopInner />
      </Suspense>
    </PublicLayout>
  );
}
