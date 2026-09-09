"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  Calendar,
  Wallet,
  Star,
  UserCog,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  LayoutGrid,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  Plus,
  FileSpreadsheet,
  Layers,
  Award,
  Flame,
  CheckCircle2,
  Database,
  Printer,
  ChevronDown,
  GraduationCap,
  School,
} from "lucide-react";
import { formatVND } from "@/lib/format";

export interface ClassSummary {
  lop: string;
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  gvcn: string;
  lopTruong: string;
  lopPho: string;
  feeSummary: { tongThu: number; tongChi: number; conLai: number };
  seatingSlots: number;
}

export interface AdminDashboardProps {
  stats: {
    totalStudents: number;
    maleCount: number;
    femaleCount: number;
    totalClasses?: number;
    classList?: string[];
    classSummaries?: ClassSummary[];
    groupCounts: { to1: number; to2: number; to3: number; to4: number };
    leaders: {
      lopTruong: string;
      lopPho: string;
      gvcn: string;
      t1Leader: string;
      t2Leader: string;
      t3Leader: string;
      t4Leader: string;
    };
    totalAttendance: number;
    totalEvents: number;
    feeSummary: { tongThu: number; tongChi: number; conLai: number } | null;
    assignedLop?: string;
    showFee: boolean;
    isSuperAdmin: boolean;
    upcomingEvents: Array<{ id: number; tieuDe: string; ngayBatDau: string; loaiSuKien: string; diaDiem: string | null }>;
    upcomingExams: Array<{ id: number; monHoc: string; ngayThi: string; hinhThuc: string; thoiGianLamBai: number }>;
    currentDuty: { tuan: string; to: number; studentName: string | null; lop?: string } | null;
    seatingChartSlotsCount: number;
  };
}

export default function AdminDashboard({ stats }: AdminDashboardProps) {
  const [currentDateStr, setCurrentDateStr] = useState("");

  useEffect(() => {
    const now = new Date();
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = days[now.getDay()];
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    setCurrentDateStr(`${dayName}, Ngày ${d}/${m}/${y}`);
  }, []);

  const isAllClass = stats.assignedLop === "ALL";
  const lopTitle = isAllClass ? "Tổng Quan Toàn Trường" : `Lớp ${stats.assignedLop || "12T2"}`;
  const singleLopDefault = stats.assignedLop && stats.assignedLop !== "ALL" ? stats.assignedLop : "12T2";

  // 8 Core Functional Modules
  const coreModules = [
    {
      title: "Sơ đồ lớp học",
      desc: isAllClass ? "Sơ đồ vị trí các lớp • Xuất chuẩn in A4" : "56 chỗ • Kéo thả chuột • Xuất chuẩn in A4",
      href: isAllClass ? "/admin/so-do-lop" : `/admin/so-do-lop?lop=${singleLopDefault}`,
      icon: <LayoutGrid size={22} />,
      badge: `${stats.seatingChartSlotsCount} Chỗ`,
      badgeColor: "#0284c7",
      color: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
      bgLight: "#f0f9ff",
      borderColor: "#bae6fd",
    },
    {
      title: "Danh sách học sinh",
      desc: `${stats.totalStudents} học sinh • ${isAllClass ? `${stats.totalClasses || 2} Lớp` : "4 Tổ"} • Phân quyền`,
      href: isAllClass ? "/admin/hoc-sinh?lop=ALL" : `/admin/hoc-sinh?lop=${singleLopDefault}`,
      icon: <Users size={22} />,
      badge: `${stats.totalStudents} Bạn`,
      badgeColor: "#16a34a",
      color: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
      bgLight: "#f0fdf4",
      borderColor: "#bbf7d0",
    },
    {
      title: "Sổ thu chi Quỹ lớp",
      desc: isAllClass ? "Tổng quỹ toàn trường & đối soát chi tiết" : "Thu quỹ, chi tiêu hóa đơn & đối soát",
      href: isAllClass ? "/admin/quy?lop=ALL" : `/admin/quy?lop=${singleLopDefault}`,
      icon: <Wallet size={22} />,
      badge: stats.feeSummary ? formatVND(stats.feeSummary.conLai) : "0 ₫",
      badgeColor: "#8b5cf6",
      color: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
      bgLight: "#f5f3ff",
      borderColor: "#ddd6fe",
    },
    {
      title: "Điểm danh & Chuyên cần",
      desc: "Theo dõi hiện diện, vắng, trễ hàng ngày",
      href: "/admin/diem-danh",
      icon: <BookOpen size={22} />,
      badge: `${stats.totalAttendance} Lần`,
      badgeColor: "#f59e0b",
      color: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      bgLight: "#fffbeb",
      borderColor: "#fef3c7",
    },
    {
      title: "Thời khóa biểu",
      desc: isAllClass ? "Lịch học các khối lớp & Phòng học" : "Lịch học 6 ngày trong tuần & Phòng học",
      href: isAllClass ? `/admin/thoi-khoa-bieu?lop=${singleLopDefault}` : `/admin/thoi-khoa-bieu?lop=${singleLopDefault}`,
      icon: <Calendar size={22} />,
      badge: "6 Ngày",
      badgeColor: "#06b6d4",
      color: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
      bgLight: "#ecfeff",
      borderColor: "#cffafe",
    },
    {
      title: "Lịch thi & Kiểm tra",
      desc: "Kế hoạch thi giữa kỳ, học kỳ & kết quả",
      href: isAllClass ? "/admin/lich-thi?lop=ALL" : `/admin/lich-thi?lop=${singleLopDefault}`,
      icon: <GraduationCap size={22} />,
      badge: "Học kỳ 1",
      badgeColor: "#ec4899",
      color: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
      bgLight: "#fdf2f8",
      borderColor: "#fbcfe8",
    },
    {
      title: "Lịch trực nhật tuần",
      desc: isAllClass ? "Phân công luân phiên trực nhật các lớp" : "Phân công 4 Tổ luân phiên trực nhật",
      href: isAllClass ? "/admin/lich-truc?lop=ALL" : `/admin/lich-truc?lop=${singleLopDefault}`,
      icon: <Layers size={22} />,
      badge: isAllClass ? "Lịch tuần" : `Tổ ${stats.currentDuty?.to || 1} Trực`,
      badgeColor: "#10b981",
      color: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      bgLight: "#ecfdf5",
      borderColor: "#a7f3d0",
    },
    {
      title: "Báo cáo & Xuất Excel",
      desc: "Tổng hợp số liệu, xuất file & in ấn",
      href: isAllClass ? "/admin/bao-cao?lop=ALL" : `/admin/bao-cao?lop=${singleLopDefault}`,
      icon: <BarChart3 size={22} />,
      badge: "Báo cáo Pro",
      badgeColor: "#6366f1",
      color: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
      bgLight: "#eef2ff",
      borderColor: "#c7d2fe",
    },
  ];

  if (stats.isSuperAdmin) {
    coreModules.push({
      title: "Quản trị người dùng",
      desc: "Tạo tài khoản cán sự, phân quyền module",
      href: "/admin/nguoi-dung",
      icon: <UserCog size={22} />,
      badge: "Bảo mật",
      badgeColor: "#0f172a",
      color: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      bgLight: "#f8fafc",
      borderColor: "#cbd5e1",
    });
  }

  // 4 Groups Info (Dùng khi xem 1 lớp cụ thể)
  const groups = [
    {
      id: 1,
      name: "Tổ 1",
      count: stats.groupCounts.to1,
      leader: stats.leaders.t1Leader,
      color: "#0284c7",
      bg: "#e0f2fe",
      border: "#38bdf8",
      members: `${stats.groupCounts.to1} Học sinh`,
    },
    {
      id: 2,
      name: "Tổ 2",
      count: stats.groupCounts.to2,
      leader: stats.leaders.t2Leader,
      color: "#16a34a",
      bg: "#dcfce7",
      border: "#4ade80",
      members: `${stats.groupCounts.to2} Học sinh`,
    },
    {
      id: 3,
      name: "Tổ 3",
      count: stats.groupCounts.to3,
      leader: stats.leaders.t3Leader,
      color: "#d97706",
      bg: "#fef3c7",
      border: "#fcd34d",
      members: `${stats.groupCounts.to3} Học sinh`,
    },
    {
      id: 4,
      name: "Tổ 4",
      count: stats.groupCounts.to4,
      leader: stats.leaders.t4Leader,
      color: "#9333ea",
      bg: "#f3e8ff",
      border: "#c084fc",
      members: `${stats.groupCounts.to4} Học sinh`,
    },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* ========================================================================= */}
      {/* 1. HERO COMMAND CENTER BANNER                                             */}
      {/* ========================================================================= */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0369a1 100%)",
          borderRadius: 24,
          padding: "clamp(18px, 4vw, 30px) clamp(16px, 4vw, 32px)",
          color: "white",
          marginBottom: 24,
          boxShadow: "0 14px 34px rgba(2,132,199,0.22)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient Glows */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 240,
            height: 240,
            background: "radial-gradient(circle, rgba(56,189,248,0.3) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Badges Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span
              style={{
                background: "rgba(56, 189, 248, 0.2)",
                border: "1px solid rgba(56, 189, 248, 0.5)",
                color: "#38bdf8",
                fontSize: "0.72rem",
                fontWeight: 900,
                padding: "4px 10px",
                borderRadius: 20,
                letterSpacing: "0.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Sparkles size={11} /> {isAllClass ? "BẢNG ĐIỀU KHIỂN TRUNG TÂM • TOÀN TRƯỜNG" : "BẢNG ĐIỀU KHIỂN TRUNG TÂM"}
            </span>

            <span
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 20,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Clock size={11} /> {currentDateStr || "Hôm nay"}
            </span>

            <span
              style={{
                background: "rgba(34, 197, 94, 0.2)",
                border: "1px solid rgba(34, 197, 94, 0.4)",
                color: "#4ade80",
                fontSize: "0.72rem",
                fontWeight: 800,
                padding: "4px 10px",
                borderRadius: 20,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Database size={11} /> Cloud Supabase: Online
            </span>
          </div>

          {/* Title & Slogan */}
          <h1
            style={{
              fontSize: "clamp(1.35rem, 4vw, 2.1rem)",
              fontWeight: 900,
              margin: "0 0 6px",
              color: "#ffffff",
              letterSpacing: "-0.5px",
              lineHeight: 1.25,
            }}
          >
            Hệ Thống Quản Lý — {lopTitle}
          </h1>

          {/* Thông tin lãnh đạo: Phân tách rõ ràng Toàn Trường vs 1 Lớp cụ thể */}
          {!isAllClass ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                margin: "6px 0 16px",
                background: "rgba(255, 255, 255, 0.07)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 12,
                padding: "10px 14px",
                backdropFilter: "blur(6px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.86rem" }}>
                <span style={{ color: "#38bdf8", fontWeight: 700, minWidth: 92 }}>• GVCN:</span>
                <strong style={{ color: "#ffffff", letterSpacing: "0.2px" }}>{stats.leaders.gvcn}</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.86rem" }}>
                <span style={{ color: "#4ade80", fontWeight: 700, minWidth: 92 }}>• Lớp trưởng:</span>
                <strong style={{ color: "#ffffff", letterSpacing: "0.2px" }}>{stats.leaders.lopTruong}</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.86rem" }}>
                <span style={{ color: "#fcd34d", fontWeight: 700, minWidth: 92 }}>• Lớp phó:</span>
                <strong style={{ color: "#ffffff", letterSpacing: "0.2px" }}>{stats.leaders.lopPho}</strong>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                margin: "6px 0 16px",
                background: "rgba(255, 255, 255, 0.07)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 12,
                padding: "10px 14px",
                backdropFilter: "blur(6px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.86rem", flexWrap: "wrap" }}>
                <span style={{ color: "#38bdf8", fontWeight: 700 }}>• Quy mô trường:</span>
                <strong style={{ color: "#ffffff" }}>
                  {stats.totalClasses || stats.classSummaries?.length || 2} Lớp học ({stats.classList?.join(", ") || "12T2, 12A2"})
                </strong>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>|</span>
                <span style={{ color: "#4ade80", fontWeight: 700 }}>• Tổng học sinh:</span>
                <strong style={{ color: "#ffffff" }}>
                  {stats.totalStudents} Bạn ({stats.maleCount} Nam • {stats.femaleCount} Nữ)
                </strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.86rem", flexWrap: "wrap" }}>
                <span style={{ color: "#fcd34d", fontWeight: 700 }}>• Ngân quỹ toàn trường:</span>
                <strong style={{ color: "#ffffff", letterSpacing: "0.2px" }}>
                  {stats.feeSummary ? formatVND(stats.feeSummary.conLai) : "0 ₫"}
                </strong>
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.75)" }}>
                  (Tổng thu: {stats.feeSummary ? formatVND(stats.feeSummary.tongThu) : "0 ₫"} • Tổng chi: {stats.feeSummary ? formatVND(stats.feeSummary.tongChi) : "0 ₫"})
                </span>
              </div>
            </div>
          )}

          {/* Grid 4 Thẻ Thông Tin & Nút Thao Tác */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
              gap: 10,
              width: "100%",
            }}
          >
            {/* 1. Thẻ Sĩ số */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.09)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                backdropFilter: "blur(10px)",
                borderRadius: 14,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxSizing: "border-box",
                width: "100%",
                minHeight: 60,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(56, 189, 248, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                }}
              >
                <Users size={19} color="#38bdf8" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {isAllClass ? "TỔNG SĨ SỐ TOÀN TRƯỜNG" : "SĨ SỐ HỌC SINH"}
                </div>
                <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "0.92rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {stats.totalStudents} Học sinh <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500, fontSize: "0.78rem" }}>({stats.maleCount} Nam • {stats.femaleCount} Nữ)</span>
                </div>
              </div>
            </div>

            {/* 2. Thẻ Cơ cấu */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.09)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                backdropFilter: "blur(10px)",
                borderRadius: 14,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxSizing: "border-box",
                width: "100%",
                minHeight: 60,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(74, 222, 128, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid rgba(74, 222, 128, 0.35)",
                }}
              >
                <Layers size={19} color="#4ade80" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {isAllClass ? "QUY MÔ LỚP HỌC" : "CƠ CẤU PHÂN BỔ"}
                </div>
                <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "0.92rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {isAllClass ? `${stats.totalClasses || stats.classSummaries?.length || 2} Lớp học` : "4 Tổ học tập"} <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500, fontSize: "0.78rem" }}>({isAllClass ? (stats.classList?.join(" • ") || "12T2 • 12A2") : "Tổ 1 đến Tổ 4"})</span>
                </div>
              </div>
            </div>

            {/* 3. Nút Sơ Đồ Lớp */}
            <Link href={isAllClass ? "/admin/so-do-lop" : `/admin/so-do-lop?lop=${singleLopDefault}`} style={{ textDecoration: "none", width: "100%", display: "block" }}>
              <div
                style={{
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: 14,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 14px rgba(2,132,199,0.35)",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  width: "100%",
                  minHeight: 60,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <LayoutGrid size={19} color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>
                      SƠ ĐỒ CHỖ NGỒI
                    </div>
                    <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "0.95rem" }}>
                      {isAllClass ? "Sơ Đồ Các Lớp" : "Sơ Đồ Lớp Học"}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} color="rgba(255,255,255,0.9)" />
              </div>
            </Link>

            {/* 4. Nút Quản Lý Học Sinh */}
            <Link href={isAllClass ? "/admin/hoc-sinh?lop=ALL" : `/admin/hoc-sinh?lop=${singleLopDefault}`} style={{ textDecoration: "none", width: "100%", display: "block" }}>
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 14,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  width: "100%",
                  minHeight: 60,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Users size={19} color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>
                      {isAllClass ? "TOÀN TRƯỜNG" : "DANH SÁCH LỚP"}
                    </div>
                    <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "0.95rem" }}>
                      Quản Lý {stats.totalStudents} Học Sinh
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} color="rgba(255,255,255,0.9)" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP 4 EXECUTIVE KPI CARDS                                              */}
      {/* ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {/* Card 1: Học Sinh */}
        <Link href={isAllClass ? "/admin/hoc-sinh?lop=ALL" : `/admin/hoc-sinh?lop=${singleLopDefault}`} style={{ textDecoration: "none" }}>
          <div
            className="card"
            style={{
              padding: "20px 22px",
              background: "#ffffff",
              borderRadius: 18,
              border: "1px solid var(--border)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 24px rgba(2,132,199,0.12)";
              (e.currentTarget as HTMLElement).style.borderColor = "#38bdf8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.03)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {isAllClass ? "Sĩ số toàn trường" : `Sĩ số lớp ${singleLopDefault}`}
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#e0f2fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0284c7",
                }}
              >
                <Users size={18} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: "2.1rem", fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
                {stats.totalStudents}
              </span>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#16a34a" }}>
                100% đầy đủ
              </span>
            </div>

            {/* Mini Progress Bars for Male & Female */}
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600, display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>👨 Nam: <strong>{stats.maleCount}</strong></span>
              <span>👩 Nữ: <strong>{stats.femaleCount}</strong></span>
            </div>
            <div style={{ width: "100%", height: 6, background: "#f1f5f9", borderRadius: 10, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${stats.totalStudents > 0 ? (stats.maleCount / stats.totalStudents) * 100 : 50}%`, background: "#0284c7" }} />
              <div style={{ width: `${stats.totalStudents > 0 ? (stats.femaleCount / stats.totalStudents) * 100 : 50}%`, background: "#ec4899" }} />
            </div>
          </div>
        </Link>

        {/* Card 2: Sơ Đồ Chỗ Ngồi */}
        <Link href={isAllClass ? "/admin/so-do-lop" : `/admin/so-do-lop?lop=${singleLopDefault}`} style={{ textDecoration: "none" }}>
          <div
            className="card"
            style={{
              padding: "20px 22px",
              background: "#ffffff",
              borderRadius: 18,
              border: "1px solid var(--border)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 24px rgba(22,163,74,0.12)";
              (e.currentTarget as HTMLElement).style.borderColor = "#4ade80";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.03)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Sơ đồ chỗ ngồi
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#16a34a",
                }}
              >
                <LayoutGrid size={18} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: "2.1rem", fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
                {stats.seatingChartSlotsCount}
              </span>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#16a34a" }}>
                {isAllClass ? `Chỗ trên ${stats.totalClasses || stats.classSummaries?.length || 2} lớp` : "Đã bố trí 7 hàng"}
              </span>
            </div>

            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
              <span>{isAllClass ? "Sơ đồ các lớp học" : "2 Dãy • Bàn GV phía dưới"}</span>
              <span style={{ color: "#0284c7", fontWeight: 800 }}>In chuẩn A4 →</span>
            </div>
          </div>
        </Link>

        {/* Card 3: Chuyên Cần & Kỷ Luật */}
        <Link href="/admin/diem-danh" style={{ textDecoration: "none" }}>
          <div
            className="card"
            style={{
              padding: "20px 22px",
              background: "#ffffff",
              borderRadius: 18,
              border: "1px solid var(--border)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 24px rgba(217,119,6,0.12)";
              (e.currentTarget as HTMLElement).style.borderColor = "#fcd34d";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.03)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Kỷ luật & Chuyên cần
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#d97706",
                }}
              >
                <BookOpen size={18} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: "2.1rem", fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
                100%
              </span>
              <span style={{ fontSize: "0.825rem", fontWeight: 800, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: 8 }}>
                Xuất sắc
              </span>
            </div>

            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
              <span>{stats.totalAttendance} Lượt ghi nhận</span>
              <span style={{ color: "#d97706", fontWeight: 800 }}>Điểm danh →</span>
            </div>
          </div>
        </Link>

        {/* Card 4: Quỹ Lớp (Gradient Premium Card) */}
        <Link href={isAllClass ? "/admin/quy?lop=ALL" : `/admin/quy?lop=${singleLopDefault}`} style={{ textDecoration: "none" }}>
          <div
            className="card"
            style={{
              padding: "20px 22px",
              background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0284c7 100%)",
              borderRadius: 18,
              border: "none",
              boxShadow: "0 8px 24px rgba(37,99,235,0.25)",
              transition: "all 0.2s ease",
              cursor: "pointer",
              color: "white",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 30px rgba(37,99,235,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(37,99,235,0.25)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {isAllClass ? "Tổng số dư quỹ toàn trường" : `Số dư quỹ lớp ${singleLopDefault}`}
              </span>
              <Wallet size={18} color="white" />
            </div>

            <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px", marginBottom: 10 }}>
              {stats.feeSummary ? formatVND(stats.feeSummary.conLai) : "0 ₫"}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
              <span>Thu: <strong style={{ color: "#ffffff" }}>{stats.feeSummary ? formatVND(stats.feeSummary.tongThu) : "0 ₫"}</strong></span>
              <span>Chi: <strong style={{ color: "#ffffff" }}>{stats.feeSummary ? formatVND(stats.feeSummary.tongChi) : "0 ₫"}</strong></span>
            </div>
          </div>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 3. CƠ CẤU & DANH SÁCH LỚP HỌC (TOÀN TRƯỜNG vs 4 TỔ 1 LỚP)                 */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: 28 }}>
        {isAllClass ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Danh Sách & Cơ Cấu Các Lớp Học Toàn Trường
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.825rem", margin: 0 }}>
                  Quản lý độc lập {stats.totalClasses || stats.classSummaries?.length || 2} lớp học với tổng {stats.totalStudents} học sinh
                </p>
              </div>

              <Link href="/admin/hoc-sinh?lop=ALL" style={{ textDecoration: "none", fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>
                Xem toàn bộ {stats.totalStudents} học sinh →
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 16 }}>
              {stats.classSummaries && stats.classSummaries.length > 0 ? (
                stats.classSummaries.map((c, idx) => {
                  const palette = [
                    { border: "#38bdf8", badgeBg: "#e0f2fe", badgeColor: "#0284c7", btnGradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" },
                    { border: "#4ade80", badgeBg: "#dcfce7", badgeColor: "#16a34a", btnGradient: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" },
                    { border: "#c084fc", badgeBg: "#f3e8ff", badgeColor: "#9333ea", btnGradient: "linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)" },
                    { border: "#fcd34d", badgeBg: "#fef3c7", badgeColor: "#d97706", btnGradient: "linear-gradient(135deg, #d97706 0%, #b45309 100%)" },
                  ][idx % 4];

                  return (
                    <div
                      key={c.lop}
                      className="card"
                      style={{
                        padding: "18px 20px",
                        borderRadius: 18,
                        border: `1.5px solid ${palette.border}`,
                        background: "#ffffff",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 14,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div>
                        {/* Class Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                background: palette.badgeBg,
                                color: palette.badgeColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 900,
                                fontSize: "0.95rem",
                              }}
                            >
                              {c.lop.substring(0, 3)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "#0f172a" }}>
                                Lớp {c.lop}
                              </div>
                              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 600 }}>
                                Niên khóa 2025–2026
                              </div>
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              color: palette.badgeColor,
                              background: palette.badgeBg,
                              padding: "4px 10px",
                              borderRadius: 12,
                              border: `1px solid ${palette.border}`,
                            }}
                          >
                            {c.totalStudents} Học sinh
                          </span>
                        </div>

                        {/* Class Details */}
                        <div
                          style={{
                            background: "#f8fafc",
                            borderRadius: 12,
                            padding: "10px 12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            fontSize: "0.83rem",
                            border: "1px solid #f1f5f9",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>• GVCN:</span>
                            <strong style={{ color: "#0f172a" }}>{c.gvcn}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>• Lớp trưởng:</span>
                            <strong style={{ color: "#0f172a" }}>{c.lopTruong}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>• Lớp phó:</span>
                            <strong style={{ color: "#0f172a" }}>{c.lopPho}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>• Cơ cấu Nam/Nữ:</span>
                            <span style={{ color: "#334155", fontWeight: 700 }}>
                              {c.maleCount} Nam • {c.femaleCount} Nữ
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #e2e8f0", paddingTop: 5, marginTop: 2 }}>
                            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>• Quỹ lớp đã thu:</span>
                            <strong style={{ color: "#16a34a" }}>{formatVND(c.feeSummary.conLai)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Action Links */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Link
                          href={`/admin?lop=${c.lop}`}
                          style={{
                            flex: 1,
                            background: palette.btnGradient,
                            color: "white",
                            padding: "8px 12px",
                            borderRadius: 10,
                            textDecoration: "none",
                            fontWeight: 700,
                            fontSize: "0.825rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }}
                        >
                          <span>Quản lý Lớp {c.lop}</span>
                          <ArrowUpRight size={14} />
                        </Link>
                        <Link
                          href={`/admin/hoc-sinh?lop=${c.lop}`}
                          style={{
                            background: "#f1f5f9",
                            color: "#334155",
                            padding: "8px 12px",
                            borderRadius: 10,
                            textDecoration: "none",
                            fontWeight: 700,
                            fontSize: "0.825rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Users size={13} />
                          <span>DS</span>
                        </Link>
                        <Link
                          href={`/admin/so-do-lop?lop=${c.lop}`}
                          style={{
                            background: "#f1f5f9",
                            color: "#334155",
                            padding: "8px 12px",
                            borderRadius: 10,
                            textDecoration: "none",
                            fontWeight: 700,
                            fontSize: "0.825rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <LayoutGrid size={13} />
                          <span>Sơ đồ</span>
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: 20 }}>
                  Không có dữ liệu lớp học
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Cơ Cấu & Ban Cán Sự 4 Tổ Lớp {singleLopDefault}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.825rem", margin: 0 }}>
                  Phân bổ {stats.totalStudents} bạn đều 4 tổ học tập và rèn luyện
                </p>
              </div>

              <Link href={`/admin/hoc-sinh?lop=${singleLopDefault}`} style={{ textDecoration: "none", fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>
                Xem danh sách {stats.totalStudents} bạn →
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 14 }}>
              {groups.map((g) => (
                <Link key={g.id} href={`/admin/hoc-sinh?lop=${singleLopDefault}&to=${g.id}`} style={{ textDecoration: "none" }}>
                  <div
                    className="card"
                    style={{
                      padding: "16px 18px",
                      borderRadius: 16,
                      border: `1.5px solid ${g.border}`,
                      background: "#ffffff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                      transition: "all 0.15s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                      (e.currentTarget as HTMLElement).style.background = g.bg;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "";
                      (e.currentTarget as HTMLElement).style.background = "#ffffff";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: g.color,
                            color: "white",
                            fontWeight: 900,
                            fontSize: "0.8rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          T{g.id}
                        </div>
                        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                          {g.name}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          color: g.color,
                          background: g.bg,
                          padding: "2px 8px",
                          borderRadius: 12,
                          border: `1px solid ${g.border}`,
                        }}
                      >
                        {g.count} Học sinh
                      </span>
                    </div>

                    <div style={{ fontSize: "0.825rem", color: "#334155", fontWeight: 700, marginBottom: 4 }}>
                      👑 Tổ trưởng: <span style={{ color: g.color }}>{g.leader}</span>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
                      {g.members}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. CORE FUNCTIONAL MODULES (8-GRID HUB)                                  */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              Trung Tâm Quản Trị & Tiện Ích Lớp Học
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.825rem", margin: 0 }}>
              {isAllClass
                ? `Truy cập nhanh tất cả các tính năng quản lý trên ${stats.totalClasses || stats.classSummaries?.length || 2} lớp học toàn trường`
                : `Truy cập nhanh tất cả các tính năng quản lý lớp ${singleLopDefault}`}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: 14 }}>
          {coreModules.map((m, idx) => (
            <Link key={idx} href={m.href} style={{ textDecoration: "none" }}>
              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "#ffffff",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                  transition: "all 0.15s ease",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px rgba(0,0,0,0.06)";
                  (e.currentTarget as HTMLElement).style.borderColor = m.badgeColor;
                  (e.currentTarget as HTMLElement).style.background = m.bgLight;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.02)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLElement).style.background = "#ffffff";
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: m.color,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 4px 10px ${m.badgeColor}40`,
                      }}
                    >
                      {m.icon}
                    </div>

                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        color: m.badgeColor,
                        background: m.bgLight,
                        border: `1px solid ${m.borderColor}`,
                        padding: "3px 8px",
                        borderRadius: 12,
                      }}
                    >
                      {m.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                    {m.title}
                  </h3>

                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.3 }}>
                    {m.desc}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    marginTop: 14,
                    color: m.badgeColor,
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    gap: 4,
                  }}
                >
                  <span>Mở module</span>
                  <ArrowUpRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. TWO-COLUMN ACTIVITY & EVENTS FEED                                      */}
      {/* ========================================================================= */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
        {/* Left Card: Sự Kiện & Kỳ Thi Sắp Tới */}
        <div
          className="card"
          style={{
            padding: "22px 24px",
            borderRadius: 18,
            background: "#ffffff",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#fdf2f8",
                  color: "#db2777",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Star size={16} />
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                Sự Kiện & Kế Hoạch Sắp Tới
              </h3>
            </div>
            <Link href="/admin/su-kien" style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>
              Tất cả →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stats.upcomingEvents && stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    padding: "10px 14px",
                    background: "#f8fafc",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.875rem", color: "#0f172a" }}>
                      {ev.tieuDe}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                      📍 {ev.diaDiem || "Trường học"} • Loại: {ev.loaiSuKien}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#db2777", background: "#fdf2f8", padding: "3px 8px", borderRadius: 8 }}>
                    {ev.ngayBatDau}
                  </span>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: "14px 16px",
                  background: "#f8fafc",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "0.875rem", color: "#0f172a" }}>
                  🎉 Lễ Khai Giảng Năm Học 2026–2027
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                  📍 Sân trường • {isAllClass ? `Toàn thể ${stats.totalStudents} học sinh toàn trường` : `Toàn thể ${stats.totalStudents} học sinh lớp ${singleLopDefault}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Trực Nhật Tuần & Hệ Thống Cloud */}
        <div
          className="card"
          style={{
            padding: "22px 24px",
            borderRadius: 18,
            background: "#ffffff",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={16} />
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                Nhiệm Vụ Tuần & Hệ Thống
              </h3>
            </div>
            <Link href={isAllClass ? "/admin/lich-truc?lop=ALL" : `/admin/lich-truc?lop=${singleLopDefault}`} style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>
              Lịch trực →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Duty Banner */}
            <div
              style={{
                padding: "12px 14px",
                background: "#ecfdf5",
                borderRadius: 12,
                border: "1px solid #a7f3d0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#065f46" }}>
                  🧹 {stats.currentDuty?.lop ? `[Lớp ${stats.currentDuty.lop}] ` : ""}Tổ {stats.currentDuty?.to || 1} phụ trách trực nhật tuần này
                </div>
                <div style={{ fontSize: "0.75rem", color: "#047857", marginTop: 2 }}>
                  {stats.currentDuty?.studentName ? (
                    <>Người trực: <strong>{stats.currentDuty.studentName}</strong> theo dõi vệ sinh</>
                  ) : (
                    <>Phân công trực nhật theo tổ</>
                  )}
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#059669", background: "white", padding: "3px 8px", borderRadius: 8 }}>
                Đang trực
              </span>
            </div>

            {/* Cloud Supabase Status Box */}
            <div
              style={{
                padding: "12px 14px",
                background: "#f8fafc",
                borderRadius: 12,
                border: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                <div>
                  <div style={{ fontSize: "0.825rem", fontWeight: 800, color: "#0f172a" }}>
                    Supabase PostgreSQL (Singapore)
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Lưu trữ vĩnh viễn • Realtime Backup • 100% Sẵn sàng
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#16a34a" }}>
                Connected
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
