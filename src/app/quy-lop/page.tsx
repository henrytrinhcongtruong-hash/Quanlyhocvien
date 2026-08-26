"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  Wallet, TrendingUp, AlertCircle, CheckCircle, XCircle,
  Search, ArrowDownRight, ArrowUpRight,
} from "lucide-react";
import { formatVND, formatDate } from "@/lib/format";

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
  to: number;
  lop: string;
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
      return urlLop || localStorage.getItem("admin_selected_class") || "11AT3";
    }
    return urlLop || "11AT3";
  });

  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [loadingFee, setLoadingFee] = useState(false);

  useEffect(() => {
    if (urlLop && urlLop !== "ALL") setActiveLop(urlLop);
  }, [urlLop]);

  useEffect(() => {
    const lopQuery = activeLop && activeLop !== "ALL" ? `?lop=${activeLop}` : "";
    fetch(`/api/fees/summary${lopQuery}`).then(r => r.json()).then(setSummary);
    fetch(`/api/students${lopQuery}`).then(r => r.json()).then(d => setStudents(d.data || []));
  }, [activeLop]);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoadingFee(true);
    fetch(`/api/fees?studentId=${selectedStudentId}`)
      .then(r => r.json())
      .then(d => {
        setStudentFees(d.data || []);
        setLoadingFee(false);
      });
  }, [selectedStudentId]);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>Công khai Quỹ Lớp {activeLop}</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Minh bạch mọi khoản thu chi và tình hình đóng quỹ học sinh
        </p>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="kpi-number" style={{ color: "var(--success)" }}>
                  {formatVND(summary.tongThu)}
                </div>
                <div className="kpi-label">Tổng quỹ đã thu ({activeLop})</div>
              </div>
              <ArrowDownRight size={24} color="var(--success)" opacity={0.7} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8 }}>
              {summary.soHSDaDong} / {summary.tongHS} học sinh đã đóng
            </div>
          </div>

          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="kpi-number" style={{ color: "var(--danger)" }}>
                  {formatVND(summary.tongChi)}
                </div>
                <div className="kpi-label">Tổng đã chi</div>
              </div>
              <ArrowUpRight size={24} color="var(--danger)" opacity={0.7} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8 }}>
              {summary.chiTheoHangMuc?.length || 0} hạng mục chi
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "20px",
              background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(213,80%,58%) 100%)",
              border: "none",
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
              Số dư quỹ hiện tại
            </div>
            <div style={{ color: "white", fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>
              {formatVND(summary.conLai)}
            </div>
          </div>
        </div>
      )}

      {/* Tra cứu cá nhân */}
      <div className="card" style={{ padding: "24px", marginBottom: 28 }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={18} color="var(--primary)" />
          Tra cứu tình trạng đóng quỹ cá nhân (Lớp {activeLop})
        </h2>
        <div style={{ maxWidth: 360 }}>
          <select
            className="select"
            value={selectedStudentId || ""}
            onChange={(e) => setSelectedStudentId(Number(e.target.value) || null)}
          >
            <option value="">-- Chọn tên học sinh --</option>
            {[1, 2, 3, 4].map(to => {
              const toStudents = students.filter(s => s.to === to);
              if (toStudents.length === 0) return null;
              return (
                <optgroup key={to} label={`Tổ ${to}`}>
                  {toStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.hoTen} (Tổ {s.to})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        {loadingFee && (
          <div style={{ marginTop: 16 }}>
            <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />
          </div>
        )}

        {!loadingFee && selectedStudentId && studentFees.length > 0 && (
          <div style={{ marginTop: 16 }}>
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
                    <td style={{ fontWeight: 600 }}>{f.kyThu}</td>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>{formatVND(f.soTien)}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{f.hinhThucDong}</td>
                    <td>
                      <span className={`badge ${f.trangThai === "Đã Đóng" ? "badge-success" : "badge-danger"}`}>
                        {f.trangThai === "Đã Đóng" ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {f.trangThai}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>{formatDate(f.ngayDong)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicQuyLopPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 200 }} />}>
        <QuyLopInner />
      </Suspense>
    </PublicLayout>
  );
}
