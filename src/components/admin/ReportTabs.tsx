"use client";
import React from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, Wallet, ShieldAlert } from "lucide-react";

interface ReportTabsProps {
  activeTab: "chuyen-can" | "thu-chi";
  filterLop: string;
}

export default function ReportTabs({ activeTab, filterLop }: ReportTabsProps) {
  const queryStr = filterLop && filterLop !== "ALL" ? `?lop=${encodeURIComponent(filterLop)}` : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderBottom: "2px solid var(--border)",
        marginBottom: 22,
        paddingBottom: 2,
        overflowX: "auto",
      }}
    >
      <Link
        href={`/admin/bao-cao${queryStr}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: "8px 8px 0 0",
          textDecoration: "none",
          fontSize: "0.92rem",
          fontWeight: 700,
          color: activeTab === "chuyen-can" ? "var(--primary)" : "var(--text-secondary)",
          background: activeTab === "chuyen-can" ? "rgba(59, 130, 246, 0.08)" : "transparent",
          borderBottom: activeTab === "chuyen-can" ? "2.5px solid var(--primary)" : "2.5px solid transparent",
          marginBottom: -2,
          transition: "all 0.15s ease",
          whiteSpace: "nowrap",
        }}
      >
        <BarChart3 size={17} color={activeTab === "chuyen-can" ? "var(--primary)" : "currentColor"} />
        <span>Báo cáo Chuyên cần & Vi phạm</span>
      </Link>

      <Link
        href={`/admin/bao-cao/thu-chi${queryStr}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: "8px 8px 0 0",
          textDecoration: "none",
          fontSize: "0.92rem",
          fontWeight: 700,
          color: activeTab === "thu-chi" ? "var(--primary)" : "var(--text-secondary)",
          background: activeTab === "thu-chi" ? "rgba(59, 130, 246, 0.08)" : "transparent",
          borderBottom: activeTab === "thu-chi" ? "2.5px solid var(--primary)" : "2.5px solid transparent",
          marginBottom: -2,
          transition: "all 0.15s ease",
          whiteSpace: "nowrap",
        }}
      >
        <TrendingUp size={17} color={activeTab === "thu-chi" ? "var(--primary)" : "currentColor"} />
        <span>Báo cáo Thu - Chi Quỹ lớp</span>
      </Link>
    </div>
  );
}
