"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users,
  BookOpen,
  Calendar,
  Wallet,
  Star,
  ChevronRight,
  Menu,
  X,
  School,
  GraduationCap,
  CalendarDays,
  LayoutGrid,
} from "lucide-react";

const NAV_BASE = [
  { href: "/", icon: Users, label: "Danh sách", exact: true },
  { href: "/so-do-lop", icon: LayoutGrid, label: "Sơ đồ lớp" },
  { href: "/thoi-khoa-bieu", icon: CalendarDays, label: "Thời khóa biểu" },
  { href: "/lich-thi", icon: GraduationCap, label: "Lịch thi" },
  { href: "/quy-lop", icon: Wallet, label: "Quỹ lớp" },
  { href: "/lich-truc", icon: Calendar, label: "Trực nhật" },
  { href: "/su-kien", icon: Star, label: "Sự kiện" },
  { href: "/diem-danh-cua-toi", icon: BookOpen, label: "Điểm danh" },
];

function PublicLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const userAssignedLop = (session as { assignedLop?: string })?.assignedLop;

  const [menuOpen, setMenuOpen] = useState(false);
  const [classList, setClassList] = useState<string[]>(["12T2", "11AT3"]);

  // Determine active class with strict priority for logged in GVCN/class users
  const [activeClass, setActiveClass] = useState<string>(() => {
    if (session?.user && !isSuperAdmin && userAssignedLop && userAssignedLop !== "ALL") {
      return userAssignedLop;
    }
    if (typeof window !== "undefined") {
      const urlLop = searchParams.get("lop");
      if (urlLop && urlLop !== "ALL") return urlLop;
      if (isSuperAdmin) {
        const saved = localStorage.getItem("admin_selected_class");
        if (saved && saved !== "ALL") return saved;
      }
    }
    return searchParams.get("lop") || userAssignedLop || "12T2";
  });

  // Fetch available classes
  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) setClassList(d.data);
      })
      .catch(() => {});
  }, []);

  // Sync active class with high priority for logged in user's class
  useEffect(() => {
    if (session?.user && !isSuperAdmin && userAssignedLop && userAssignedLop !== "ALL") {
      setActiveClass(userAssignedLop);
      return;
    }
    const urlLop = searchParams.get("lop");
    if (urlLop && urlLop !== "ALL") {
      setActiveClass(urlLop);
      if (isSuperAdmin) localStorage.setItem("admin_selected_class", urlLop);
    }
  }, [searchParams, session, isSuperAdmin, userAssignedLop]);

  const handleClassChange = (lop: string) => {
    setActiveClass(lop);
    if (isSuperAdmin) localStorage.setItem("admin_selected_class", lop);
    const params = new URLSearchParams(searchParams.toString());
    params.set("lop", lop);
    router.push(`${pathname}?${params.toString()}`);
  };

  const navItems = NAV_BASE.map((item) => {
    const targetHref = activeClass ? `${item.href}?lop=${activeClass}` : item.href;
    return { ...item, targetHref };
  });

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg-page)", display: "flex", flexDirection: "column" }}>
      {/* ====== TOP NAV ====== */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255, 255, 255, 0.90)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div
          style={{
            maxWidth: 1380,
            margin: "0 auto",
            padding: "0 20px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* Left: Brand Logo & Class Info */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <Link href={`/?lop=${activeClass}`} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    background: "linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)",
                    borderRadius: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 3px 10px rgba(2, 132, 199, 0.28)",
                  }}
                >
                  <GraduationCap size={22} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: "1.08rem", lineHeight: 1.15, color: "#0f172a", letterSpacing: "-0.4px" }}>
                    Quanlyhocvien
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                    Lớp {activeClass} • 2025–2026
                  </div>
                </div>
              </div>
            </Link>

            {/* Class Switcher on Public Top Nav — ONLY for SuperAdmin */}
            {isSuperAdmin && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 20,
                  padding: "2px 10px 2px 8px",
                }}
              >
                <School size={13} color="#16a34a" />
                <select
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: "#15803d",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  value={activeClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  title="Quyền Admin Tổng: Chuyển xem giao diện các lớp"
                >
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      Lớp {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Center/Right: Desktop Navigation Bar */}
          <div
            className="desktop-nav"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexWrap: "nowrap",
            }}
          >
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.targetHref}
                  prefetch={true}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 9,
                    fontSize: "0.84rem",
                    fontWeight: active ? 800 : 650,
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: active ? "#0369a1" : "#475569",
                    background: active
                      ? "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)"
                      : "transparent",
                    border: active ? "1px solid #7dd3fc" : "1px solid transparent",
                    boxShadow: active ? "0 2px 6px rgba(2,132,199,0.12)" : "none",
                    transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                    flexShrink: 0,
                  }}
                >
                  <item.icon size={15} color={active ? "#0284c7" : "#64748b"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 6px", flexShrink: 0 }} />

            {/* Quản Trị Button */}
            <Link
              href={`/admin?lop=${activeClass}`}
              prefetch={true}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                borderRadius: 10,
                fontSize: "0.84rem",
                fontWeight: 800,
                whiteSpace: "nowrap",
                textDecoration: "none",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "white",
                boxShadow: "0 2px 8px rgba(2,132,199,0.3)",
                transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                flexShrink: 0,
              }}
            >
              <span>Quản trị</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "#f1f5f9",
              border: "1px solid var(--border)",
              borderRadius: 8,
              cursor: "pointer",
              padding: "7px 10px",
              color: "#0f172a",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div
            style={{
              background: "white",
              borderTop: "1px solid var(--border)",
              padding: "14px 18px",
              boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.targetHref}
                  prefetch={true}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    fontSize: "0.9rem",
                    fontWeight: active ? 800 : 650,
                    textDecoration: "none",
                    color: active ? "#0369a1" : "#334155",
                    background: active ? "#e0f2fe" : "transparent",
                  }}
                >
                  <item.icon size={18} color={active ? "#0284c7" : "#64748b"} />
                  {item.label}
                </Link>
              );
            })}

            <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />

            <Link
              href={`/admin?lop=${activeClass}`}
              prefetch={true}
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "11px 16px",
                borderRadius: 10,
                fontSize: "0.9rem",
                fontWeight: 800,
                textDecoration: "none",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "white",
                boxShadow: "0 2px 8px rgba(2,132,199,0.3)",
              }}
            >
              <span>Trang Quản trị Lớp {activeClass}</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1 }}>{children}</main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          marginTop: 48,
          padding: "24px 16px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.825rem",
          background: "white",
        }}
      >
        <p>Lớp {activeClass} — Trường THPT • Năm học 2025–2026</p>
        <p style={{ marginTop: 4 }}>
          <Link href={`/admin?lop=${activeClass}`} style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 700 }}>
            Trang quản trị Lớp {activeClass}
          </Link>
        </p>
      </footer>

      <style>{`
        @media (max-width: 1100px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "var(--bg-page)", padding: 24 }}>{children}</div>}>
      <PublicLayoutInner>{children}</PublicLayoutInner>
    </Suspense>
  );
}
