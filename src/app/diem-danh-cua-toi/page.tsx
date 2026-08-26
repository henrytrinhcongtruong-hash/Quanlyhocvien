"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  BookOpen, Search, CheckCircle, AlertCircle, Clock,
  Calendar as CalendarIcon, Filter,
} from "lucide-react";
import { formatDate } from "@/lib/format";

interface Student {
  id: number;
  hoTen: string;
  to: number;
  lop: string;
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
      return urlLop || localStorage.getItem("admin_selected_class") || "11AT3";
    }
    return urlLop || "11AT3";
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlLop && urlLop !== "ALL") setActiveLop(urlLop);
  }, [urlLop]);

  useEffect(() => {
    const lopQuery = activeLop && activeLop !== "ALL" ? `?lop=${activeLop}` : "";
    fetch(`/api/students${lopQuery}`).then(r => r.json()).then(d => setStudents(d.data || []));
  }, [activeLop]);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    fetch(`/api/attendance?studentId=${selectedStudentId}`)
      .then(r => r.json())
      .then(d => {
        setRecords(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedStudentId]);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>Tra cứu Điểm danh cá nhân (Lớp {activeLop})</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Xem lại lịch sử vắng, trễ và các ghi chú của giáo viên
        </p>
      </div>

      {/* Student Selector */}
      <div className="card" style={{ padding: "24px", marginBottom: 24 }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={18} color="var(--primary)" /> Chọn học sinh Lớp {activeLop}
        </h3>
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

        {loading && (
          <div style={{ marginTop: 16 }}>
            <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />
          </div>
        )}

        {!loading && selectedStudentId && records.length === 0 && (
          <div style={{ marginTop: 20, padding: 24, textAlign: "center", background: "var(--bg-muted)", borderRadius: 10 }}>
            <CheckCircle size={32} color="var(--success)" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontWeight: 600, color: "var(--success)" }}>Chuyên cần tốt!</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
              Học sinh chưa có lượt vắng hay đi trễ nào được ghi nhận.
            </p>
          </div>
        )}

        {!loading && selectedStudentId && records.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Loại vi phạm</th>
                  <th>Lý do / Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{formatDate(r.ngay)}</td>
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
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      {r.ghiChu || "—"}
                    </td>
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

export default function PublicDiemDanhCuaToiPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 200 }} />}>
        <DiemDanhCuaToiInner />
      </Suspense>
    </PublicLayout>
  );
}
