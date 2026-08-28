"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Wallet,
  CheckCircle,
  XCircle,
  Calendar,
  Star,
  ChevronRight,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Info,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownAZ,
  X,
  LayoutGrid,
  List,
  Sparkles,
  User,
  Clock,
  MapPin,
  Award,
  GraduationCap,
  CalendarDays,
  Check,
} from "lucide-react";
import { formatVND, formatDate } from "@/lib/format";
import { compareVietnameseNames } from "@/lib/utils";
import { getSlotTo, TO_THEMES } from "@/lib/seatingTypes";

// ==================
// TYPES & INTERFACES
// ==================
interface Student {
  id: number;
  hoTen: string;
  tenGoi: string | null;
  ngaySinh: string | null;
  gioiTinh: string;
  to: number;
  lop: string;
  avatar?: string | null;
  ghiChu?: string | null;
}

interface FeeStatus {
  kyThu: string;
  trangThai: string;
  soTien: number;
  ngayDong: string | null;
  hinhThucDong: string;
}

interface FeeSummary {
  tongThu: number;
  tongChi: number;
  conLai: number;
  soHSDaDong: number;
  tongHS: number;
  chiTheoHangMuc: { hangMucChi: string; total: number }[];
}

interface Event {
  id: number;
  tenSuKien: string;
  hangMuc: string | null;
  deadline: string | null;
  trangThai: string;
  members: { vaiTro: string; student: { hoTen: string } }[];
}

interface DutyEntry {
  thu: string;
  thuOrder: number;
  students: string[];
}

interface AttendanceRecord {
  id: number;
  ngay: string;
  loai: string;
  ghiChu: string | null;
}

const TO_STYLES: Record<
  number,
  {
    name: string;
    badgeBg: string;
    cardBg: string;
    border: string;
    text: string;
    glow: string;
    lightBg: string;
  }
> = {
  1: {
    name: "Tổ 1",
    badgeBg: "#0284c7",
    cardBg: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
    border: "#bae6fd",
    text: "#0369a1",
    glow: "rgba(2, 132, 199, 0.15)",
    lightBg: "#e0f2fe",
  },
  2: {
    name: "Tổ 2",
    badgeBg: "#16a34a",
    cardBg: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
    border: "#bbf7d0",
    text: "#15803d",
    glow: "rgba(22, 163, 74, 0.15)",
    lightBg: "#dcfce7",
  },
  3: {
    name: "Tổ 3",
    badgeBg: "#d97706",
    cardBg: "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)",
    border: "#fde68a",
    text: "#b45309",
    glow: "rgba(217, 119, 6, 0.15)",
    lightBg: "#fef3c7",
  },
  4: {
    name: "Tổ 4",
    badgeBg: "#9333ea",
    cardBg: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
    border: "#e9d5ff",
    text: "#7e22ce",
    glow: "rgba(147, 51, 234, 0.15)",
    lightBg: "#f3e8ff",
  },
};

export default function PublicHomePage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");

  const [activeLop, setActiveLop] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return urlLop || localStorage.getItem("admin_selected_class") || "12T2";
    }
    return urlLop || "12T2";
  });

  const [tab, setTab] = useState<"danh-sach" | "quy" | "diem-danh" | "truc-nhat">("danh-sach");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [filterTo, setFilterTo] = useState<number>(0);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Sorting
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("public_student_sort_order") as "default" | "asc" | "desc") || "default";
    }
    return "default";
  });

  const handleSetSortOrder = (newOrder: "default" | "asc" | "desc") => {
    setSortOrder(newOrder);
    if (typeof window !== "undefined") {
      localStorage.setItem("public_student_sort_order", newOrder);
    }
  };

  // Fund state
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null);
  const [allFeeRecords, setAllFeeRecords] = useState<{ [studentId: number]: FeeStatus[] }>({});
  const [searchFundStudent, setSearchFundStudent] = useState("");

  // Duty and events
  const [duty, setDuty] = useState<DutyEntry[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentWeek, setCurrentWeek] = useState("");
  const [searchDutyStudent, setSearchDutyStudent] = useState("");

  // Quick Student Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentFeeDetails, setStudentFeeDetails] = useState<FeeStatus[]>([]);
  const [studentAttendanceDetails, setStudentAttendanceDetails] = useState<AttendanceRecord[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Sync active class from searchParams
  useEffect(() => {
    if (urlLop && urlLop !== "ALL") {
      setActiveLop(urlLop);
    }
  }, [urlLop]);

  // Fetch students
  useEffect(() => {
    setLoadingStudents(true);
    const lopQuery = activeLop && activeLop !== "ALL" ? `?lop=${activeLop}` : "";
    fetch(`/api/students${lopQuery}`)
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.data || d || []);
        setLoadingStudents(false);
      })
      .catch(() => setLoadingStudents(false));
  }, [activeLop]);

  // Fetch fee summary & all class fees
  useEffect(() => {
    const lopQuery = activeLop && activeLop !== "ALL" ? `?lop=${activeLop}` : "";
    fetch(`/api/fees/summary${lopQuery}`)
      .then((r) => r.json())
      .then(setFeeSummary)
      .catch(() => {});

    fetch(`/api/fees${lopQuery ? lopQuery + "&limit=500" : "?limit=500"}`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.data || [];
        const map: { [stId: number]: FeeStatus[] } = {};
        list.forEach((f: { studentId: number; kyThu: string; trangThai: string; soTien: number; ngayDong: string | null; hinhThucDong: string }) => {
          if (!map[f.studentId]) map[f.studentId] = [];
          map[f.studentId].push(f);
        });
        setAllFeeRecords(map);
      })
      .catch(() => {});
  }, [activeLop]);

  // Fetch events
  useEffect(() => {
    fetch("/api/events?public=1")
      .then((r) => r.json())
      .then((d) => setEvents(d.data || d || []))
      .catch(() => {});
  }, []);

  // Fetch duty roster
  useEffect(() => {
    const lopQuery = activeLop && activeLop !== "ALL" ? `&lop=${activeLop}` : "";
    fetch(`/api/duty?week=current${lopQuery}`)
      .then((r) => r.json())
      .then((d) => {
        setDuty(d.entries || []);
        setCurrentWeek(d.week || "");
      })
      .catch(() => {});
  }, [activeLop]);

  // Load student profile details when clicked
  const openStudentModal = async (st: Student) => {
    setSelectedStudent(st);
    setLoadingProfile(true);
    try {
      const [feeRes, attRes] = await Promise.all([
        fetch(`/api/fees?studentId=${st.id}`).then((r) => r.json()),
        fetch(`/api/attendance?studentId=${st.id}`).then((r) => r.json()),
      ]);
      setStudentFeeDetails(feeRes.data || []);
      setStudentAttendanceDetails(attRes.data || []);
    } catch {
      // Fallback to cache if any
      setStudentFeeDetails(allFeeRecords[st.id] || []);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Filtered and sorted students
  const filteredStudents = useMemo(() => {
    let list = students.filter((s) => {
      const matchTo = filterTo === 0 || s.to === filterTo;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.hoTen.toLowerCase().includes(q) ||
        (s.tenGoi && s.tenGoi.toLowerCase().includes(q)) ||
        `tổ ${s.to}`.includes(q) ||
        `t${s.to}`.includes(q);
      return matchTo && matchSearch;
    });

    if (sortOrder !== "default") {
      list = [...list].sort((a, b) => compareVietnameseNames(a.hoTen, b.hoTen, sortOrder));
    }
    return list;
  }, [students, filterTo, search, sortOrder]);

  // Group by Tổ
  const studentsByTo = useMemo(() => {
    return [1, 2, 3, 4].map((toNum) => ({
      to: toNum,
      list: filteredStudents.filter((s) => s.to === toNum),
      totalInClass: students.filter((s) => s.to === toNum).length,
    }));
  }, [filteredStudents, students]);

  // Greeting time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Chào buổi sáng", icon: "🌅" };
    if (hour < 18) return { text: "Chào buổi chiều", icon: "☀️" };
    return { text: "Chào buổi tối", icon: "🌙" };
  }, []);

  return (
    <div style={{ maxWidth: 1380, margin: "0 auto", padding: "8px 0 40px" }}>
      {/* ====== HERO BANNER (EXPANSIVE, MODERN & LUXURIOUS) ====== */}
      <div
        style={{
          background: "linear-gradient(135deg, #0284c7 0%, #2563eb 45%, #7c3aed 100%)",
          borderRadius: 24,
          padding: "32px 30px 28px",
          marginBottom: 24,
          color: "white",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 12px 36px rgba(2, 132, 199, 0.22)",
        }}
      >
        {/* Subtle mesh background glows */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: "30%",
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(56,189,248,0.2) 0%, rgba(56,189,248,0) 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.16)", padding: "4px 14px", borderRadius: 20, backdropFilter: "blur(8px)", marginBottom: 12, border: "1px solid rgba(255,255,255,0.25)" }}>
                <span style={{ fontSize: "1rem" }}>{greeting.icon}</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase" }}>
                  {greeting.text} • Cổng Học Viên Lớp {activeLop}
                </span>
              </div>
              <h1 style={{ color: "white", fontSize: "2.1rem", fontWeight: 900, letterSpacing: "-0.5px", margin: "0 0 6px" }}>
                Chào mừng đến với Lớp {activeLop}!
              </h1>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem", margin: 0, fontWeight: 500 }}>
                Không gian tra cứu thông tin học tập, quỹ lớp, lịch trực & sơ đồ lớp học trực tuyến
              </p>
            </div>

            {/* Quick Navigation Action Buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href={`/so-do-lop?lop=${activeLop}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255, 255, 255, 0.95)",
                  color: "#0369a1",
                  fontWeight: 800,
                  fontSize: "0.88rem",
                  padding: "10px 18px",
                  borderRadius: 14,
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                  transition: "all 0.15s ease",
                }}
              >
                <LayoutGrid size={16} /> Xem Sơ Đồ Lớp
              </Link>
              <Link
                href={`/thoi-khoa-bieu?lop=${activeLop}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  padding: "10px 16px",
                  borderRadius: 14,
                  textDecoration: "none",
                  border: "1px solid rgba(255,255,255,0.35)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <CalendarDays size={16} /> Thời Khóa Biểu
              </Link>
            </div>
          </div>

          {/* KPI Mini Stats Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 24,
            }}
          >
            {[
              {
                icon: <Users size={16} color="#38bdf8" />,
                label: "Sĩ số học sinh",
                value: `${students.length} bạn`,
                sub: "4 tổ học tập",
              },
              {
                icon: <CheckCircle size={16} color="#4ade80" />,
                label: "Tỷ lệ đóng quỹ",
                value: feeSummary && feeSummary.tongHS > 0
                  ? `${Math.round((feeSummary.soHSDaDong / feeSummary.tongHS) * 100)}%`
                  : "100%",
                sub: feeSummary ? `${feeSummary.soHSDaDong}/${feeSummary.tongHS} đã hoàn tất` : "Minh bạch",
              },
              {
                icon: <Wallet size={16} color="#fcd34d" />,
                label: "Số dư quỹ lớp",
                value: feeSummary ? formatVND(feeSummary.conLai) : "—",
                sub: "Thu chi rõ ràng",
              },
              {
                icon: <Calendar size={16} color="#c084fc" />,
                label: "Tuần học hiện tại",
                value: currentWeek || "Tuần này",
                sub: "Lịch trực sẵn sàng",
              },
            ].map((kpi, idx) => (
              <div
                key={idx}
                style={{
                  background: "rgba(255, 255, 255, 0.14)",
                  borderRadius: 14,
                  padding: "12px 16px",
                  border: "1px solid rgba(255, 255, 255, 0.22)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                  {kpi.icon}
                  {kpi.label}
                </div>
                <div style={{ color: "white", fontSize: "1.25rem", fontWeight: 900, marginTop: 4 }}>
                  {kpi.value}
                </div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", marginTop: 2 }}>
                  {kpi.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====== MODERN TAB NAVIGATION ====== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #e2e8f0",
          marginBottom: 22,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {[
            { key: "danh-sach", icon: <Users size={16} />, label: "Danh Sách Học Sinh" },
            { key: "quy", icon: <Wallet size={16} />, label: "Quỹ Lớp & Thu Chi" },
            { key: "diem-danh", icon: <BookOpen size={16} />, label: "Điểm Danh & Chuyên Cần" },
            { key: "truc-nhat", icon: <Calendar size={16} />, label: "Lịch Trực & Sự Kiện" },
          ].map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key as typeof tab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 18px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "0.92rem",
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? "#0284c7" : "#64748b",
                  borderBottom: isActive ? "3px solid #0284c7" : "3px solid transparent",
                  marginBottom: -2,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* View Mode & Sắp xếp Tên */}
        {tab === "danh-sach" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 6 }}>
            {/* Sort Name Button */}
            <button
              type="button"
              className={`btn btn-sm ${sortOrder !== "default" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                if (sortOrder === "default") handleSetSortOrder("asc");
                else if (sortOrder === "asc") handleSetSortOrder("desc");
                else handleSetSortOrder("default");
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, borderRadius: 10 }}
              title="Bấm để đổi chiều sắp xếp tên: A-Z -> Z-A -> Mặc định"
            >
              {sortOrder === "asc" ? (
                <>
                  <ArrowUpAZ size={14} /> Tên: A → Z
                </>
              ) : sortOrder === "desc" ? (
                <>
                  <ArrowDownAZ size={14} /> Tên: Z → A
                </>
              ) : (
                <>
                  <ArrowUpDown size={14} /> Sắp xếp tên
                </>
              )}
            </button>

            {/* View Mode Toggle */}
            <div
              style={{
                display: "flex",
                background: "#f1f5f9",
                padding: 3,
                borderRadius: 10,
                border: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                style={{
                  border: "none",
                  background: viewMode === "grid" ? "white" : "transparent",
                  color: viewMode === "grid" ? "#0284c7" : "#64748b",
                  padding: "5px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  boxShadow: viewMode === "grid" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <LayoutGrid size={13} /> Thẻ
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  border: "none",
                  background: viewMode === "table" ? "white" : "transparent",
                  color: viewMode === "table" ? "#0284c7" : "#64748b",
                  padding: "5px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  boxShadow: viewMode === "table" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <List size={13} /> Bảng
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ====== TAB 1: DANH SÁCH HỌC SINH (EXPANSIVE CARDS & DATA TABLE) ====== */}
      {/* ========================================================================= */}
      {tab === "danh-sach" && (
        <div>
          {/* Universal Live Search & Tổ Quick Filter Toolbar */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 18,
              padding: "16px 20px",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              marginBottom: 22,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Live Search Input */}
            <div style={{ position: "relative", width: "100%" }}>
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#0284c7",
                }}
              />
              <input
                className="input"
                style={{
                  paddingLeft: 46,
                  paddingRight: 40,
                  height: 48,
                  fontSize: "0.95rem",
                  borderRadius: 12,
                  border: "1.5px solid #cbd5e1",
                  background: "#f8fafc",
                }}
                placeholder="🔍 Gõ tên học sinh, biệt danh hoặc tên tổ để tìm kiếm tức thì..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "#e2e8f0",
                    border: "none",
                    borderRadius: "50%",
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#475569",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Tổ Filter Pills */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b" }}>
                  Lọc theo tổ:
                </span>
                <button
                  type="button"
                  onClick={() => setFilterTo(0)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: filterTo === 0 ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                    background: filterTo === 0 ? "#e0f2fe" : "#ffffff",
                    color: filterTo === 0 ? "#0369a1" : "#475569",
                    fontWeight: filterTo === 0 ? 800 : 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Tất cả ({students.length})
                </button>
                {[1, 2, 3, 4].map((t) => {
                  const cfg = TO_STYLES[t];
                  const isSelected = filterTo === t;
                  const count = students.filter((s) => s.to === t).length;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterTo(t)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        border: isSelected ? `2px solid ${cfg.badgeBg}` : "1.5px solid #e2e8f0",
                        background: isSelected ? cfg.lightBg : "#ffffff",
                        color: isSelected ? cfg.text : "#475569",
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: isSelected ? `0 2px 8px ${cfg.glow}` : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.badgeBg }}></span>
                      {cfg.name} ({count})
                    </button>
                  );
                })}
              </div>

              {(search || filterTo > 0 || sortOrder !== "default") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilterTo(0);
                    handleSetSortOrder("default");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <X size={14} /> Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* Loading Skeleton */}
          {loadingStudents ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 160, borderRadius: 18 }} />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div
              style={{
                background: "#ffffff",
                borderRadius: 20,
                padding: "60px 20px",
                textAlign: "center",
                border: "2px dashed #cbd5e1",
              }}
            >
              <Users size={48} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: "0 0 6px" }}>
                Không tìm thấy học sinh nào
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.88rem", margin: 0 }}>
                Thử gõ lại từ khóa hoặc xóa bớt bộ lọc phía trên
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* ====== VIEW 1: MODERN STUDENT CARDS GRID ====== */
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {studentsByTo.map(({ to, list }) => {
                if (list.length === 0) return null;
                const toCfg = TO_STYLES[to];

                return (
                  <div key={to}>
                    {/* Tổ Group Banner Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 14,
                        padding: "8px 14px",
                        background: toCfg.lightBg,
                        border: `1.5px solid ${toCfg.border}`,
                        borderRadius: 14,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: toCfg.badgeBg }}></span>
                        <h2 style={{ fontSize: "1.05rem", fontWeight: 900, color: toCfg.text, margin: 0 }}>
                          {toCfg.name}
                        </h2>
                      </div>
                      <span
                        style={{
                          background: "white",
                          color: toCfg.text,
                          fontSize: "0.78rem",
                          fontWeight: 800,
                          padding: "2px 10px",
                          borderRadius: 20,
                          border: `1px solid ${toCfg.border}`,
                        }}
                      >
                        {list.length} học sinh
                      </span>
                    </div>

                    {/* Student Cards in this Tổ */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: 16,
                      }}
                    >
                      {list.map((st) => {
                        const feeList = allFeeRecords[st.id] || [];
                        const isFeePaid = feeList.some((f) => f.trangThai === "Đã Đóng") || feeList.length === 0;

                        return (
                          <div
                            key={st.id}
                            onClick={() => openStudentModal(st)}
                            style={{
                              background: "#ffffff",
                              borderRadius: 18,
                              border: `1.5px solid ${toCfg.border}`,
                              padding: "16px 18px",
                              boxShadow: "0 3px 12px rgba(0,0,0,0.03)",
                              cursor: "pointer",
                              transition: "all 0.18s ease",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              gap: 12,
                              position: "relative",
                              overflow: "hidden",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-3px)";
                              e.currentTarget.style.boxShadow = `0 8px 24px ${toCfg.glow}`;
                              e.currentTarget.style.borderColor = toCfg.badgeBg;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.03)";
                              e.currentTarget.style.borderColor = toCfg.border;
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                              {/* Student Avatar */}
                              <div
                                style={{
                                  width: 54,
                                  height: 54,
                                  borderRadius: 14,
                                  background: toCfg.lightBg,
                                  border: `2px solid ${toCfg.border}`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                }}
                              >
                                {st.avatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={st.avatar}
                                    alt={st.hoTen}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                ) : (
                                  <span style={{ fontWeight: 900, fontSize: "1.1rem", color: toCfg.text }}>
                                    {st.hoTen.substring(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>

                              {/* Student Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <h3
                                    style={{
                                      fontSize: "0.98rem",
                                      fontWeight: 800,
                                      color: "#0f172a",
                                      margin: 0,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {st.hoTen}
                                  </h3>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                                  {st.tenGoi && (
                                    <span
                                      style={{
                                        fontSize: "0.72rem",
                                        background: "#f1f5f9",
                                        color: "#475569",
                                        padding: "1px 6px",
                                        borderRadius: 6,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {st.tenGoi}
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: st.gioiTinh === "Nữ" ? "#ec4899" : "#0284c7",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {st.gioiTinh}
                                  </span>
                                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>•</span>
                                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                    {formatDate(st.ngaySinh)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card Footer Status */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingTop: 10,
                                borderTop: "1px dashed #e2e8f0",
                              }}
                            >
                              <span
                                style={{
                                  background: toCfg.badgeBg,
                                  color: "white",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  padding: "2px 8px",
                                  borderRadius: 8,
                                }}
                              >
                                {toCfg.name}
                              </span>

                              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#0284c7", fontSize: "0.78rem", fontWeight: 700 }}>
                                Xem hồ sơ <ChevronRight size={13} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ====== VIEW 2: MODERN EXPANSIVE TABLE VIEW ====== */
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {studentsByTo.map(({ to, list }) => {
                if (list.length === 0) return null;
                const toCfg = TO_STYLES[to];

                return (
                  <div
                    key={to}
                    style={{
                      background: "#ffffff",
                      borderRadius: 18,
                      border: `1.5px solid ${toCfg.border}`,
                      overflow: "hidden",
                      boxShadow: "0 3px 12px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 18px",
                        background: toCfg.lightBg,
                        borderBottom: `1.5px solid ${toCfg.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: toCfg.badgeBg }}></span>
                        <h3 style={{ color: toCfg.text, fontSize: "0.98rem", fontWeight: 900, margin: 0 }}>
                          {toCfg.name}
                        </h3>
                      </div>
                      <span style={{ fontSize: "0.78rem", fontWeight: 800, color: toCfg.text }}>
                        {list.length} học sinh
                      </span>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table className="table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ width: 44, textAlign: "center" }}>#</th>
                            <th>Học sinh</th>
                            <th>Tên gọi</th>
                            <th>Giới tính</th>
                            <th>Ngày sinh</th>
                            <th style={{ textAlign: "right" }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((st, idx) => (
                            <tr
                              key={st.id}
                              onClick={() => openStudentModal(st)}
                              style={{ cursor: "pointer" }}
                            >
                              <td style={{ textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>
                                {idx + 1}
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 8,
                                      background: toCfg.lightBg,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 800,
                                      fontSize: "0.8rem",
                                      color: toCfg.text,
                                      overflow: "hidden",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {st.avatar ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={st.avatar} alt={st.hoTen} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                      st.hoTen.substring(0, 2)
                                    )}
                                  </div>
                                  <span style={{ fontWeight: 800, color: "#0f172a" }}>{st.hoTen}</span>
                                </div>
                              </td>
                              <td style={{ color: "#64748b", fontWeight: 600 }}>{st.tenGoi || "—"}</td>
                              <td>
                                <span style={{ color: st.gioiTinh === "Nữ" ? "#ec4899" : "#0284c7", fontWeight: 700, fontSize: "0.82rem" }}>
                                  {st.gioiTinh}
                                </span>
                              </td>
                              <td style={{ color: "#64748b", fontSize: "0.85rem" }}>{formatDate(st.ngaySinh)}</td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openStudentModal(st);
                                  }}
                                  style={{
                                    background: "#e0f2fe",
                                    border: "none",
                                    color: "#0369a1",
                                    fontWeight: 800,
                                    fontSize: "0.78rem",
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                  }}
                                >
                                  Xem hồ sơ
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ====== TAB 2: QUỸ LỚP VỚI THANH GÕ TÌM KIẾM THEO TÊN HỌC VIÊN ====== */}
      {/* ========================================================================= */}
      {tab === "quy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Summary KPIs */}
          {feeSummary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {[
                { label: "Tổng quỹ đã thu", value: formatVND(feeSummary.tongThu), color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: <TrendingUp size={22} color="#16a34a" /> },
                { label: "Tổng chi phí", value: formatVND(feeSummary.tongChi), color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <Wallet size={22} color="#dc2626" /> },
                { label: "Số dư khả dụng", value: formatVND(feeSummary.conLai), color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd", icon: <CheckCircle size={22} color="#0284c7" /> },
              ].map((kpi, i) => (
                <div
                  key={i}
                  style={{
                    background: kpi.bg,
                    border: `1.5px solid ${kpi.border}`,
                    borderRadius: 18,
                    padding: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ color: kpi.color, fontSize: "1.6rem", fontWeight: 900 }}>
                      {kpi.value}
                    </div>
                    <div style={{ color: "#475569", fontSize: "0.82rem", fontWeight: 700, marginTop: 4 }}>
                      {kpi.label}
                    </div>
                  </div>
                  {kpi.icon}
                </div>
              ))}
            </div>
          )}

          {/* Dedicated Student Name Search for Fund Status */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: "24px",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Search size={18} color="#0284c7" />
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Tra cứu tình trạng đóng quỹ theo tên học sinh
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.82rem", margin: 0 }}>
                  Gõ tên học sinh để xem nhanh lịch sử đóng tiền quỹ
                </p>
              </div>
            </div>

            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                className="input"
                style={{ paddingLeft: 42, height: 44, borderRadius: 12, border: "1.5px solid #cbd5e1" }}
                placeholder="Gõ họ tên học sinh cần tra cứu..."
                value={searchFundStudent}
                onChange={(e) => setSearchFundStudent(e.target.value)}
              />
              {searchFundStudent && (
                <button
                  type="button"
                  onClick={() => setSearchFundStudent("")}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Matching students list */}
            {searchFundStudent.trim() && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10, marginBottom: 20 }}>
                {students
                  .filter((s) => s.hoTen.toLowerCase().includes(searchFundStudent.toLowerCase()))
                  .map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => openStudentModal(st)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1.5px solid #bae6fd",
                        background: "#f0f9ff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        textAlign: "left",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0369a1" }}>{st.hoTen}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Tổ {st.to} • Lớp {st.lop}</div>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#0284c7", fontWeight: 700 }}>Xem quỹ →</span>
                    </button>
                  ))}
              </div>
            )}

            {/* Chi tiết các khoản chi */}
            {feeSummary?.chiTheoHangMuc && feeSummary.chiTheoHangMuc.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1e293b", marginBottom: 10 }}>
                  Danh sách hạng mục chi tiêu gần đây
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                  {feeSummary.chiTheoHangMuc.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "12px 16px",
                        background: "#f8fafc",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
                        {item.hangMucChi}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#dc2626" }}>
                        {formatVND(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ====== TAB 3: ĐIỂM DANH & CHUYÊN CẦN VỚI TÌM KIẾM TÊN HỌC VIÊN ====== */}
      {/* ========================================================================= */}
      {tab === "diem-danh" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: "24px",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={18} color="#16a34a" />
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Tra cứu chuyên cần & điểm danh cá nhân
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.82rem", margin: 0 }}>
                  Gõ tên học sinh để xem chi tiết số buổi vắng, phép hoặc đi trễ
                </p>
              </div>
            </div>

            {/* Search Student for Attendance */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                className="input"
                style={{ paddingLeft: 42, height: 44, borderRadius: 12, border: "1.5px solid #cbd5e1" }}
                placeholder="Gõ tên học sinh để kiểm tra chuyên cần..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
              {students
                .filter((s) => !search || s.hoTen.toLowerCase().includes(search.toLowerCase()))
                .slice(0, 12)
                .map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => openStudentModal(st)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1.5px solid #e2e8f0",
                      background: "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#0284c7";
                      e.currentTarget.style.background = "#f0f9ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.background = "#ffffff";
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>{st.hoTen}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Tổ {st.to}</div>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#0284c7", fontWeight: 700 }}>Xem lịch sử →</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ====== TAB 4: LỊCH TRỰC NHẬT & SỰ KIỆN LỚP ====== */}
      {/* ========================================================================= */}
      {tab === "truc-nhat" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Lịch trực nhật */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: "24px",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Calendar size={18} color="#d97706" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Lịch trực nhật vệ sinh lớp học
                  </h3>
                  <p style={{ color: "#64748b", fontSize: "0.82rem", margin: 0 }}>
                    Phân công trực nhật tuần này: {currentWeek}
                  </p>
                </div>
              </div>

              {/* Quick Search Student in Duty */}
              <div style={{ position: "relative", minWidth: 220 }}>
                <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  className="input"
                  style={{ paddingLeft: 34, height: 36, fontSize: "0.82rem", borderRadius: 10 }}
                  placeholder="Tìm học sinh trực nhật..."
                  value={searchDutyStudent}
                  onChange={(e) => setSearchDutyStudent(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {duty.map((d) => {
                const isMatched = searchDutyStudent.trim() && d.students.some((s) => s.toLowerCase().includes(searchDutyStudent.toLowerCase()));
                return (
                  <div
                    key={d.thu}
                    style={{
                      borderRadius: 14,
                      border: isMatched ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                      background: isMatched ? "#f0f9ff" : "#f8fafc",
                      padding: "14px",
                      boxShadow: isMatched ? "0 4px 12px rgba(2,132,199,0.15)" : "none",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: "0.92rem", color: isMatched ? "#0284c7" : "#0f172a", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                      {d.thu}
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{d.students.length} bạn</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {d.students.map((name, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            color: searchDutyStudent && name.toLowerCase().includes(searchDutyStudent.toLowerCase()) ? "#0284c7" : "#334155",
                            background: "white",
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sự kiện lớp */}
          {events.length > 0 && (
            <div
              style={{
                background: "#ffffff",
                borderRadius: 20,
                padding: "24px",
                border: "1.5px solid #e2e8f0",
              }}
            >
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Star size={18} color="#f59e0b" /> Sự kiện & Phong trào của lớp
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      borderRadius: 14,
                      border: "1.5px solid #e2e8f0",
                      padding: "16px",
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800 }}>{evt.tenSuKien}</h4>
                      <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>{evt.trangThai}</span>
                    </div>
                    {evt.hangMuc && <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 6 }}>Hạng mục: {evt.hangMuc}</div>}
                    {evt.deadline && <div style={{ fontSize: "0.78rem", color: "#dc2626", fontWeight: 700 }}>Hạn: {formatDate(evt.deadline)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ====== POPUP MODAL: HỒ SƠ CHI TIẾT HỌC SINH (LUXURIOUS DRAWER) ====== */}
      {/* ========================================================================= */}
      {selectedStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              width: "100%",
              maxWidth: 580,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "26px 28px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              border: "2px solid #e2e8f0",
              position: "relative",
              animation: "slideUp 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              <X size={18} />
            </button>

            {/* Profile Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: "1.5px solid #f1f5f9" }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 18,
                  background: TO_STYLES[selectedStudent.to]?.lightBg || "#e0f2fe",
                  border: `2.5px solid ${TO_STYLES[selectedStudent.to]?.border || "#38bdf8"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {selectedStudent.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedStudent.avatar} alt={selectedStudent.hoTen} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontWeight: 900, fontSize: "1.5rem", color: TO_STYLES[selectedStudent.to]?.text || "#0369a1" }}>
                    {selectedStudent.hoTen.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>
                  {selectedStudent.hoTen}
                </h2>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ background: TO_STYLES[selectedStudent.to]?.badgeBg || "#0284c7", color: "white", fontSize: "0.75rem", fontWeight: 800, padding: "2px 8px", borderRadius: 8 }}>
                    {TO_STYLES[selectedStudent.to]?.name || `Tổ ${selectedStudent.to}`}
                  </span>
                  <span style={{ background: "#f1f5f9", color: "#475569", fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>
                    Lớp {selectedStudent.lop}
                  </span>
                  <span style={{ background: "#f1f5f9", color: selectedStudent.gioiTinh === "Nữ" ? "#ec4899" : "#0284c7", fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>
                    {selectedStudent.gioiTinh}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Section 1: Quỹ Lớp */}
              <div style={{ background: "#f8fafc", borderRadius: 14, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: "0.9rem", color: "#0369a1", marginBottom: 8 }}>
                  <Wallet size={16} /> Tình trạng Quỹ Lớp
                </div>
                {loadingProfile ? (
                  <div className="skeleton" style={{ height: 40 }} />
                ) : studentFeeDetails.length === 0 ? (
                  <div style={{ color: "#16a34a", fontSize: "0.82rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle size={15} /> Đã hoàn thành đóng đầy đủ các kỳ quỹ
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {studentFeeDetails.map((f, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", background: "white", padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <span style={{ fontWeight: 700 }}>{f.kyThu} ({formatVND(f.soTien)})</span>
                        <span style={{ color: f.trangThai === "Đã Đóng" ? "#16a34a" : "#dc2626", fontWeight: 800 }}>
                          {f.trangThai}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Chuyên cần */}
              <div style={{ background: "#f8fafc", borderRadius: 14, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: "0.9rem", color: "#15803d", marginBottom: 8 }}>
                  <BookOpen size={16} /> Chuyên cần & Điểm danh
                </div>
                {loadingProfile ? (
                  <div className="skeleton" style={{ height: 40 }} />
                ) : studentAttendanceDetails.length === 0 ? (
                  <div style={{ color: "#16a34a", fontSize: "0.82rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle size={15} /> Chuyên cần xuất sắc! Không có lượt vắng hay trễ nào.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {studentAttendanceDetails.map((a, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", background: "white", padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <span style={{ fontWeight: 700 }}>{formatDate(a.ngay)}</span>
                        <span style={{ color: "#dc2626", fontWeight: 800 }}>{a.loai}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Action Button */}
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <Link
                href={`/so-do-lop?lop=${selectedStudent.lop}`}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "#0284c7",
                  color: "white",
                  padding: "10px",
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: "0.88rem",
                  textDecoration: "none",
                }}
              >
                <LayoutGrid size={16} /> Xem Vị Trí Ngồi Trên Sơ Đồ
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
