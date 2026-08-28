"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BarChart3, TrendingUp, Users, Wallet, Calendar as CalendarIcon, Download,
  CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight, School,
  Search, Filter, ArrowUpDown, ArrowUpAZ, ArrowDownAZ, X, Clock,
  XCircle, FileSpreadsheet, Sparkles, Check, ChevronDown, RefreshCw,
} from "lucide-react";
import { formatVND, formatDate } from "@/lib/format";
import { compareVietnameseNames } from "@/lib/utils";
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

interface StudentItem {
  id: number;
  hoTen: string;
  tenGoi: string | null;
  to: number;
  lop: string;
  gioiTinh?: string;
  avatar?: string | null;
}

interface AttendanceRecord {
  id: number;
  studentId: number;
  ngay: string;
  loai: string;
  ghiChu: string | null;
  student: { id: number; hoTen: string; tenGoi: string | null; to: number; lop: string; avatar?: string | null };
}

type TimeRangeType = "all" | "day" | "week" | "month" | "year";

export default function AdminBaoCaoPage() {
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
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [rawAttendance, setRawAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Time Range Filter states
  const [timeType, setTimeType] = useState<TimeRangeType>("month");
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedWeekPreset, setSelectedWeekPreset] = useState<"current" | "7days" | "last">("current");

  // Violation Table Local Filters
  const [violationSearch, setViolationSearch] = useState("");
  const [violationLoai, setViolationLoai] = useState("ALL");
  const [violationSort, setViolationSort] = useState<"date_desc" | "date_asc" | "name_asc" | "name_desc">("date_desc");

  // Sync with URL query parameter or assignedLop
  useEffect(() => {
    if (!isSuperAdmin && assignedLop) {
      setFilterLop(assignedLop);
      return;
    }
    if (urlLop) setFilterLop(urlLop);
  }, [urlLop, isSuperAdmin, assignedLop]);

  // Calculate Date Range (from, to, ngay) based on Time Filter
  const dateRange = useMemo(() => {
    const now = new Date();
    if (timeType === "day") {
      return { ngay: selectedDay, from: null, to: null, label: `Ngày ${formatDate(selectedDay)}` };
    }
    if (timeType === "week") {
      if (selectedWeekPreset === "7days") {
        const past7 = new Date();
        past7.setDate(now.getDate() - 6);
        const fromStr = past7.toISOString().split("T")[0];
        const toStr = now.toISOString().split("T")[0];
        return { ngay: null, from: fromStr, to: toStr, label: `7 ngày qua (${formatDate(fromStr)} - ${formatDate(toStr)})` };
      }
      // ISO week Monday -> Sunday
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      if (selectedWeekPreset === "last") {
        monday.setDate(monday.getDate() - 7);
        sunday.setDate(sunday.getDate() - 7);
      }

      const fromStr = monday.toISOString().split("T")[0];
      const toStr = sunday.toISOString().split("T")[0];
      const prefix = selectedWeekPreset === "last" ? "Tuần trước" : "Tuần này";
      return { ngay: null, from: fromStr, to: toStr, label: `${prefix} (${formatDate(fromStr)} - ${formatDate(toStr)})` };
    }
    if (timeType === "month") {
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split("T")[0];
      const lastDay = new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0];
      return { ngay: null, from: firstDay, to: lastDay, label: `Tháng ${selectedMonth}/${selectedYear}` };
    }
    if (timeType === "year") {
      const firstDay = `${selectedYear}-01-01`;
      const lastDay = `${selectedYear}-12-31`;
      return { ngay: null, from: firstDay, to: lastDay, label: `Năm ${selectedYear}` };
    }
    // "all"
    return { ngay: null, from: null, to: null, label: "Tất cả thời gian" };
  }, [timeType, selectedDay, selectedWeekPreset, selectedMonth, selectedYear]);

  // Fetch all report data
  const fetchData = async () => {
    setLoading(true);
    try {
      const activeClass = !isSuperAdmin ? assignedLop : filterLop;
      const lopQuery = activeClass !== "ALL" ? `&lop=${encodeURIComponent(activeClass)}` : "";
      const feeLopQuery = activeClass !== "ALL" ? `?lop=${encodeURIComponent(activeClass)}` : "";

      const attParams = new URLSearchParams();
      if (activeClass && activeClass !== "ALL") attParams.set("lop", activeClass);
      if (dateRange.ngay) attParams.set("ngay", dateRange.ngay);
      if (dateRange.from) attParams.set("from", dateRange.from);
      if (dateRange.to) attParams.set("to", dateRange.to);

      const [feeRes, stdRes, attRes, classRes] = await Promise.all([
        fetch(`/api/fees/summary${feeLopQuery}`),
        fetch(`/api/students${feeLopQuery}`),
        fetch(`/api/attendance?${attParams.toString()}`),
        fetch("/api/classes"),
      ]);

      const [feeData, stdData, attData, classData] = await Promise.all([
        feeRes.json(),
        stdRes.json(),
        attRes.json(),
        classRes.json(),
      ]);

      setSummary(feeData);
      setStudents(stdData.data || []);
      setRawAttendance(attData.data || []);
      if (classData.data && classData.data.length > 0) setClassList(classData.data);
    } catch (e) {
      console.error("Fetch report data error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLop, dateRange]);

  // Attendance Breakdown Statistics with all 4 items
  const attendanceBreakdown = useMemo(() => {
    const totalStudents = students.length || (filterLop === "12T2" ? 55 : filterLop === "11AT3" ? 45 : 100);

    const vangCoPhep = rawAttendance.filter((r) => r.loai === "Vắng có phép").length;
    const vangKhongPhep = rawAttendance.filter((r) => r.loai === "Vắng không phép").length;
    const diTre = rawAttendance.filter((r) => r.loai === "Đi trễ").length;
    const totalAbsences = vangCoPhep + vangKhongPhep;

    // Determine unique dates recorded
    const uniqueDates = new Set(rawAttendance.map((r) => r.ngay.split("T")[0]));
    const dayMultiplier = timeType === "day" ? 1 : Math.max(1, uniqueDates.size);

    const totalSessions = totalStudents * dayMultiplier;
    const coMat = Math.max(0, totalSessions - totalAbsences);
    const totalEvents = coMat + vangCoPhep + vangKhongPhep + diTre;

    const pctCoMat = totalEvents > 0 ? ((coMat / totalEvents) * 100).toFixed(1) : "100";
    const pctVangCoPhep = totalEvents > 0 ? ((vangCoPhep / totalEvents) * 100).toFixed(1) : "0";
    const pctVangKhongPhep = totalEvents > 0 ? ((vangKhongPhep / totalEvents) * 100).toFixed(1) : "0";
    const pctDiTre = totalEvents > 0 ? ((diTre / totalEvents) * 100).toFixed(1) : "0";

    const pieData = [
      { name: "Có mặt", value: coMat, color: "#10b981", percent: pctCoMat },
      { name: "Vắng có phép", value: vangCoPhep, color: "#f59e0b", percent: pctVangCoPhep },
      { name: "Vắng không phép", value: vangKhongPhep, color: "#ef4444", percent: pctVangKhongPhep },
      { name: "Đi trễ", value: diTre, color: "#3b82f6", percent: pctDiTre },
    ].filter((d) => d.value > 0);

    return {
      coMat,
      vangCoPhep,
      vangKhongPhep,
      diTre,
      totalSessions,
      totalEvents,
      pctCoMat,
      pctVangCoPhep,
      pctVangKhongPhep,
      pctDiTre,
      pieData,
    };
  }, [students, rawAttendance, filterLop, timeType]);

  // Filtered & Sorted Detailed Violation List
  const filteredViolations = useMemo(() => {
    let list = rawAttendance.filter((r) => {
      const matchSearch =
        !violationSearch ||
        r.student.hoTen.toLowerCase().includes(violationSearch.toLowerCase()) ||
        (r.student.tenGoi && r.student.tenGoi.toLowerCase().includes(violationSearch.toLowerCase()));
      const matchLoai = violationLoai === "ALL" || r.loai === violationLoai;
      return matchSearch && matchLoai;
    });

    if (violationSort === "name_asc") {
      list = [...list].sort((a, b) => compareVietnameseNames(a.student.hoTen, b.student.hoTen, "asc"));
    } else if (violationSort === "name_desc") {
      list = [...list].sort((a, b) => compareVietnameseNames(a.student.hoTen, b.student.hoTen, "desc"));
    } else if (violationSort === "date_asc") {
      list = [...list].sort((a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime());
    } else {
      // date_desc
      list = [...list].sort((a, b) => new Date(b.ngay).getTime() - new Date(a.ngay).getTime());
    }

    return list;
  }, [rawAttendance, violationSearch, violationLoai, violationSort]);

  // Fee Bar Data
  const feeBarData = summary
    ? [
        { name: "Tổng thu", amount: summary.tongThu },
        { name: "Tổng chi", amount: summary.tongChi },
        { name: "Số dư quỹ", amount: Math.max(0, summary.conLai) },
      ]
    : [];

  const handleExportAttendance = () => {
    const params = new URLSearchParams();
    if (filterLop && filterLop !== "ALL") params.set("lop", filterLop);
    if (dateRange.ngay) params.set("ngay", dateRange.ngay);
    if (dateRange.from) params.set("from", dateRange.from);
    if (dateRange.to) params.set("to", dateRange.to);
    if (violationLoai && violationLoai !== "ALL") params.set("loai", violationLoai);
    window.open(`/api/attendance/export?${params.toString()}`, "_blank");
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* ====== HEADER & GLOBAL CONTROLS ====== */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 4, color: "var(--text-primary)" }}>
            Báo cáo & Thống kê {filterLop !== "ALL" ? `— Lớp ${filterLop}` : "Toàn trường"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Tổng hợp đa chiều: Quỹ tài chính, biểu đồ chuyên cần 4 trạng thái và nhật ký vi phạm
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

          <button
            className="btn btn-primary btn-sm"
            onClick={handleExportAttendance}
            style={{ minHeight: 38, display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(260,80%,58%) 100%)" }}
          >
            <FileSpreadsheet size={14} /> Xuất Excel vi phạm
          </button>
        </div>
      </div>

      {/* ====== BỘ LỌC THỜI GIAN THEO: NGÀY / TUẦN / THÁNG / NĂM / TẤT CẢ ====== */}
      <div
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: 20,
          background: "#ffffff",
          border: "1.5px solid var(--border)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          {/* Main Time Range Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
              <CalendarIcon size={16} color="var(--primary)" /> Thời gian:
            </span>

            {[
              { key: "day", label: "📅 Ngày" },
              { key: "week", label: "🗓️ Tuần" },
              { key: "month", label: "📆 Tháng" },
              { key: "year", label: "🏛️ Năm" },
              { key: "all", label: "♾️ Tất cả" },
            ].map((t) => {
              const active = timeType === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTimeType(t.key as TimeRangeType)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    border: active ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                    background: active ? "var(--primary)" : "#f8fafc",
                    color: active ? "white" : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Sub-selectors for chosen time range */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {timeType === "day" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="date"
                  className="input"
                  style={{ minHeight: 34, padding: "4px 8px", width: 145, fontSize: "0.82rem" }}
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                  onClick={() => setSelectedDay(new Date().toISOString().split("T")[0])}
                >
                  Hôm nay
                </button>
              </div>
            )}

            {timeType === "week" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select
                  className="select"
                  style={{ minHeight: 34, padding: "4px 10px", fontSize: "0.82rem", width: 135 }}
                  value={selectedWeekPreset}
                  onChange={(e) => setSelectedWeekPreset(e.target.value as "current" | "7days" | "last")}
                >
                  <option value="current">Tuần này</option>
                  <option value="7days">7 ngày qua</option>
                  <option value="last">Tuần trước</option>
                </select>
              </div>
            )}

            {timeType === "month" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select
                  className="select"
                  style={{ minHeight: 34, padding: "4px 8px", fontSize: "0.82rem", width: 110 }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Tháng {i + 1}
                    </option>
                  ))}
                </select>
                <select
                  className="select"
                  style={{ minHeight: 34, padding: "4px 8px", fontSize: "0.82rem", width: 85 }}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {timeType === "year" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select
                  className="select"
                  style={{ minHeight: 34, padding: "4px 8px", fontSize: "0.82rem", width: 100 }}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Active Range Badge */}
            <span className="badge badge-info" style={{ fontWeight: 700, padding: "5px 10px", fontSize: "0.8rem" }}>
              Đang xem: {dateRange.label}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
        </div>
      ) : (
        <>
          {/* ====== KPI FINANCIAL OVERVIEW ====== */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 22 }}>
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="kpi-number" style={{ color: "var(--success)" }}>
                      {formatVND(summary.tongThu)}
                    </div>
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
                    <div className="kpi-number" style={{ color: "var(--danger)" }}>
                      {formatVND(summary.tongChi)}
                    </div>
                    <div className="kpi-label">Tổng đã chi tiêu</div>
                  </div>
                  <ArrowUpRight size={24} color="var(--danger)" opacity={0.7} />
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 }}>
                  {summary.chiTheoHangMuc?.length || 0} hạng mục chi
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(213,80%,58%) 100%)",
                  border: "none",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                  Số dư quỹ hiện tại {filterLop !== "ALL" ? `(${filterLop})` : ""}
                </div>
                <div style={{ color: "white", fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>
                  {formatVND(summary.conLai)}
                </div>
              </div>
            </div>
          )}

          {/* ====== CHARTS ROW (FINANCIAL + ATTENDANCE 4 TRẠNG THÁI) ====== */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16, marginBottom: 24 }}>
            {/* Chart 1: Financial Overview */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Cân đối Thu — Chi — Số dư quỹ</h3>
                <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>Tài chính lớp</span>
              </div>
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

            {/* Chart 2: Cơ cấu Chuyên cần & Vi phạm (ĐỦ 4 THÔNG TIN + SỐ LIỆU RÕ RÀNG) */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Cơ cấu Chuyên cần & Vi phạm</h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Khung thời gian: <strong style={{ color: "var(--primary)" }}>{dateRange.label}</strong>
                  </div>
                </div>
                <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                  Tổng: {attendanceBreakdown.totalEvents} lượt
                </span>
              </div>

              {/* 4 THẺ SỐ LIỆU TRỰC QUAN ĐẦY ĐỦ */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "8px 6px", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#065f46" }}>🟢 Có mặt</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#059669", marginTop: 2 }}>
                    {attendanceBreakdown.coMat}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#047857", fontWeight: 600 }}>{attendanceBreakdown.pctCoMat}%</div>
                </div>

                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "8px 6px", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#92400e" }}>🟡 Có phép</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#d97706", marginTop: 2 }}>
                    {attendanceBreakdown.vangCoPhep}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#b45309", fontWeight: 600 }}>{attendanceBreakdown.pctVangCoPhep}%</div>
                </div>

                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 6px", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#991b1b" }}>🔴 Không phép</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
                    {attendanceBreakdown.vangKhongPhep}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#b91c1c", fontWeight: 600 }}>{attendanceBreakdown.pctVangKhongPhep}%</div>
                </div>

                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "8px 6px", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#1e40af" }}>🔵 Đi trễ</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#2563eb", marginTop: 2 }}>
                    {attendanceBreakdown.diTre}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#1d4ed8", fontWeight: 600 }}>{attendanceBreakdown.pctDiTre}%</div>
                </div>
              </div>

              {/* Pie Chart */}
              <div style={{ width: "100%", height: 210 }}>
                {attendanceBreakdown.pieData.length === 0 ? (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    Chưa có dữ liệu chuyên cần trong khoảng thời gian này
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceBreakdown.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {attendanceBreakdown.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: unknown, name: unknown) => [
                          `${value} lượt (${attendanceBreakdown.totalEvents > 0 ? (((Number(value)) / attendanceBreakdown.totalEvents) * 100).toFixed(1) : 0}%)`,
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

          {/* ====== BÁO CÁO DẠNG CHI TIẾT: DANH SÁCH CÁC TRƯỜNG HỢP VI PHẠM ====== */}
          <div className="card" style={{ padding: "20px", marginBottom: 24, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.08rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={18} color="#dc2626" /> Báo cáo chi tiết các trường hợp vi phạm & vắng/trễ
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "4px 0 0" }}>
                  Danh sách từng trường hợp vắng có phép, vắng không phép và đi trễ trong: <strong style={{ color: "var(--primary)" }}>{dateRange.label}</strong>
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge badge-warning" style={{ fontWeight: 700, padding: "5px 12px" }}>
                  {filteredViolations.length} trường hợp vi phạm
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportAttendance}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={13} /> Tải Excel
                </button>
              </div>
            </div>

            {/* Bảng điều khiển lọc danh sách vi phạm */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              {/* Search box */}
              <div style={{ position: "relative", minWidth: 200, flex: "1 1 200px" }}>
                <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  className="input"
                  style={{ paddingLeft: 34, minHeight: 36 }}
                  placeholder="Tìm tên học sinh vi phạm..."
                  value={violationSearch}
                  onChange={(e) => setViolationSearch(e.target.value)}
                />
                {violationSearch && (
                  <button
                    type="button"
                    onClick={() => setViolationSearch("")}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Lọc loại vi phạm */}
              <select
                className="select"
                style={{ width: 170, minHeight: 36 }}
                value={violationLoai}
                onChange={(e) => setViolationLoai(e.target.value)}
              >
                <option value="ALL">Tất cả loại vi phạm</option>
                <option value="Vắng có phép">🟡 Vắng có phép</option>
                <option value="Vắng không phép">🔴 Vắng không phép</option>
                <option value="Đi trễ">🔵 Đi trễ</option>
              </select>

              {/* Sắp xếp */}
              <select
                className="select"
                style={{ width: 160, minHeight: 36, fontWeight: 600 }}
                value={violationSort}
                onChange={(e) => setViolationSort(e.target.value as "date_desc" | "date_asc" | "name_asc" | "name_desc")}
              >
                <option value="date_desc">📅 Ngày mới nhất</option>
                <option value="date_asc">📅 Ngày cũ nhất</option>
                <option value="name_asc">🔤 Tên A $\rightarrow$ Z</option>
                <option value="name_desc">🔤 Tên Z $\rightarrow$ A</option>
              </select>

              {(violationSearch || violationLoai !== "ALL" || violationSort !== "date_desc") && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setViolationSearch("");
                    setViolationLoai("ALL");
                    setViolationSort("date_desc");
                  }}
                  style={{ minHeight: 36 }}
                >
                  <X size={13} /> Bỏ lọc
                </button>
              )}
            </div>

            {/* Bảng dữ liệu vi phạm */}
            {filteredViolations.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center", background: "#f8fafc", borderRadius: 10, border: "1px dashed var(--border)" }}>
                <CheckCircle size={36} color="#10b981" style={{ margin: "0 auto 8px", display: "block" }} />
                <p style={{ fontWeight: 700, color: "#065f46", fontSize: "0.95rem", margin: 0 }}>
                  Không có trường hợp vi phạm nào trong {dateRange.label}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Tất cả học sinh đều duy trì chuyên cần và chấp hành tốt nội quy.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>STT</th>
                      <th>Họ và tên</th>
                      <th>Lớp</th>
                      <th>Tổ</th>
                      <th>Nội dung vi phạm</th>
                      <th>Ngày ghi nhận</th>
                      <th>Ghi chú / Lý do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredViolations.map((item, idx) => {
                      const isVangCP = item.loai === "Vắng có phép";
                      const isVangKP = item.loai === "Vắng không phép";
                      const isDiTre = item.loai === "Đi trễ";

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
                                  background: isVangKP ? "#fee2e2" : isVangCP ? "#fef3c7" : "#dbeafe",
                                  color: isVangKP ? "#dc2626" : isVangCP ? "#d97706" : "#2563eb",
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
                          <td>
                            <span
                              className={`badge ${
                                isVangKP
                                  ? "badge-danger"
                                  : isVangCP
                                  ? "badge-warning"
                                  : "badge-info"
                              }`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                padding: "4px 10px",
                              }}
                            >
                              {isVangKP && <XCircle size={12} />}
                              {isVangCP && <Clock size={12} />}
                              {isDiTre && <AlertCircle size={12} />}
                              {item.loai}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                            {formatDate(item.ngay)}
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

          {/* ====== EXPENSE BREAKDOWN BY CATEGORY ====== */}
          {summary && summary.chiTheoHangMuc && summary.chiTheoHangMuc.length > 0 && (
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 16 }}>Phân bổ chi tiêu theo Hạng mục</h3>
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
