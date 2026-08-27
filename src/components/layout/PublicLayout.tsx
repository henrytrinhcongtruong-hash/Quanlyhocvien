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
} from "lucide-react";

const NAV_BASE = [
  { href: "/", icon: Users, label: "Danh sách lớp", exact: true },
  { href: "/thoi-khoa-bieu", icon: CalendarDays, label: "Thời khóa biểu" },
  { href: "/lich-thi", icon: GraduationCap, label: "Lịch thi & KT" },
  { href: "/quy-lop", icon: Wallet, label: "Quỹ lớp" },
  { href: "/lich-truc", icon: Calendar, label: "Lịch trực nhật" },
  { href: "/su-kien", icon: Star, label: "Sự kiện" },
  { href: "/diem-danh-cua-toi", icon: BookOpen, label: "Điểm danh của tôi" },
];

function PublicLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const userAssignedLop = (session as { assignedLop?: string })?.assignedLop;

  const [menuOpen, setMenuOpen] = useState(false);
  const [classList, setClassList] = useState<string[]>(["11AT3", "12T2"]);

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
    return searchParams.get("lop") || userAssignedLop || "11AT3";
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
    <div style={{ minHeight: "100dvh", background: "var(--bg-page)" }}>
      {/* ====== TOP NAV ====== */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 16px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* Logo with dynamic class name */}
          <Link href={`/?lop=${activeClass}`} style={{ textDecoration: "none" }}>
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: "linear-gradient(135deg, #0891b2 0%, #4f46e5 100%)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 3px 8px rgba(8,145,178,0.3)",
                }}
              >
                <GraduationCap size={22} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.2, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
                  Quanlyhocvien
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  Lớp {activeClass} • Năm học 2025–2026
                </div>
              </div>
            </div>
          </Link>

          {/* Class Switcher on Public Top Nav — ONLY for SuperAdmin */}
          {isSuperAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <School size={15} color="var(--primary)" />
              <select
                className="select"
                style={{
                  minHeight: 32,
                  padding: "3px 26px 3px 8px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--primary)",
                  border: "1px solid var(--primary-light)",
                  background: "var(--primary-light)",
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

          {/* Desktop nav */}
          <div
            className="desktop-nav"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.targetHref}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    color: active ? "var(--primary)" : "var(--text-secondary)",
                    background: active ? "var(--primary-light)" : "transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <item.icon size={15} />
                  {item.label}
                </Link>
              );
            })}
            <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 8px" }} />
            <Link
              href={`/admin?lop=${activeClass}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
                background: "var(--primary)",
                color: "white",
                transition: "all 0.15s",
              }}
            >
              Quản trị
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              color: "var(--text-primary)",
              display: "none",
            }}
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            style={{
              background: "white",
              borderTop: "1px solid var(--border)",
              padding: "12px 16px",
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
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 12px",
                    borderRadius: 8,
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    color: active ? "var(--primary)" : "var(--text-primary)",
                    background: active ? "var(--primary-light)" : "transparent",
                    marginBottom: 2,
                  }}
                >
                  <item.icon size={17} />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={`/admin?lop=${activeClass}`}
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "11px 16px",
                borderRadius: 8,
                fontSize: "0.9rem",
                fontWeight: 700,
                textDecoration: "none",
                background: "var(--primary)",
                color: "white",
                marginTop: 8,
              }}
            >
              Vào trang Quản trị
              <ChevronRight size={15} />
            </Link>
          </div>
        )}
      </nav>

      {/* ====== CONTENT ====== */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {children}
      </main>

      {/* ====== FOOTER ====== */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          marginTop: 48,
          padding: "20px 16px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.8rem",
        }}
      >
        <p>Lớp {activeClass} — Trường THPT • Năm học 2025–2026</p>
        <p style={{ marginTop: 4 }}>
          <Link href={`/admin?lop=${activeClass}`} style={{ color: "var(--primary)", textDecoration: "none" }}>
            Trang quản trị Lớp {activeClass}
          </Link>
        </p>
      </footer>

      <style>{`
        @media (max-width: 768px) {
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
