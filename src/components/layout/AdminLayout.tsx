"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Users,
  BookOpen,
  Calendar,
  Wallet,
  Star,
  BarChart3,
  UserCog,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Home,
  Shield,
  School,
  GraduationCap,
  CalendarDays,
  LayoutGrid,
} from "lucide-react";

// Nav items với icon và label
const NAV_BASE = [
  { href: "/admin", icon: BarChart3, label: "Tổng quan", exact: true },
  { href: "/admin/hoc-sinh", icon: Users, label: "Học sinh", module: "hoc_sinh" },
  { href: "/admin/so-do-lop", icon: LayoutGrid, label: "Sơ đồ lớp", module: "so_do_lop" },
  { href: "/admin/thoi-khoa-bieu", icon: CalendarDays, label: "Thời khóa biểu", module: "thoi_khoa_bieu" },
  { href: "/admin/lich-thi", icon: GraduationCap, label: "Lịch thi & KT", module: "lich_thi" },
  { href: "/admin/diem-danh", icon: BookOpen, label: "Điểm danh", module: "diem_danh" },
  { href: "/admin/quy", icon: Wallet, label: "Quỹ lớp", module: "quy" },
  { href: "/admin/lich-truc", icon: Calendar, label: "Lịch trực", module: "lich_truc" },
  { href: "/admin/su-kien", icon: Star, label: "Sự kiện", module: "su_kien" },
  { href: "/admin/bao-cao", icon: BarChart3, label: "Báo cáo", module: "bao_cao" },
];

export default function AdminLayout({
  children,
  isSuperAdmin = false,
}: {
  children: React.ReactNode;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const router = useRouter();

  const sessionIsSuperAdmin = (session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const realIsSuperAdmin = typeof sessionIsSuperAdmin === "boolean" ? sessionIsSuperAdmin : isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";
  const roleLabel = (session as { roleLabel?: string })?.roleLabel || (realIsSuperAdmin ? "Admin Tổng" : "Giáo Viên Chủ Nhiệm");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [classList, setClassList] = useState<string[]>(["12T2", "11AT3"]);
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (!realIsSuperAdmin) return assignedLop;
    if (typeof window !== "undefined") {
      return searchParams.get("lop") || localStorage.getItem("admin_selected_class") || "12T2";
    }
    return searchParams.get("lop") || "12T2";
  });

  const navItems = realIsSuperAdmin
    ? [...NAV_BASE, { href: "/admin/nguoi-dung", icon: UserCog, label: "Người dùng", module: "nguoi_dung" }]
    : NAV_BASE;

  // Sync selectedClass from URL or localStorage for SuperAdmin
  useEffect(() => {
    if (!realIsSuperAdmin) {
      setSelectedClass(assignedLop);
      return;
    }
    const urlLop = searchParams.get("lop");
    if (urlLop) {
      setSelectedClass(urlLop);
      localStorage.setItem("admin_selected_class", urlLop);
    } else {
      const saved = localStorage.getItem("admin_selected_class");
      if (saved) {
        setSelectedClass(saved);
        router.replace(`${pathname}?lop=${saved}`);
      } else {
        setSelectedClass("12T2");
        router.replace(`${pathname}?lop=12T2`);
      }
    }
  }, [searchParams, realIsSuperAdmin, assignedLop, pathname, router]);

  // Fetch available classes for SuperAdmin dropdown
  useEffect(() => {
    if (realIsSuperAdmin) {
      fetch("/api/classes")
        .then((r) => r.json())
        .then((d) => {
          if (d.data && d.data.length > 0) setClassList(d.data);
        })
        .catch(() => {});
    }
  }, [realIsSuperAdmin]);

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_selected_class");
    }
    await signOut({ redirect: false });
    window.location.href = "/admin/login";
  };

  const handleClassChange = (lop: string) => {
    setSelectedClass(lop);
    localStorage.setItem("admin_selected_class", lop);
    const params = new URLSearchParams(searchParams.toString());
    if (lop === "ALL") {
      params.delete("lop");
    } else {
      params.set("lop", lop);
    }
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  // Determine current class to use for public page link
  const currentClassForPublic = realIsSuperAdmin
    ? (selectedClass && selectedClass !== "ALL" ? selectedClass : "11AT3")
    : assignedLop;

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      style={{
        width: mobile ? "100%" : 220,
        background: "white",
        borderRight: mobile ? "none" : "1px solid var(--border)",
        padding: "0",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Logo & Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: realIsSuperAdmin
              ? "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(260,80%,58%) 100%)"
              : "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(213,80%,58%) 100%)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {realIsSuperAdmin ? (
            <Shield size={18} color="white" />
          ) : (
            <span style={{ color: "white", fontWeight: 800, fontSize: 11 }}>
              {assignedLop?.substring(0, 3) || "12T"}
            </span>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.2, color: "var(--text-primary)" }}>
            {realIsSuperAdmin ? "Quanlyhocvien" : `Lớp ${assignedLop}`}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
            {realIsSuperAdmin ? "Quản trị hệ thống" : roleLabel}
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const targetHref = realIsSuperAdmin && selectedClass && selectedClass !== "ALL"
            ? `${item.href}?lop=${selectedClass}`
            : !realIsSuperAdmin && assignedLop
            ? `${item.href}?lop=${assignedLop}`
            : item.href;
          return (
            <Link
              key={item.href}
              href={targetHref}
              onClick={() => mobile && setSidebarOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
                color: active ? "var(--primary)" : "var(--text-secondary)",
                background: active ? "var(--primary-light)" : "transparent",
                marginBottom: 2,
                transition: "all 0.12s",
                borderLeft: active ? "3px solid var(--primary)" : "3px solid transparent",
              }}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Public site link */}
      <div style={{ padding: "10px", borderTop: "1px solid var(--border)" }}>
        <Link
          href={`/?lop=${currentClassForPublic}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: "0.8rem",
            fontWeight: 600,
            textDecoration: "none",
            color: "var(--text-muted)",
          }}
        >
          <Home size={14} />
          Trang học sinh (Lớp {currentClassForPublic})
        </Link>
      </div>
    </aside>
  );

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "var(--bg-page)" }}>
      {/* Desktop Sidebar */}
      <div className="admin-sidebar-desktop" style={{ display: "flex" }}>
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
              background: "rgba(0,0,0,0.4)",
            }}
            onClick={() => setSidebarOpen(false)}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: 260,
              zIndex: 50,
              background: "white",
              boxShadow: "4px 0 20px rgba(0,0,0,0.15)",
              overflowY: "auto",
              animation: "slideIn 0.2s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 12px 0" }}>
              <button
                onClick={() => setSidebarOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-secondary)" }}
              >
                <X size={20} />
              </button>
            </div>
            <Sidebar mobile />
          </div>
        </>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            background: "white",
            borderBottom: "1px solid var(--border)",
            padding: "0 20px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <button
            className="admin-mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              color: "var(--text-primary)",
              display: "none",
            }}
          >
            <Menu size={20} />
          </button>

          {/* SuperAdmin Class Selector Dropdown */}
          {realIsSuperAdmin ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <School size={16} color="var(--primary)" />
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                Quản lý lớp:
              </span>
              <select
                className="select"
                style={{
                  minHeight: 34,
                  padding: "4px 28px 4px 10px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  width: 170,
                  color: "var(--primary)",
                }}
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <option value="ALL">🏫 Tất cả các lớp</option>
                {classList.map((c) => (
                  <option key={c} value={c}>
                    Lớp {c}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
              <School size={16} /> Lớp {assignedLop}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* User menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "none",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--primary-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "var(--primary)",
                }}
              >
                {session?.user?.name?.[0] || "A"}
              </div>
              <span className="user-name-text">{session?.user?.name || "Admin"}</span>
              <ChevronDown size={14} />
            </button>

            {userMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "white",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  boxShadow: "var(--shadow-lg)",
                  minWidth: 200,
                  zIndex: 100,
                  padding: "6px",
                }}
              >
                <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                    {session?.user?.name || "Người dùng"}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {realIsSuperAdmin
                      ? "Admin Tổng • Toàn trường"
                      : `${roleLabel} • Lớp ${assignedLop}`}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 12px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    borderRadius: 6,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--danger)",
                    textAlign: "left",
                  }}
                >
                  <LogOut size={14} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "24px 24px", overflowX: "hidden" }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-mobile-menu-btn { display: flex !important; }
          .user-name-text { display: none; }
        }
      `}</style>
    </div>
  );
}
