"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BarChart3, Users, Calendar as CalendarIcon, Download,
  CheckCircle, AlertCircle, School,
  Search, Filter, ArrowUpDown, ArrowUpAZ, ArrowDownAZ, X, Clock,
  XCircle, FileSpreadsheet, Sparkles, Check, ChevronDown, RefreshCw,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { compareVietnameseNames } from "@/lib/utils";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
} from "recharts";
import ReportTabs from "@/components/admin/ReportTabs";

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

type TimeRangeType = "all" | "day" | "range" | "week" | "month" | "year";

export default function AdminBaoCaoChuyenCanPage() {
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
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [rawAttendance, setRawAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Time Range Filter states
  const [timeType, setTimeType] = useState<TimeRangeType>("day");
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().split("T")[0]);
  
  // Custom Date Range states (Từ ngày... Đến ngày...)
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0];
  });
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().split("T")[0]);

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedWeekPreset, setSelectedWeekPreset] = useState<"current" | "7days" | "last">("current");

  // Violation Table Local Filters
  const [violationSearch, setViolationSearch] = useState("");
  const [violationLoai, setViolationLoai] = useState("ALL");
  const [violationSort, setViolationSort] = useState<"date_desc" | "date_asc" | "name_asc" | "name_desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("admin_violation_sort") as "date_desc" | "date_asc" | "name_asc" | "name_desc") || "date_desc";
    }
    return "date_desc";
  });

  const handleSetViolationSort = (newSort: "date_desc" | "date_asc" | "name_asc" | "name_desc") => {
    setViolationSort(newSort);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_violation_sort", newSort);
    }
  };

  // Helper điều hướng ngày
  const stepDay = (deltaDays: number) => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + deltaDays);
    setSelectedDay(d.toISOString().split("T")[0]);
  };

  const getDayOfWeekName = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      return days[d.getDay()];
    } catch {
      return "";
    }
  };

  // Tính số ngày trong giai đoạn
  const rangeDaysCount = useMemo(() => {
    if (!rangeFrom || !rangeTo) return 0;
    const from = new Date(rangeFrom);
    const to = new Date(rangeTo);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [rangeFrom, rangeTo]);

  // Phím tắt chọn nhanh giai đoạn
  const applyRangePreset = (preset: "7days" | "14days" | "30days" | "this_week" | "this_month" | "last_month") => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (preset === "7days") {
      const past = new Date();
      past.setDate(now.getDate() - 6);
      setRangeFrom(past.toISOString().split("T")[0]);
      setRangeTo(todayStr);
    } else if (preset === "14days") {
      const past = new Date();
      past.setDate(now.getDate() - 13);
      setRangeFrom(past.toISOString().split("T")[0]);
      setRangeTo(todayStr);
    } else if (preset === "30days") {
      const past = new Date();
      past.setDate(now.getDate() - 29);
      setRangeFrom(past.toISOString().split("T")[0]);
      setRangeTo(todayStr);
    } else if (preset === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setRangeFrom(monday.toISOString().split("T")[0]);
      setRangeTo(sunday.toISOString().split("T")[0]);
    } else if (preset === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      setRangeFrom(first);
      setRangeTo(last);
    } else if (preset === "last_month") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const last = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      setRangeFrom(first);
      setRangeTo(last);
    }
  };

  // Sync with URL query parameter or assignedLop
  useEffect(() => {
    if (!isSuperAdmin && assignedLop) {
      setFilterLop(assignedLop);
      return;
    }
    if (urlLop) setFilterLop(urlLop);
  }, [urlLop, isSuperAdmin, assignedLop]);

  // Calculate Date Range based on Time Filter
  const dateRange = useMemo(() => {
    const now = new Date();
    if (timeType === "day") {
      return {
        ngay: selectedDay,
        from: null,
        to: null,
        label: `${getDayOfWeekName(selectedDay)}, ${formatDate(selectedDay)}`,
      };
    }
    if (timeType === "range") {
      return {
        ngay: null,
        from: rangeFrom,
        to: rangeTo,
        label: `Giai đoạn từ ${formatDate(rangeFrom)} đến ${formatDate(rangeTo)} (${rangeDaysCount} ngày)`,
      };
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
    return { ngay: null, from: null, to: null, label: "Tất cả thời gian (Toàn bộ)" };
  }, [timeType, selectedDay, rangeFrom, rangeTo, rangeDaysCount, selectedWeekPreset, selectedMonth, selectedYear]);

  // Fetch report data
  const fetchData = async () => {
    setLoading(true);
    try {
      const activeClass = !isSuperAdmin ? assignedLop : filterLop;
      const feeLopQuery = activeClass !== "ALL" ? `?lop=${encodeURIComponent(activeClass)}` : "";

      const attParams = new URLSearchParams();
      if (activeClass && activeClass !== "ALL") attParams.set("lop", activeClass);
      if (dateRange.ngay) attParams.set("ngay", dateRange.ngay);
      if (dateRange.from) attParams.set("from", dateRange.from);
      if (dateRange.to) attParams.set("to", dateRange.to);

      const [stdRes, attRes, classRes] = await Promise.all([
        fetch(`/api/students${feeLopQuery}`),
        fetch(`/api/attendance?${attParams.toString()}`),
        fetch("/api/classes"),
      ]);

      const [stdData, attData, classData] = await Promise.all([
        stdRes.json(),
        attRes.json(),
        classRes.json(),
      ]);

      setStudents(stdData.data || []);
      setRawAttendance(attData.data || []);
      if (classData.data && classData.data.length > 0) setClassList(classData.data);
    } catch (e) {
      console.error("Fetch attendance report data error:", e);
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 4, color: "var(--text-primary)" }}>
            Báo cáo Chuyên cần & Vi phạm {filterLop !== "ALL" ? `— Lớp ${filterLop}` : "Toàn trường"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Thống kê tỷ lệ chuyên cần 4 trạng thái, theo dõi nề nếp và danh sách chi tiết các trường hợp vắng / đi trễ
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
            className="btn btn-primary btn-sm"
            onClick={handleExportAttendance}
            style={{ minHeight: 38, display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(260,80%,58%) 100%)" }}
          >
            <FileSpreadsheet size={14} /> Xuất Excel vi phạm
          </button>
        </div>
      </div>

      {/* ====== SUB TABS NAVIGATION ====== */}
      <ReportTabs activeTab="chuyen-can" filterLop={filterLop} />

      {/* ====== BỘ LỌC THỜI GIAN NÂNG CAO ====== */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          marginBottom: 22,
          background: "#ffffff",
          border: "1.5px solid var(--border)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          borderRadius: 14,
        }}
      >
        {/* Header hàng 1: Tiêu đề & Badge phạm vi đang chọn */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <CalendarIcon size={16} color="var(--primary)" /> Bộ lọc thời gian:
            </span>
            <span className="badge badge-info" style={{ fontWeight: 700, fontSize: "0.82rem", padding: "4px 10px" }}>
              {dateRange.label}
            </span>
          </div>

          {/* Type selector tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--bg-page)", padding: 4, borderRadius: 8, border: "1px solid var(--border)" }}>
            {[
              { key: "day", label: "📅 Ngày cụ thể" },
              { key: "range", label: "📍 Giai đoạn" },
              { key: "week", label: "🗓️ Tuần" },
              { key: "month", label: "📆 Tháng" },
              { key: "year", label: "📈 Năm" },
              { key: "all", label: "♾️ Tất cả" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTimeType(t.key as TimeRangeType)}
                style={{
                  padding: "5px 11px",
                  fontSize: "0.78rem",
                  fontWeight: timeType === t.key ? 800 : 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: timeType === t.key ? "var(--primary)" : "transparent",
                  color: timeType === t.key ? "#ffffff" : "var(--text-secondary)",
                  transition: "all 0.15s ease",
                  boxShadow: timeType === t.key ? "0 2px 6px rgba(59,130,246,0.3)" : "none",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hàng 2: Chi tiết điều khiển tùy chọn theo từng kiểu thời gian */}
        <div style={{ paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
          {/* 1. CHỌN 1 NGÀY CỤ THỂ */}
          {timeType === "day" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => stepDay(-1)}
                  style={{ minHeight: 34, padding: "4px 10px", fontSize: "0.8rem" }}
                >
                  ◀ Ngày trước
                </button>
                <input
                  type="date"
                  className="input"
                  style={{ minHeight: 34, padding: "4px 10px", fontWeight: 700, fontSize: "0.88rem", border: "1.5px solid var(--primary)", borderRadius: 8, background: "#ffffff" }}
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => stepDay(1)}
                  style={{ minHeight: 34, padding: "4px 10px", fontSize: "0.8rem" }}
                >
                  Ngày sau ▶
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedDay(new Date().toISOString().split("T")[0])}
                  style={{ minHeight: 34, padding: "4px 12px", fontSize: "0.8rem" }}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDay(yesterday.toISOString().split("T")[0]);
                  }}
                  style={{ minHeight: 34, padding: "4px 12px", fontSize: "0.8rem" }}
                >
                  Hôm qua
                </button>
              </div>

              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
                📅 {getDayOfWeekName(selectedDay)}, ngày {formatDate(selectedDay)}
              </div>
            </div>
          )}

          {/* 2. CHỌN THEO GIAI ĐOẠN TỪ NGÀY... ĐẾN NGÀY... */}
          {timeType === "range" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                    Từ ngày:
                  </label>
                  <input
                    type="date"
                    className="input"
                    max={rangeTo}
                    style={{
                      minHeight: 36,
                      padding: "4px 10px",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      border: "1.5px solid var(--primary)",
                      borderRadius: 8,
                      background: "#ffffff",
                    }}
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                  />
                </div>

                <span style={{ fontWeight: 800, color: "var(--text-muted)", fontSize: "1.1rem" }}>➔</span>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                    Đến ngày:
                  </label>
                  <input
                    type="date"
                    className="input"
                    min={rangeFrom}
                    style={{
                      minHeight: 36,
                      padding: "4px 10px",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      border: "1.5px solid var(--primary)",
                      borderRadius: 8,
                      background: "#ffffff",
                    }}
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                  />
                </div>

                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)", background: "rgba(59,130,246,0.1)", padding: "4px 12px", borderRadius: 6 }}>
                  📊 Tổng cộng: {rangeDaysCount} ngày
                </span>
              </div>

              {/* Nút chọn nhanh */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginRight: 2 }}>
                  Gợi ý nhanh:
                </span>
                {[
                  { key: "7days", label: "⚡ 7 ngày qua" },
                  { key: "14days", label: "⚡ 14 ngày qua" },
                  { key: "30days", label: "⚡ 30 ngày qua" },
                  { key: "this_week", label: "🗓️ Tuần này" },
                  { key: "this_month", label: "📆 Tháng này" },
                  { key: "last_month", label: "⏮️ Tháng trước" },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: "4px 10px", fontSize: "0.78rem", borderRadius: 6, background: "#ffffff" }}
                    onClick={() => applyRangePreset(preset.key as any)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. CHỌN THEO TUẦN */}
          {timeType === "week" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                Chọn mốc tuần:
              </span>
              <select
                className="select"
                style={{ minHeight: 36, padding: "4px 12px", fontSize: "0.85rem", width: 180, fontWeight: 700 }}
                value={selectedWeekPreset}
                onChange={(e) => setSelectedWeekPreset(e.target.value as "current" | "7days" | "last")}
              >
                <option value="current">🗓️ Tuần này (Thứ 2 - CN)</option>
                <option value="7days">⚡ 7 ngày gần nhất</option>
                <option value="last">⏮️ Tuần trước</option>
              </select>
            </div>
          )}

          {/* 4. CHỌN THEO THÁNG */}
          {timeType === "month" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                Chọn tháng và năm:
              </span>
              <select
                className="select"
                style={{ minHeight: 36, padding: "4px 12px", fontSize: "0.85rem", width: 130, fontWeight: 700 }}
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
                style={{ minHeight: 36, padding: "4px 12px", fontSize: "0.85rem", width: 110, fontWeight: 700 }}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const now = new Date();
                  setSelectedMonth(now.getMonth() + 1);
                  setSelectedYear(now.getFullYear());
                }}
                style={{ minHeight: 36, padding: "4px 12px", fontSize: "0.8rem" }}
              >
                Tháng hiện tại
              </button>
            </div>
          )}

          {/* 5. CHỌN THEO NĂM */}
          {timeType === "year" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                Chọn năm báo cáo:
              </span>
              <select
                className="select"
                style={{ minHeight: 36, padding: "4px 12px", fontSize: "0.85rem", width: 120, fontWeight: 700 }}
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

          {/* 6. TOÀN BỘ (TẤT CẢ) */}
          {timeType === "all" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                ♾️ Đang tổng hợp số liệu chuyên cần của <strong>toàn bộ thời gian</strong> từ trước tới nay.
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTimeType("day")}
                  style={{ minHeight: 34, padding: "4px 12px", fontSize: "0.82rem" }}
                >
                  📅 Xem 1 ngày cụ thể
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTimeType("range")}
                  style={{ minHeight: 34, padding: "4px 12px", fontSize: "0.82rem" }}
                >
                  📍 Xem theo giai đoạn
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
        </div>
      ) : (
        <>
          {/* ====== CƠ CẤU CHUYÊN CẦN & VI PHẠM (4 THẺ SỐ LIỆU + BIỂU ĐỒ TRÒN) ====== */}
          <div className="card" style={{ padding: "22px 24px", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                  Cơ cấu Chuyên cần & Vi phạm
                </h3>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 3 }}>
                  Khung thời gian đang xem: <strong style={{ color: "var(--primary)" }}>{dateRange.label}</strong>
                </div>
              </div>
              <span className="badge badge-info" style={{ fontSize: "0.8rem", fontWeight: 700, padding: "6px 14px" }}>
                Tổng ghi nhận: {attendanceBreakdown.totalEvents} lượt
              </span>
            </div>

            {/* 4 THẺ SỐ LIỆU TRỰC QUAN ĐẦY ĐỦ */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 10, marginBottom: 20 }}>
              <div style={{ background: "#ecfdf5", border: "1.5px solid #a7f3d0", padding: "14px 16px", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#065f46" }}>🟢 Có mặt đầy đủ</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#059669", marginTop: 4 }}>
                  {attendanceBreakdown.coMat}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#047857", fontWeight: 700 }}>{attendanceBreakdown.pctCoMat}% tổng số</div>
              </div>

              <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", padding: "14px 16px", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#92400e" }}>🟡 Vắng có phép</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706", marginTop: 4 }}>
                  {attendanceBreakdown.vangCoPhep}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#b45309", fontWeight: 700 }}>{attendanceBreakdown.pctVangCoPhep}% tổng số</div>
              </div>

              <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", padding: "14px 16px", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#991b1b" }}>🔴 Vắng không phép</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
                  {attendanceBreakdown.vangKhongPhep}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#b91c1c", fontWeight: 700 }}>{attendanceBreakdown.pctVangKhongPhep}% tổng số</div>
              </div>

              <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", padding: "14px 16px", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e40af" }}>🔵 Đi trễ</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2563eb", marginTop: 4 }}>
                  {attendanceBreakdown.diTre}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#1d4ed8", fontWeight: 700 }}>{attendanceBreakdown.pctDiTre}% tổng số</div>
              </div>
            </div>

            {/* Pie Chart */}
            <div style={{ width: "100%", height: 260 }}>
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
                      innerRadius={62}
                      outerRadius={95}
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

          {/* ====== BÁO CÁO DẠNG CHI TIẾT: DANH SÁCH CÁC TRƯỜNG HỢP VI PHẠM ====== */}
          <div className="card" style={{ padding: "22px 24px", marginBottom: 24, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={19} color="#dc2626" /> Báo cáo chi tiết các trường hợp vi phạm & vắng/trễ
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "4px 0 0" }}>
                  Danh sách từng trường hợp vắng có phép, vắng không phép và đi trễ trong: <strong style={{ color: "var(--primary)" }}>{dateRange.label}</strong>
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge badge-warning" style={{ fontWeight: 700, padding: "6px 14px" }}>
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
                onChange={(e) => handleSetViolationSort(e.target.value as "date_desc" | "date_asc" | "name_asc" | "name_desc")}
              >
                <option value="date_desc">📅 Ngày mới nhất</option>
                <option value="date_asc">📅 Ngày cũ nhất</option>
                <option value="name_asc">🔤 Tên A → Z</option>
                <option value="name_desc">🔤 Tên Z → A</option>
              </select>

              {(violationSearch || violationLoai !== "ALL" || violationSort !== "date_desc") && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setViolationSearch("");
                    setViolationLoai("ALL");
                    handleSetViolationSort("date_desc");
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
              <>
                {/* Desktop Violations Table */}
                <div className="hide-on-mobile" style={{ overflowX: "auto" }}>
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

                {/* Mobile Violations Card List */}
                <div className="hide-on-desktop" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 4px" }}>
                  {filteredViolations.map((item, idx) => {
                    const isVangCP = item.loai === "Vắng có phép";
                    const isVangKP = item.loai === "Vắng không phép";
                    const isDiTre = item.loai === "Đi trễ";

                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          background: "#ffffff",
                          border: "1px solid var(--border)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.student.hoTen}
                            </span>
                            <span className="badge badge-neutral" style={{ fontSize: "0.68rem", padding: "1px 5px" }}>
                              T{item.student.to}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                            📅 {formatDate(item.ngay)} {item.ghiChu ? `• ${item.ghiChu}` : ""}
                          </div>
                        </div>

                        <span
                          className={`badge ${
                            isVangKP
                              ? "badge-danger"
                              : isVangCP
                              ? "badge-warning"
                              : "badge-info"
                          }`}
                          style={{
                            fontSize: "0.72rem",
                            padding: "4px 8px",
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {isVangKP && <XCircle size={11} />}
                          {isVangCP && <Clock size={11} />}
                          {isDiTre && <AlertCircle size={11} />}
                          {item.loai}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
