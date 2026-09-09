"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Wallet, TrendingUp, ArrowDownRight, ArrowUpRight, Download,
  CheckCircle, AlertCircle, Search, Filter, ArrowUpDown, X,
  Layers, ChevronRight, PieChart as PieIcon, BarChart3,
  Calendar, Users, ArrowUpAZ, ArrowDownAZ, CheckCircle2, XCircle,
} from "lucide-react";
import { formatVND, formatDate } from "@/lib/format";
import { compareVietnameseNames } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import ReportTabs from "@/components/admin/ReportTabs";

interface FeeSummary {
  tongThu: number;
  tongChi: number;
  conLai: number;
  soHSDaDong: number;
  tongHS: number;
  chiTheoHangMuc: { hangMucChi: string; total: number }[];
}

interface FeeRecordItem {
  id: number;
  studentId: number;
  kyThu: string;
  soTien: number;
  trangThai: string;
  ngayDong: string | null;
  ghiChu: string | null;
  student: {
    id: number;
    hoTen: string;
    tenGoi: string | null;
    to: number;
    lop: string;
  };
}

const CATEGORY_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#64748b",
];

function formatShortVND(num: number): string {
  if (num === 0) return "0đ";
  if (num >= 1_000_000) {
    const val = num / 1_000_000;
    return `${Number.isInteger(val) ? val : val.toFixed(1)}Tr`;
  }
  if (num >= 1_000) {
    const val = num / 1_000;
    return `${Number.isInteger(val) ? val : val.toFixed(0)}k`;
  }
  return `${num}đ`;
}

export default function AdminBaoCaoThuChiPage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const { data: session } = useSession();

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";

  const [filterLop, setFilterLop] = useState(() => {
    if (!isSuperAdmin && assignedLop) return assignedLop;
    return urlLop || "12T2";
  });
  const [classList, setClassList] = useState<string[]>(["12T2", "11AT3"]);
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [feesList, setFeesList] = useState<FeeRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter controls for student fee list
  const [feeSearch, setFeeSearch] = useState("");
  const [feeTrangThai, setFeeTrangThai] = useState("ALL");
  const [feeTo, setFeeTo] = useState("ALL");
  const [filterKyThu, setFilterKyThu] = useState("ALL");
  const [feeSort, setFeeSort] = useState<"name_asc" | "name_desc" | "status" | "to_asc">("to_asc");

  // Sync with URL query parameter or assignedLop
  useEffect(() => {
    if (!isSuperAdmin && assignedLop) {
      setFilterLop(assignedLop);
      return;
    }
    if (urlLop) setFilterLop(urlLop);
  }, [urlLop, isSuperAdmin, assignedLop]);

  // Fetch report data
  const fetchData = async () => {
    setLoading(true);
    try {
      const activeClass = !isSuperAdmin ? assignedLop : filterLop;
      const lopQuery = activeClass !== "ALL" ? `?lop=${encodeURIComponent(activeClass)}` : "";

      const [summaryRes, feesRes, classRes] = await Promise.all([
        fetch(`/api/fees/summary${lopQuery}`),
        fetch(`/api/fees${lopQuery}`),
        fetch("/api/classes"),
      ]);

      const [summaryData, feesData, classData] = await Promise.all([
        summaryRes.json(),
        feesRes.json(),
        classRes.json(),
      ]);

      setSummary(summaryData);
      setFeesList(feesData.data || []);
      if (classData.data && classData.data.length > 0) setClassList(classData.data);
    } catch (e) {
      console.error("Fetch fee report data error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLop]);

  // List of available kyThu from data
  const availableKyThu = useMemo(() => {
    const setKy = new Set<string>();
    feesList.forEach((f) => {
      if (f.kyThu) setKy.add(f.kyThu);
    });
    return Array.from(setKy);
  }, [feesList]);

  // Filtered fee records
  const filteredFees = useMemo(() => {
    let list = feesList.filter((f) => {
      const matchKy = filterKyThu === "ALL" || f.kyThu === filterKyThu;
      const matchStatus = feeTrangThai === "ALL" || f.trangThai === feeTrangThai;
      const matchTo = feeTo === "ALL" || f.student.to.toString() === feeTo;
      const matchSearch =
        !feeSearch ||
        f.student.hoTen.toLowerCase().includes(feeSearch.toLowerCase()) ||
        (f.student.tenGoi && f.student.tenGoi.toLowerCase().includes(feeSearch.toLowerCase()));
      return matchKy && matchStatus && matchTo && matchSearch;
    });

    if (feeSort === "name_asc") {
      list = [...list].sort((a, b) => compareVietnameseNames(a.student.hoTen, b.student.hoTen, "asc"));
    } else if (feeSort === "name_desc") {
      list = [...list].sort((a, b) => compareVietnameseNames(a.student.hoTen, b.student.hoTen, "desc"));
    } else if (feeSort === "status") {
      list = [...list].sort((a, b) => (a.trangThai === "Đã Đóng" ? -1 : 1));
    } else {
      // to_asc
      list = [...list].sort((a, b) => a.student.to - b.student.to || compareVietnameseNames(a.student.hoTen, b.student.hoTen, "asc"));
    }

    return list;
  }, [feesList, filterKyThu, feeTrangThai, feeTo, feeSearch, feeSort]);

  // Expense Category Bar Chart Data
  const expenseCategoryData = useMemo(() => {
    if (!summary?.chiTheoHangMuc || summary.chiTheoHangMuc.length === 0) return [];
    return summary.chiTheoHangMuc.map((item, idx) => ({
      hangMucChi: item.hangMucChi,
      total: item.total,
      percent: summary.tongChi > 0 ? ((item.total / summary.tongChi) * 100).toFixed(1) : "0",
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [summary]);

  // Fund Flow Pie Data (Chi vs Tồn quỹ)
  const fundFlowPieData = useMemo(() => {
    if (!summary) return [];
    const data = [];
    if (summary.tongChi > 0) {
      data.push({ name: "Đã chi tiêu", value: summary.tongChi, color: "#ef4444" });
    }
    if (summary.conLai > 0) {
      data.push({ name: "Số dư tồn quỹ", value: summary.conLai, color: "#10b981" });
    }
    return data;
  }, [summary]);

  const completionRate = useMemo(() => {
    if (!summary || !summary.tongHS) return "0";
    return ((summary.soHSDaDong / summary.tongHS) * 100).toFixed(1);
  }, [summary]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* ====== HEADER & GLOBAL CONTROLS ====== */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 4, color: "var(--text-primary)" }}>
            Báo cáo Thu - Chi & Quỹ lớp {filterLop !== "ALL" ? `— Lớp ${filterLop}` : "Toàn trường"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Minh bạch tài chính: Tổng thu quỹ, phân bổ các hạng mục chi tiêu và danh sách đóng quỹ từng học sinh
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select
            className="select"
            style={{ width: 155, fontWeight: 700, color: "var(--primary)", minHeight: 38 }}
            value={filterLop}
            onChange={(e) => setFilterLop(e.target.value)}
          >
            <option value="ALL">🏫 Tất cả các lớp</option>
            {classList.map((c) => (
              <option key={c} value={c}>
                Lớp {c}
              </option>
            ))}
          </select>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => window.open(`/api/fees/export${filterLop !== "ALL" ? `?lop=${filterLop}` : ""}`, "_blank")}
            style={{ minHeight: 38, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Download size={14} /> Export Báo cáo quỹ
          </button>

          <Link
            href={`/admin/quy${filterLop !== "ALL" ? `?lop=${filterLop}` : ""}`}
            className="btn btn-primary btn-sm"
            style={{ minHeight: 38, display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(260,80%,58%) 100%)", textDecoration: "none" }}
          >
            <Wallet size={14} /> Quản lý Quỹ lớp
          </Link>
        </div>
      </div>

      {/* ====== SUB TABS NAVIGATION ====== */}
      <ReportTabs activeTab="thu-chi" filterLop={filterLop} />

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12, marginBottom: 20 }}>
          <div className="skeleton" style={{ height: 110, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 110, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 110, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 110, borderRadius: 12 }} />
        </div>
      ) : (
        <>
          {/* ====== KPI FINANCIAL OVERVIEW ====== */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12, marginBottom: 20 }}>
              {/* Thẻ 1: Tổng thu */}
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="kpi-number" style={{ color: "var(--success)" }}>
                      {formatVND(summary.tongThu)}
                    </div>
                    <div className="kpi-label">Tổng quỹ đã thu {filterLop !== "ALL" ? `(${filterLop})` : ""}</div>
                  </div>
                  <ArrowDownRight size={26} color="var(--success)" opacity={0.7} />
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                  <span>{summary.soHSDaDong} / {summary.tongHS} HS đã đóng</span>
                  <span style={{ fontWeight: 700, color: "var(--success)" }}>{completionRate}%</span>
                </div>
              </div>

              {/* Thẻ 2: Tổng chi */}
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="kpi-number" style={{ color: "var(--danger)" }}>
                      {formatVND(summary.tongChi)}
                    </div>
                    <div className="kpi-label">Tổng chi tiêu đã duyệt</div>
                  </div>
                  <ArrowUpRight size={26} color="var(--danger)" opacity={0.7} />
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 }}>
                  {summary.chiTheoHangMuc?.length || 0} hạng mục chi phát sinh
                </div>
              </div>

              {/* Thẻ 3: Số dư tồn quỹ */}
              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(260,80%,56%) 100%)",
                  border: "none",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                  Số dư quỹ hiện tại {filterLop !== "ALL" ? `(${filterLop})` : ""}
                </div>
                <div style={{ color: "white", fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>
                  {formatVND(summary.conLai)}
                </div>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.75rem", marginTop: 4 }}>
                  Tồn quỹ sẵn sàng sử dụng
                </div>
              </div>

              {/* Thẻ 4: Tỷ lệ sử dụng quỹ */}
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="kpi-number" style={{ color: "var(--primary)" }}>
                      {summary.tongThu > 0 ? ((summary.tongChi / summary.tongThu) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="kpi-label">Tỷ lệ giải ngân quỹ</div>
                  </div>
                  <TrendingUp size={26} color="var(--primary)" opacity={0.7} />
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 }}>
                  Đã chi trên tổng quỹ thu vào
                </div>
              </div>
            </div>
          )}

          {/* ====== CHARTS SECTION ====== */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14, marginBottom: 20 }}>
            {/* Chart 1: Biểu đồ Chi tiêu theo Hạng mục */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <BarChart3 size={16} color="var(--primary)" /> Chi tiêu theo Hạng mục
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Phân bổ cơ cấu các khoản chi của quỹ lớp
                  </div>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                  Tổng chi: <strong style={{ color: "var(--danger)", marginLeft: 4 }}>{formatVND(summary?.tongChi || 0)}</strong>
                </span>
              </div>

              <div style={{ width: "100%", height: 260 }}>
                {expenseCategoryData.length === 0 ? (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-muted)",
                      background: "#f8fafc",
                      borderRadius: 10,
                      border: "1px dashed var(--border)",
                    }}
                  >
                    <Wallet size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Chưa có dữ liệu chi tiêu theo hạng mục</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Các khoản chi sẽ tự động hiển thị tại đây</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseCategoryData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                      <XAxis
                        dataKey="hangMucChi"
                        stroke="#888888"
                        fontSize={11}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={11}
                        tickFormatter={(v) => formatShortVND(Number(v))}
                      />
                      <Tooltip
                        formatter={(value: unknown) => [
                          `${formatVND(Number(value))} (${summary && summary.tongChi > 0 ? ((Number(value) / summary.tongChi) * 100).toFixed(1) : 0}%)`,
                          "Số tiền",
                        ]}
                      />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                        {expenseCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Tỷ trọng Thu vs Chi & Tồn quỹ */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <PieIcon size={16} color="var(--primary)" /> Cân đối Thu - Chi Quỹ
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Tỷ lệ giữa số tiền đã giải ngân và số dư tồn quỹ
                  </div>
                </div>
                <span className="badge badge-info" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                  Tổng quỹ: {formatVND(summary?.tongThu || 0)}
                </span>
              </div>

              <div style={{ width: "100%", height: 260 }}>
                {fundFlowPieData.length === 0 ? (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    Chưa có số liệu quỹ lớp
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fundFlowPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {fundFlowPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: unknown, name: unknown) => [
                          `${formatVND(Number(value))} (${summary && summary.tongThu > 0 ? (((Number(value)) / summary.tongThu) * 100).toFixed(1) : 0}%)`,
                          name as string,
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* ====== TABLE 1: PHÂN BỔ CHI TIÊU THEO HẠNG MỤC ====== */}
          {summary && summary.chiTheoHangMuc && summary.chiTheoHangMuc.length > 0 && (
            <div className="card" style={{ padding: "22px 24px", marginBottom: 24, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: "1.08rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                    Phân bổ chi tiết chi tiêu theo Hạng mục
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "4px 0 0" }}>
                    Bảng tỷ trọng phân bổ dòng tiền và mức chi tiêu cụ thể từng khoản
                  </p>
                </div>
                <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                  {summary.chiTheoHangMuc.length} hạng mục chi
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>#</th>
                      <th>Hạng mục chi</th>
                      <th style={{ width: "30%" }}>Tỷ trọng chi</th>
                      <th style={{ textAlign: "right" }}>Tỷ lệ %</th>
                      <th style={{ textAlign: "right" }}>Số tiền đã chi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.chiTheoHangMuc.map((item, idx) => {
                      const pct = summary.tongChi > 0 ? ((item.total / summary.tongChi) * 100).toFixed(1) : "0";
                      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      return (
                        <tr key={idx}>
                          <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
                              {item.hangMucChi}
                            </div>
                          </td>
                          <td>
                            <div style={{ width: "100%", background: "#f1f5f9", borderRadius: 99, height: 8, overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 99 }} />
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            <span className="badge badge-neutral" style={{ fontSize: "0.78rem" }}>{pct}%</span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: "var(--danger)", fontSize: "0.95rem" }}>
                            {formatVND(item.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====== TABLE 2: DANH SÁCH HỌC SINH ĐÓNG QUỸ ====== */}
          <div className="card" style={{ padding: "22px 24px", marginBottom: 24, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.08rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Users size={18} color="var(--primary)" /> Danh sách tình hình đóng quỹ học sinh
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "4px 0 0" }}>
                  Theo dõi trạng thái đóng tiền quỹ của từng học sinh để đôn đốc và quản lý minh bạch
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge badge-info" style={{ fontWeight: 700, padding: "6px 14px" }}>
                  {filteredFees.length} học sinh
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.open(`/api/fees/export${filterLop !== "ALL" ? `?lop=${filterLop}` : ""}`, "_blank")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={13} /> Tải Excel
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              {/* Search box */}
              <div style={{ position: "relative", minWidth: 200, flex: "1 1 200px" }}>
                <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  className="input"
                  style={{ paddingLeft: 34, minHeight: 36 }}
                  placeholder="Tìm tên học sinh..."
                  value={feeSearch}
                  onChange={(e) => setFeeSearch(e.target.value)}
                />
                {feeSearch && (
                  <button
                    type="button"
                    onClick={() => setFeeSearch("")}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Lọc đợt thu / kỳ thu */}
              {availableKyThu.length > 0 && (
                <select
                  className="select"
                  style={{ width: 160, minHeight: 36 }}
                  value={filterKyThu}
                  onChange={(e) => setFilterKyThu(e.target.value)}
                >
                  <option value="ALL">Tất cả đợt thu</option>
                  {availableKyThu.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              )}

              {/* Lọc trạng thái đóng */}
              <select
                className="select"
                style={{ width: 160, minHeight: 36 }}
                value={feeTrangThai}
                onChange={(e) => setFeeTrangThai(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="Đã Đóng">🟢 Đã đóng</option>
                <option value="Chưa Đóng">🔴 Chưa đóng</option>
              </select>

              {/* Lọc theo tổ */}
              <select
                className="select"
                style={{ width: 130, minHeight: 36 }}
                value={feeTo}
                onChange={(e) => setFeeTo(e.target.value)}
              >
                <option value="ALL">Tất cả tổ</option>
                <option value="1">Tổ 1</option>
                <option value="2">Tổ 2</option>
                <option value="3">Tổ 3</option>
                <option value="4">Tổ 4</option>
              </select>

              {/* Sắp xếp */}
              <select
                className="select"
                style={{ width: 160, minHeight: 36, fontWeight: 600 }}
                value={feeSort}
                onChange={(e) => setFeeSort(e.target.value as any)}
              >
                <option value="to_asc">🔢 Theo Tổ & Tên</option>
                <option value="name_asc">🔤 Tên A → Z</option>
                <option value="name_desc">🔤 Tên Z → A</option>
                <option value="status">🟢 Đã đóng trước</option>
              </select>

              {(feeSearch || feeTrangThai !== "ALL" || feeTo !== "ALL" || filterKyThu !== "ALL") && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setFeeSearch("");
                    setFeeTrangThai("ALL");
                    setFeeTo("ALL");
                    setFilterKyThu("ALL");
                  }}
                  style={{ minHeight: 36 }}
                >
                  <X size={13} /> Bỏ lọc
                </button>
              )}
            </div>

            {/* Bảng danh sách đóng quỹ */}
            {filteredFees.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center", background: "#f8fafc", borderRadius: 10, border: "1px dashed var(--border)" }}>
                <CheckCircle size={36} color="#10b981" style={{ margin: "0 auto 8px", display: "block" }} />
                <p style={{ fontWeight: 700, color: "#065f46", fontSize: "0.95rem", margin: 0 }}>
                  Không tìm thấy hồ sơ đóng quỹ nào phù hợp với bộ lọc
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Hãy thử thay đổi điều kiện tìm kiếm hoặc chọn tất cả đợt thu.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>STT</th>
                      <th>Học sinh</th>
                      <th>Lớp</th>
                      <th>Tổ</th>
                      <th>Đợt thu</th>
                      <th style={{ textAlign: "right" }}>Số tiền</th>
                      <th style={{ textAlign: "center" }}>Trạng thái</th>
                      <th>Ngày đóng</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFees.map((item, idx) => {
                      const isPaid = item.trangThai === "Đã Đóng";
                      return (
                        <tr key={item.id}>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: isPaid ? "#ecfdf5" : "#fef2f2",
                                  color: isPaid ? "#059669" : "#dc2626",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  fontSize: "0.72rem",
                                  flexShrink: 0,
                                }}
                              >
                                {item.student.hoTen.substring(0, 1)}
                              </div>
                              <div>
                                <span style={{ color: "var(--text-primary)" }}>{item.student.hoTen}</span>
                                {item.student.tenGoi && (
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 6 }}>
                                    ({item.student.tenGoi})
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-info" style={{ fontWeight: 700, fontSize: "0.75rem" }}>
                              Lớp {item.student.lop}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                              Tổ {item.student.to}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            {item.kyThu}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: isPaid ? "var(--success)" : "var(--text-secondary)", fontSize: "0.92rem" }}>
                            {formatVND(item.soTien)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className={`badge ${isPaid ? "badge-success" : "badge-danger"}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                padding: "4px 10px",
                              }}
                            >
                              {isPaid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {item.trangThai}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                            {item.ngayDong ? formatDate(item.ngayDong) : "—"}
                          </td>
                          <td style={{ color: item.ghiChu ? "var(--text-primary)" : "var(--text-muted)", fontSize: "0.82rem" }}>
                            {item.ghiChu || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
