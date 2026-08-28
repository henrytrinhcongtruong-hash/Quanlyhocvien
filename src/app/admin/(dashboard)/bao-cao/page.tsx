"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BarChart3, TrendingUp, Users, Wallet, Calendar, Download,
  CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight, School,
} from "lucide-react";
import { formatVND } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface FeeSummary {
  tongThu: number;
  tongChi: number;
  conLai: number;
  soHSDaDong: number;
  tongHS: number;
  chiTheoHangMuc: { hangMucChi: string; total: number }[];
}

const COLORS = ["#105abc", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"];

export default function AdminBaoCaoPage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const { data: session } = useSession();

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "11AT3";

  const [filterLop, setFilterLop] = useState(() => {
    if (!isSuperAdmin && assignedLop) return assignedLop;
    return urlLop || "ALL";
  });
  const [classList, setClassList] = useState<string[]>(["11AT3", "12T2"]);
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Sync with URL query parameter or assignedLop
  useEffect(() => {
    if (!isSuperAdmin && assignedLop) {
      setFilterLop(assignedLop);
      return;
    }
    if (urlLop) setFilterLop(urlLop);
  }, [urlLop, isSuperAdmin, assignedLop]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const activeClass = !isSuperAdmin ? assignedLop : filterLop;
        const lopQuery = activeClass !== "ALL" ? `?lop=${activeClass}` : "";
        const [feeRes, attRes, classRes] = await Promise.all([
          fetch(`/api/fees/summary${lopQuery}`),
          fetch(`/api/attendance${lopQuery}`),
          fetch("/api/classes"),
        ]);
        const [feeData, attData, classData] = await Promise.all([
          feeRes.json(), attRes.json(), classRes.json(),
        ]);

        setSummary(feeData);
        if (classData.data && classData.data.length > 0) setClassList(classData.data);

        // Calculate attendance breakdown
        const counts: Record<string, number> = {
          "Vắng có phép": 0,
          "Vắng không phép": 0,
          "Đi trễ": 0,
        };
        for (const item of (attData.data || [])) {
          if (counts[item.loai] !== undefined) counts[item.loai]++;
        }
        setAttendanceStats(counts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [filterLop]);

  const attPieData = [
    { name: "Vắng có phép", value: attendanceStats["Vắng có phép"] || 0, color: "#f59e0b" },
    { name: "Vắng không phép", value: attendanceStats["Vắng không phép"] || 0, color: "#ef4444" },
    { name: "Đi trễ", value: attendanceStats["Đi trễ"] || 0, color: "#105abc" },
  ].filter(d => d.value > 0);

  const feeBarData = summary ? [
    { name: "Tổng thu", amount: summary.tongThu },
    { name: "Tổng chi", amount: summary.tongChi },
    { name: "Số dư quỹ", amount: Math.max(0, summary.conLai) },
  ] : [];

  return (
    <div className="animate-fade-in">
      {/* Header with Class Selector */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: 4 }}>
            Báo cáo & Thống kê {filterLop !== "ALL" ? `— Lớp ${filterLop}` : "Toàn trường"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Tổng hợp tình hình tài chính quỹ lớp và chuyên cần học sinh
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            className="select"
            style={{ width: 170, fontWeight: 700, color: "var(--primary)" }}
            value={filterLop}
            onChange={(e) => setFilterLop(e.target.value)}
          >
            <option value="ALL">🏫 Tất cả các lớp</option>
            {classList.map(c => (
              <option key={c} value={c}>Lớp {c}</option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => window.open("/api/fees/export", "_blank")}>
            <Download size={14} /> Export Báo cáo quỹ
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="kpi-number" style={{ color: "var(--success)" }}>{formatVND(summary.tongThu)}</div>
                    <div className="kpi-label">Tổng quỹ đã thu {filterLop !== "ALL" ? `(${filterLop})` : ""}</div>
                  </div>
                  <ArrowDownRight size={24} color="var(--success)" opacity={0.7} />
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 }}>
                  {summary.soHSDaDong} / {summary.tongHS} học sinh đã đóng
                </div>
              </div>

              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="kpi-number" style={{ color: "var(--danger)" }}>{formatVND(summary.tongChi)}</div>
                    <div className="kpi-label">Tổng đã chi tiêu</div>
                  </div>
                  <ArrowUpRight size={24} color="var(--danger)" opacity={0.7} />
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 }}>
                  {summary.chiTheoHangMuc?.length || 0} hạng mục chi
                </div>
              </div>

              <div className="card" style={{ padding: "18px 20px", background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(213,80%,58%) 100%)", border: "none" }}>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                  Số dư quỹ hiện tại {filterLop !== "ALL" ? `(${filterLop})` : ""}
                </div>
                <div style={{ color: "white", fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>
                  {formatVND(summary.conLai)}
                </div>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16, marginBottom: 24 }}>
            {/* Financial Overview */}
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Cân đối Thu — Chi — Số dư quỹ</h3>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={feeBarData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} tickFormatter={(v) => `${v / 1000000}M`} />
                    <Tooltip formatter={(value: unknown) => [formatVND(Number(value)), "Số tiền"]} />
                    <Bar dataKey="amount" fill="#105abc" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance Breakdown */}
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Cơ cấu Chuyên cần & Vi phạm</h3>
              <div style={{ width: "100%", height: 260 }}>
                {attPieData.length === 0 ? (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    Chưa có lượt vắng/trễ nào
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {attPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown, name: unknown) => [`${value} lượt`, name as string]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Expense breakdown table */}
          {summary && summary.chiTheoHangMuc && summary.chiTheoHangMuc.length > 0 && (
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Phân bổ chi tiêu theo Hạng mục</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Hạng mục chi</th>
                    <th style={{ textAlign: "right" }}>Số tiền</th>
                    <th style={{ textAlign: "right" }}>Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.chiTheoHangMuc.map((item, idx) => {
                    const pct = summary.tongChi > 0 ? ((item.total / summary.tongChi) * 100).toFixed(1) : "0";
                    return (
                      <tr key={idx}>
                        <td style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{item.hangMucChi}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--danger)" }}>
                          {formatVND(item.total)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="badge badge-neutral">{pct}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
