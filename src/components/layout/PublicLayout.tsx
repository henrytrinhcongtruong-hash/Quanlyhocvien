"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import MaintenanceScreen from "@/components/common/MaintenanceScreen";
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
  LogIn,
  LogOut,
  UserCheck,
  User,
  Sparkles,
  ShieldAlert,
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
  const userRole = (session as { roleLabel?: string })?.roleLabel || "Học viên";
  const userName = session?.user?.name || (session as { hoTen?: string })?.hoTen || session?.user?.email;

  const [menuOpen, setMenuOpen] = useState(false);
  const [classList, setClassList] = useState<string[]>(["12T2", "11AT3"]);
  const [pageLockInfo, setPageLockInfo] = useState<{
    isLocked: boolean;
    lockReason?: string;
    lockUntil?: string | null;
    title?: string;
  } | null>(null);

  // Fetch Page Lock Status for current page
  useEffect(() => {
    fetch(`/api/system/page-locks?path=${encodeURIComponent(pathname)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setPageLockInfo(d.data);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Determine active class with strict priority for logged in students/users
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
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 18px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Left: Brand Logo & Class Info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
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
                  <div style={{ fontWeight: 900, fontSize: "1.05rem", lineHeight: 1.15, color: "#0f172a", letterSpacing: "-0.4px" }}>
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
                    padding: "7px 11px",
                    borderRadius: 9,
                    fontSize: "0.82rem",
                    fontWeight: active ? 800 : 600,
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

            <div style={{ width: 1, height: 22, background: "var(--border)", margin: "0 4px", flexShrink: 0 }} />

            {/* User Session status & Actions */}
            {session?.user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "4px 10px",
                    borderRadius: 12,
                  }}
                >
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#0284c7", color: "white", fontSize: "0.72rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {userName ? userName.substring(0, 1).toUpperCase() : "U"}
                  </div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {userName}
                  </div>
                  <span style={{ fontSize: "0.68rem", background: "#e0f2fe", color: "#0369a1", padding: "1px 6px", borderRadius: 6, fontWeight: 700 }}>
                    {userRole}
                  </span>
                </div>

                {userRole !== "Học viên" && (
                  <Link
                    href={`/admin?lop=${activeClass}`}
                    prefetch={true}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "7px 12px",
                      borderRadius: 10,
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      textDecoration: "none",
                      background: "#0284c7",
                      color: "white",
                    }}
                  >
                    Quản trị
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Đăng xuất khỏi hệ thống"
                  style={{
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    color: "#dc2626",
                    padding: "6px 8px",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Link
                  href={`/dang-ky?lop=${activeClass}`}
                  prefetch={true}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 12px",
                    borderRadius: 10,
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    textDecoration: "none",
                    background: "#e0f2fe",
                    color: "#0369a1",
                    border: "1px solid #bae6fd",
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={13} />
                  <span>Đăng ký</span>
                </Link>
                <Link
                  href={`/login`}
                  prefetch={true}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 12px",
                    borderRadius: 10,
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    textDecoration: "none",
                    background: "#0284c7",
                    color: "white",
                    boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  <LogIn size={13} />
                  <span>Đăng nhập</span>
                </Link>
              </div>
            )}
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
            {session?.user && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: 10, marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>{userName}</div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{userRole} • Lớp {activeClass}</div>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: `/?lop=${activeClass}` })}
                  style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "4px 8px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700 }}
                >
                  Đăng xuất
                </button>
              </div>
            )}

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

            {!session?.user ? (
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href={`/dang-ky?lop=${activeClass}`}
                  prefetch={true}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px",
                    borderRadius: 10,
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    textDecoration: "none",
                    background: "#e0f2fe",
                    color: "#0369a1",
                  }}
                >
                  <Sparkles size={16} /> Đăng ký học viên
                </Link>
                <Link
                  href={`/login`}
                  prefetch={true}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px",
                    borderRadius: 10,
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    textDecoration: "none",
                    background: "#0284c7",
                    color: "white",
                  }}
                >
                  <LogIn size={16} /> Đăng nhập
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {userRole !== "Học viên" && (
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
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderRadius: 10,
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    background: "#fef2f2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={16} /> Đăng xuất ({userName})
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Admin Notice if this page is locked for students */}
      {pageLockInfo?.isLocked && (isSuperAdmin || userRole.toLowerCase().includes("gvcn") || userRole.toLowerCase().includes("admin")) && (
        <div
          style={{
            background: "#fef2f2",
            borderBottom: "1.5px solid #fecaca",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.82rem",
            color: "#991b1b",
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldAlert size={16} color="#dc2626" />
            <span>⚠️ <strong>Chế độ Quản trị:</strong> Trang này đang được KHÓA BẢO TRÌ đối với học viên. Chỉ Admin mới xem được dữ liệu này.</span>
          </div>
          <Link
            href="/admin/quan-ly-link"
            style={{ color: "#0284c7", fontWeight: 800, textDecoration: "underline", fontSize: "0.78rem" }}
          >
            Quản lý khóa trang →
          </Link>
        </div>
      )}

      {/* Main Content or Maintenance Screen */}
      <main style={{ flex: 1, padding: "20px 24px" }}>
        {pageLockInfo?.isLocked && !isSuperAdmin && !userRole.toLowerCase().includes("gvcn") && !userRole.toLowerCase().includes("admin") ? (
          <MaintenanceScreen
            pageTitle={pageLockInfo.title || "Trang này"}
            lockReason={pageLockInfo.lockReason}
            lockUntil={pageLockInfo.lockUntil}
            pagePath={pathname}
          />
        ) : (
          children
        )}
      </main>

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
