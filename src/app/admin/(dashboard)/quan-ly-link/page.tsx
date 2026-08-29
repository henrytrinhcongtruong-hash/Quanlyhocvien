"use client";
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import {
  Globe,
  Link2,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Home,
  LayoutGrid,
  CalendarDays,
  Wallet,
  GraduationCap,
  Calendar,
  Star,
  BookOpen,
  UserPlus,
  Layers,
  Sparkles,
} from "lucide-react";

interface PageLockItem {
  path: string;
  title: string;
  description: string;
  icon: string;
  isLocked: boolean;
  lockReason: string;
  lockUntil: string | null;
  lockedBy: string | null;
  updatedAt: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  LayoutGrid,
  CalendarDays,
  Wallet,
  GraduationCap,
  Calendar,
  Star,
  BookOpen,
  UserPlus,
};

export default function QuanLyLinkPage() {
  const searchParams = useSearchParams();
  const [selectedLop, setSelectedLop] = useState("12T2");
  const [pages, setPages] = useState<PageLockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Modal Khóa Trang Đơn lẻ
  const [lockModalItem, setLockModalItem] = useState<PageLockItem | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [modalUntil, setModalUntil] = useState("");

  // Modal Khóa Toàn Bộ
  const [toggleAllModal, setToggleAllModal] = useState<"lock" | "unlock" | null>(null);
  const [toggleAllReason, setToggleAllReason] = useState("");

  // Class list for URL generation
  const [classList, setClassList] = useState<string[]>(["12T2", "11AT3"]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync Class from query or localStorage
  useEffect(() => {
    const urlLop = searchParams.get("lop") || localStorage.getItem("admin_selected_class") || "12T2";
    setSelectedLop(urlLop);

    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) setClassList(d.data);
      })
      .catch(() => {});
  }, [searchParams]);

  // Load Page Locks
  const loadPageLocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/page-locks");
      const data = await res.json();
      if (data.success && data.data) {
        setPages(data.data);
      }
    } catch {
      showToast("Lỗi tải danh sách link & trạng thái khóa", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageLocks();
  }, [loadPageLocks]);

  // Copy Link
  const handleCopyLink = (path: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = path === "/dang-ky" ? `${baseUrl}${path}` : `${baseUrl}${path}?lop=${selectedLop}`;
    navigator.clipboard.writeText(fullUrl);
    showToast(`Đã sao chép link: ${fullUrl}`);
  };

  // Open Lock Modal for Single Page
  const openLockModal = (item: PageLockItem) => {
    setLockModalItem(item);
    setModalReason(item.lockReason || "Hệ thống đang được nâng cấp tính năng mới. Vui lòng quay lại sau ít phút!");
    setModalUntil(item.lockUntil ? new Date(item.lockUntil).toISOString().slice(0, 16) : "");
  };

  // Handle Unlock Single Page
  const handleUnlockSingle = async (item: PageLockItem) => {
    setSaving(true);
    try {
      const res = await fetch("/api/system/page-locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: item.path,
          isLocked: false,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Đã mở khóa trang "${item.title}"`);
        setPages((prev) =>
          prev.map((p) => (p.path === item.path ? { ...p, isLocked: false } : p))
        );
      } else {
        showToast(data.error || "Lỗi mở khóa trang", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle Submit Lock Single Page
  const handleSubmitLockSingle = async () => {
    if (!lockModalItem) return;
    setSaving(true);
    try {
      const res = await fetch("/api/system/page-locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: lockModalItem.path,
          isLocked: true,
          lockReason: modalReason.trim() || "Hệ thống đang được nâng cấp tính năng mới. Vui lòng quay lại sau ít phút!",
          lockUntil: modalUntil || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Đã khóa trang "${lockModalItem.title}"`);
        setPages((prev) =>
          prev.map((p) =>
            p.path === lockModalItem.path
              ? {
                  ...p,
                  isLocked: true,
                  lockReason: modalReason.trim(),
                  lockUntil: modalUntil || null,
                }
              : p
          )
        );
        setLockModalItem(null);
      } else {
        showToast(data.error || "Lỗi khóa trang", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle Toggle All (Lock All / Unlock All)
  const handleConfirmToggleAll = async () => {
    if (!toggleAllModal) return;
    const shouldLock = toggleAllModal === "lock";
    setSaving(true);
    try {
      const res = await fetch("/api/system/page-locks/toggle-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lockAll: shouldLock,
          lockReason: toggleAllReason.trim() || "Hệ thống đang được nâng cấp toàn diện. Vui lòng quay lại sau ít phút!",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
        setPages((prev) =>
          prev.map((p) => ({
            ...p,
            isLocked: shouldLock,
            lockReason: shouldLock ? toggleAllReason.trim() : p.lockReason,
          }))
        );
        setToggleAllModal(null);
      } else {
        showToast(data.error || "Lỗi thực hiện", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = pages.length;
  const lockedPagesCount = pages.filter((p) => p.isLocked).length;
  const activePagesCount = totalPages - lockedPagesCount;

  return (
    <div className="animate-fade-in">
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 18px",
            borderRadius: 10,
            background: toast.type === "success" ? "var(--success)" : "var(--danger)",
            color: "white",
            fontWeight: 600,
            fontSize: "0.875rem",
            boxShadow: "var(--shadow-lg)",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Top Header Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #1e40af 100%)",
          color: "white",
          borderRadius: 20,
          padding: "24px 22px",
          marginBottom: 18,
          boxShadow: "0 8px 24px rgba(2,132,199,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(8px)",
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={28} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ fontSize: "1.35rem", fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
                  Quản Lý Link & Bảo Trì Cổng Học Viên
                </h1>
                <span
                  style={{
                    background: "rgba(255,255,255,0.22)",
                    padding: "3px 9px",
                    borderRadius: 12,
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  Admin Only
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.84rem", opacity: 0.9 }}>
                Quản lý 9 đường dẫn trang học viên, chia sẻ link nhanh, và khóa tạm thời từng trang để nâng cấp.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={loadPageLocks}
              disabled={loading}
              style={{ background: "rgba(255,255,255,0.2)", color: "white", borderColor: "rgba(255,255,255,0.35)", fontSize: "0.82rem" }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {loading ? "Đang tải..." : "Làm mới"}
            </button>

            {lockedPagesCount > 0 ? (
              <button
                className="btn btn-sm"
                onClick={() => setToggleAllModal("unlock")}
                style={{
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  fontWeight: 800,
                  fontSize: "0.82rem",
                  padding: "7px 14px",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(22,163,74,0.4)",
                }}
              >
                <Unlock size={15} /> MỞ KHÓA TẤT CẢ ({lockedPagesCount})
              </button>
            ) : (
              <button
                className="btn btn-sm"
                onClick={() => {
                  setToggleAllReason("Hệ thống đang được nâng cấp toàn diện. Vui lòng quay lại sau ít phút!");
                  setToggleAllModal("lock");
                }}
                style={{
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  fontWeight: 800,
                  fontSize: "0.82rem",
                  padding: "7px 14px",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(220,38,38,0.4)",
                }}
              >
                <Lock size={15} /> KHÓA TOÀN BỘ TRANG
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overview Stat Cards & Class Selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
        {/* Card 1: Tổng số trang */}
        <div className="card" style={{ padding: "16px 18px", borderRadius: 14, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Tổng số cổng</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>{totalPages} Trang</div>
          </div>
        </div>

        {/* Card 2: Đang hoạt động */}
        <div className="card" style={{ padding: "16px 18px", borderRadius: 14, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Đang mở hoạt động</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#16a34a" }}>{activePagesCount} Trang</div>
          </div>
        </div>

        {/* Card 3: Đang khóa nâng cấp */}
        <div className="card" style={{ padding: "16px 18px", borderRadius: 14, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: lockedPagesCount > 0 ? "#fee2e2" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: lockedPagesCount > 0 ? "#dc2626" : "#64748b" }}>
            <Lock size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Đang khóa nâng cấp</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: lockedPagesCount > 0 ? "#dc2626" : "#64748b" }}>{lockedPagesCount} Trang</div>
          </div>
        </div>

        {/* Card 4: Bộ chọn Lớp để tạo Link */}
        <div className="card" style={{ padding: "14px 18px", borderRadius: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
            Mã lớp chia sẻ link:
          </div>
          <select
            className="select"
            value={selectedLop}
            onChange={(e) => setSelectedLop(e.target.value)}
            style={{ fontWeight: 800, fontSize: "0.9rem", padding: "6px 10px" }}
          >
            {classList.map((c) => (
              <option key={c} value={c}>
                Lớp {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid 9 Cổng Thông Tin Học Viên */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {pages.map((item) => {
          const IconComp = ICON_MAP[item.icon] || Globe;
          const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
          const targetUrl = item.path === "/dang-ky" ? `${item.path}` : `${item.path}?lop=${selectedLop}`;
          const fullLink = `${baseUrl}${targetUrl}`;

          return (
            <div
              key={item.path}
              className="card"
              style={{
                borderRadius: 18,
                padding: "20px",
                border: item.isLocked ? "2px solid #fecaca" : "1px solid var(--border)",
                background: item.isLocked ? "#fffafa" : "#ffffff",
                boxShadow: item.isLocked ? "0 4px 14px rgba(220,38,38,0.08)" : "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                transition: "all 0.2s ease",
              }}
            >
              <div>
                {/* Card Top: Icon & Badge */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: item.isLocked ? "#fee2e2" : "#f0f9ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: item.isLocked ? "#dc2626" : "#0284c7",
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: item.isLocked ? "#991b1b" : "#0f172a" }}>
                        {item.title}
                      </h3>
                      <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 600 }}>
                        {item.path}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      padding: "3px 9px",
                      borderRadius: 10,
                      background: item.isLocked ? "#fef2f2" : "#dcfce7",
                      color: item.isLocked ? "#dc2626" : "#15803d",
                      border: item.isLocked ? "1px solid #fecaca" : "1px solid #bbf7d0",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: item.isLocked ? "#dc2626" : "#16a34a" }} />
                    {item.isLocked ? "Đang Khóa" : "Đang Mở"}
                  </span>
                </div>

                {/* Description */}
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.45 }}>
                  {item.description}
                </p>

                {/* Lock Reason Box (if locked) */}
                {item.isLocked && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px dashed #f87171",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: "0.78rem",
                      color: "#991b1b",
                      marginBottom: 14,
                      lineHeight: 1.4,
                    }}
                  >
                    <strong>Thông báo học sinh:</strong> {item.lockReason}
                    {item.lockUntil && (
                      <div style={{ marginTop: 4, color: "#dc2626", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> Mở lại: {new Date(item.lockUntil).toLocaleString("vi-VN")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div
                style={{
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: 12,
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {/* Link View / Copy */}
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(item.path)}
                    title="Sao chép đường dẫn chia sẻ cho học sinh"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.76rem", padding: "5px 9px", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Copy size={13} /> Copy Link
                  </button>

                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    title="Mở xem thử trang học viên trong tab mới"
                    style={{ fontSize: "0.76rem", padding: "5px 9px", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <ExternalLink size={13} /> Mở trang
                  </a>
                </div>

                {/* Lock / Unlock Toggle Button */}
                {item.isLocked ? (
                  <button
                    type="button"
                    onClick={() => handleUnlockSingle(item)}
                    disabled={saving}
                    className="btn btn-sm"
                    style={{
                      background: "#16a34a",
                      color: "white",
                      border: "none",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      padding: "5px 12px",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Unlock size={13} /> Mở khóa
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openLockModal(item)}
                    disabled={saving}
                    className="btn btn-sm"
                    style={{
                      background: "#fee2e2",
                      color: "#dc2626",
                      border: "1px solid #fecaca",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      padding: "5px 12px",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Lock size={13} /> Khóa nâng cấp
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Khóa 1 Trang */}
      {lockModalItem && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#ffffff",
              borderRadius: 20,
              padding: "24px 22px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              animation: "slideUp 0.2s ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                <Lock size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                  Khóa Trang &quot;{lockModalItem.title}&quot;
                </h3>
                <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{lockModalItem.path}</span>
              </div>
            </div>

            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.45 }}>
              Khi khóa trang, học sinh truy cập vào link này sẽ thấy thông báo bảo trì nâng cấp và không xem được dữ liệu trang cho tới khi bạn mở khóa lại.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                  Thông điệp / Lý do bảo trì hiển thị cho học sinh:
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="Ví dụ: Đang nâng cấp giao diện mới. Vui lòng quay lại sau!"
                  style={{ width: "100%", fontSize: "0.85rem", padding: "8px 10px" }}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                  Thời gian dự kiến mở khóa lại (Tùy chọn):
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  value={modalUntil}
                  onChange={(e) => setModalUntil(e.target.value)}
                  style={{ width: "100%", fontSize: "0.85rem", padding: "8px 10px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setLockModalItem(null)}
                disabled={saving}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleSubmitLockSingle}
                disabled={saving}
                style={{
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  fontWeight: 800,
                  padding: "7px 16px",
                  borderRadius: 8,
                }}
              >
                {saving ? "Đang lưu..." : "Xác nhận khóa trang"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Khóa / Mở Khóa Toàn Bộ */}
      {toggleAllModal && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#ffffff",
              borderRadius: 20,
              padding: "24px 22px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              animation: "slideUp 0.2s ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: toggleAllModal === "lock" ? "#fee2e2" : "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: toggleAllModal === "lock" ? "#dc2626" : "#16a34a",
                }}
              >
                {toggleAllModal === "lock" ? <Lock size={20} /> : <Unlock size={20} />}
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                {toggleAllModal === "lock" ? "Khóa Toàn Bộ 9 Cổng Học Viên" : "Mở Khóa Toàn Bộ Các Trang"}
              </h3>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.5 }}>
              {toggleAllModal === "lock"
                ? "Bạn có chắc chắn muốn KHÓA TOÀN BỘ 9 cổng thông tin học viên để bảo trì/nâng cấp không?"
                : "Bạn có muốn MỞ KHÓA LẠI TẤT CẢ các trang để học sinh truy cập bình thường không?"}
            </p>

            {toggleAllModal === "lock" && (
              <div style={{ marginBottom: 14 }}>
                <label className="label" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                  Thông điệp bảo trì chung cho toàn hệ thống:
                </label>
                <textarea
                  className="input"
                  rows={2}
                  value={toggleAllReason}
                  onChange={(e) => setToggleAllReason(e.target.value)}
                  placeholder="Hệ thống đang được nâng cấp toàn diện..."
                  style={{ width: "100%", fontSize: "0.85rem" }}
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setToggleAllModal(null)}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleConfirmToggleAll}
                disabled={saving}
                style={{
                  background: toggleAllModal === "lock" ? "#dc2626" : "#16a34a",
                  color: "white",
                  border: "none",
                  fontWeight: 800,
                  padding: "7px 16px",
                  borderRadius: 8,
                }}
              >
                {saving ? "Đang xử lý..." : toggleAllModal === "lock" ? "Khóa Toàn Bộ Ngay" : "Mở Khóa Toàn Bộ"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
