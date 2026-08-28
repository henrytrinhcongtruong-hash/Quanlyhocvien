"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, User, Eye, EyeOff, AlertCircle, BookOpen } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Check lockout on mount & tick timer
  React.useEffect(() => {
    const checkLockout = () => {
      try {
        const lockoutUntil = Number(localStorage.getItem("admin_login_lockout_until") || "0");
        const now = Date.now();
        if (lockoutUntil > now) {
          setLockoutRemaining(Math.ceil((lockoutUntil - now) / 1000));
        } else {
          setLockoutRemaining(0);
        }
      } catch {}
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutRemaining > 0) {
      setError(`Bạn đã thử sai quá nhiều lần. Vui lòng chờ ${lockoutRemaining} giây.`);
      return;
    }

    if (!username || !password) {
      setError("Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Track failed attempts
        try {
          const attempts = Number(localStorage.getItem("admin_login_failed_attempts") || "0") + 1;
          localStorage.setItem("admin_login_failed_attempts", String(attempts));

          if (attempts >= 5) {
            const lockoutTime = Date.now() + 60 * 1000; // 60s lockout
            localStorage.setItem("admin_login_lockout_until", String(lockoutTime));
            localStorage.setItem("admin_login_failed_attempts", "0");
            setLockoutRemaining(60);
            setError("Đăng nhập sai 5 lần liên tiếp. Hệ thống đã tạm khóa 60 giây để bảo vệ tài khoản!");
          } else {
            setError(`Tên đăng nhập hoặc mật khẩu không đúng (Lần thử ${attempts}/5).`);
          }
        } catch {
          setError("Tên đăng nhập hoặc mật khẩu không đúng.");
        }
      } else {
        // Reset failed attempts on success
        try {
          localStorage.removeItem("admin_login_failed_attempts");
          localStorage.removeItem("admin_login_lockout_until");
        } catch {}
        window.location.href = "/admin";
      }
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(145deg, hsl(213,94%,96%) 0%, hsl(152,60%,95%) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "fixed",
          top: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(213,94%,44%,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: -80,
          right: -80,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(152,60%,38%,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          background: "white",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "42px 36px",
          width: "100%",
          maxWidth: 400,
          border: "1px solid var(--border)",
          position: "relative",
          animation: "fadeIn 0.3s ease",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 60,
              height: 60,
              background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(213,80%,58%) 100%)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              boxShadow: "0 6px 20px rgba(16,90,188,0.3)",
            }}
          >
            <BookOpen size={26} color="white" />
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 900, marginBottom: 4, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            Quanlyhocvien
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Hệ thống Quản lý Học viên & Giáo dục
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 8,
              background: "var(--danger-light)",
              border: "1px solid var(--danger-border)",
              color: "var(--danger)",
              fontSize: "0.875rem",
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label" htmlFor="username">
              Tên đăng nhập
            </label>
            <div style={{ position: "relative" }}>
              <User
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                id="username"
                className="input"
                style={{ paddingLeft: 38 }}
                type="text"
                placeholder="Nhập tên đăng nhập..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="password">
              Mật khẩu
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                id="password"
                className="input"
                style={{ paddingLeft: 38, paddingRight: 44 }}
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 4,
                }}
                aria-label={showPass ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 4, fontSize: "0.95rem", height: 44, borderRadius: 12, fontWeight: 800 }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập hệ thống"
            )}
          </button>
        </form>

        {/* Student Register Banner */}
        <div style={{ marginTop: 24, textAlign: "center", borderTop: "1.5px solid #f1f5f9", paddingTop: 16 }}>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 6 }}>
            Bạn là học sinh và chưa có tài khoản?
          </div>
          <Link
            href="/dang-ky"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.85rem",
              fontWeight: 800,
              color: "#0284c7",
              textDecoration: "none",
              background: "#e0f2fe",
              padding: "6px 14px",
              borderRadius: 10,
            }}
          >
            ✨ Đăng Ký Tài Khoản Học Viên Ngay
          </Link>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
