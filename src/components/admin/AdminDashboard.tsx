"use client";
import React from "react";
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
} from "lucide-react";
import { formatVND } from "@/lib/format";

interface AdminDashboardProps {
  stats: {
    totalStudents: number;
    totalAttendance: number;
    totalEvents: number;
    feeSummary: { tongThu: number; tongChi: number; conLai: number } | null;
    assignedLop?: string;
    showFee: boolean;
    isSuperAdmin: boolean;
  };
}

export default function AdminDashboard({ stats }: AdminDashboardProps) {
  const kpis = [
    {
      icon: <Users size={22} />,
      label: "Học sinh",
      value: stats.totalStudents,
      unit: "em",
      color: "var(--primary)",
      bg: "var(--primary-light)",
      href: "/admin/hoc-sinh",
    },
    {
      icon: <BookOpen size={22} />,
      label: "Bản ghi vắng/trễ",
      value: stats.totalAttendance,
      unit: "lần",
      color: "var(--warning)",
      bg: "var(--warning-light)",
      href: "/admin/diem-danh",
    },
    {
      icon: <Star size={22} />,
      label: "Sự kiện",
      value: stats.totalEvents,
      unit: "sự kiện",
      color: "var(--success)",
      bg: "var(--success-light)",
      href: "/admin/su-kien",
    },
  ];

  const quickLinks = [
    { href: "/admin/hoc-sinh", icon: <Users size={16} />, label: "Quản lý học sinh", desc: "Thêm, sửa, xóa, import Excel" },
    { href: "/admin/diem-danh", icon: <BookOpen size={16} />, label: "Điểm danh", desc: "Nhập điểm danh theo ngày" },
    { href: "/admin/quy", icon: <Wallet size={16} />, label: "Quỹ lớp", desc: "Thu, chi, tình trạng đóng quỹ" },
    { href: "/admin/lich-truc", icon: <Calendar size={16} />, label: "Lịch trực nhật", desc: "Lịch trực theo tuần" },
    { href: "/admin/su-kien", icon: <Star size={16} />, label: "Sự kiện", desc: "Quản lý sự kiện lớp" },
    { href: "/admin/bao-cao", icon: <BarChart3 size={16} />, label: "Báo cáo", desc: "Thống kê, biểu đồ, export" },
  ];

  if (stats.isSuperAdmin) {
    quickLinks.push({
      href: "/admin/nguoi-dung",
      icon: <UserCog size={16} />,
      label: "Quản lý người dùng",
      desc: "Tạo tài khoản, cấp quyền",
    });
  }

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: 4 }}>Tổng quan</h1>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          {stats.assignedLop && stats.assignedLop !== "ALL"
            ? `Lớp ${stats.assignedLop}`
            : "Hệ thống Quản lý Toàn trường"} — Năm học 2025–2026
        </p>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {kpis.map((kpi, i) => (
          <Link
            key={i}
            href={kpi.href}
            style={{ textDecoration: "none" }}
          >
            <div
              className="card"
              style={{
                padding: "18px 20px",
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: kpi.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: kpi.color,
                  flexShrink: 0,
                }}
              >
                {kpi.icon}
              </div>
              <div>
                <div className="kpi-number" style={{ fontSize: "1.6rem", color: kpi.color }}>
                  {kpi.value}
                </div>
                <div className="kpi-label">{kpi.label}</div>
              </div>
            </div>
          </Link>
        ))}

        {/* Fee KPI - only show if user has permission */}
        {stats.showFee && stats.feeSummary && (
          <Link href="/admin/quy" style={{ textDecoration: "none" }}>
            <div
              className="card"
              style={{
                padding: "18px 20px",
                background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(213,80%,58%) 100%)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(16,90,188,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                Số dư quỹ lớp
              </div>
              <div style={{ color: "white", fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", marginBottom: 8 }}>
                {formatVND(stats.feeSummary.conLai)}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <TrendingUp size={10} /> Thu
                  </div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: "0.85rem" }}>
                    {formatVND(stats.feeSummary.tongThu)}
                  </div>
                </div>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={10} /> Chi
                  </div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: "0.85rem" }}>
                    {formatVND(stats.feeSummary.tongChi)}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Quick Links */}
      <h3 style={{ marginBottom: 14, fontSize: "1rem" }}>Truy cập nhanh</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
          marginBottom: 28,
        }}
      >
        {quickLinks.map((link, i) => (
          <Link key={i} href={link.href} style={{ textDecoration: "none" }}>
            <div
              className="card"
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--primary-light)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--primary-border)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "";
                (e.currentTarget as HTMLElement).style.borderColor = "";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--bg-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary)",
                    flexShrink: 0,
                  }}
                >
                  {link.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                    {link.label}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{link.desc}</div>
                </div>
              </div>
              <ChevronRight size={15} color="var(--text-muted)" />
            </div>
          </Link>
        ))}
      </div>

      {/* System status */}
      <div
        className="card"
        style={{
          padding: "14px 18px",
          background: "var(--success-light)",
          border: "1px solid var(--success-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <CheckCircle size={18} color="var(--success)" />
        <div style={{ fontSize: "0.875rem", color: "var(--success)", fontWeight: 600 }}>
          Hệ thống hoạt động bình thường — Dữ liệu cập nhật real-time
        </div>
      </div>
    </div>
  );
}
