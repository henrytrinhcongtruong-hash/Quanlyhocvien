// src/components/common/MaintenanceScreen.tsx
"use client";
import React from "react";
import Link from "next/link";
import { Wrench, ShieldAlert, ArrowLeft, RefreshCw, Home, Clock, Sparkles } from "lucide-react";

interface MaintenanceScreenProps {
  pageTitle?: string;
  lockReason?: string;
  lockUntil?: string | null;
  pagePath?: string;
}

export default function MaintenanceScreen({
  pageTitle = "Trang này",
  lockReason = "Hệ thống đang được nâng cấp tính năng mới. Vui lòng quay lại sau ít phút!",
  lockUntil,
  pagePath = "/",
}: MaintenanceScreenProps) {
  const formattedUntil = lockUntil
    ? new Date(lockUntil).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#ffffff",
          borderRadius: 24,
          padding: "36px 28px",
          textAlign: "center",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
          border: "1.5px solid #fee2e2",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Decorative Alert Glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #ef4444 0%, #f97316 50%, #eab308 100%)",
          }}
        />

        {/* Icon Circle */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#fef2f2",
            border: "2px solid #fecaca",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
            color: "#dc2626",
            boxShadow: "0 6px 16px rgba(220, 38, 38, 0.15)",
          }}
        >
          <Wrench size={34} />
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 14px",
            borderRadius: 20,
            background: "#fff1f2",
            border: "1px solid #ffe4e6",
            color: "#e11d48",
            fontSize: "0.82rem",
            fontWeight: 800,
            marginBottom: 14,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e11d48" }} />
          TẠM KHÓA ĐỂ NÂNG CẤP TÍNH NĂNG
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "1.45rem",
            fontWeight: 900,
            color: "#0f172a",
            margin: "0 0 10px",
            lineHeight: 1.3,
          }}
        >
          {pageTitle} Đang Được Bảo Trì
        </h2>

        {/* Reason Box */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px dashed #cbd5e1",
            borderRadius: 14,
            padding: "14px 16px",
            margin: "16px 0 20px",
            color: "#334155",
            fontSize: "0.92rem",
            lineHeight: 1.55,
            fontWeight: 600,
          }}
        >
          {lockReason}
        </div>

        {/* Estimated completion */}
        {formattedUntil && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: "0.85rem",
              color: "#64748b",
              fontWeight: 700,
              marginBottom: 24,
            }}
          >
            <Clock size={16} color="#0284c7" />
            <span>Dự kiến hoàn tất mở lại: <strong>{formattedUntil}</strong></span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-secondary btn-sm"
            style={{ padding: "9px 16px", borderRadius: 10, fontSize: "0.88rem", fontWeight: 700 }}
          >
            <RefreshCw size={15} /> Thử lại trang
          </button>

          {pagePath !== "/" && (
            <Link
              href="/"
              className="btn btn-primary btn-sm"
              style={{
                padding: "9px 18px",
                borderRadius: 10,
                fontSize: "0.88rem",
                fontWeight: 800,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Home size={15} /> Về Trang chủ
            </Link>
          )}
        </div>

        {/* Note */}
        <p style={{ margin: "24px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
          Nếu bạn là Quản trị viên, vui lòng đăng nhập vào trang Quản lý để mở khóa trang này.
        </p>
      </div>
    </div>
  );
}
