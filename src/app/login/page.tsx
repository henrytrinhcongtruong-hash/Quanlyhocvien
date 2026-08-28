"use client";
import React, { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  GraduationCap,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const registered = searchParams.get("registered");
  const prefilledUsername = searchParams.get("username") || "";

  const [username, setUsername] = useState(prefilledUsername);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(
    registered ? "Đăng ký thành công! Vui lòng đăng nhập bằng tài khoản vừa tạo." : ""
  );
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Check lockout on mount & tick timer
  useEffect(() => {
    const checkLockout = () => {
      try {
        const lockoutUntil = Number(localStorage.getItem("app_login_lockout_until") || "0");
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

    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        try {
          const attempts = Number(localStorage.getItem("app_login_failed_attempts") || "0") + 1;
          localStorage.setItem("app_login_failed_attempts", String(attempts));

          if (attempts >= 5) {
            const lockoutTime = Date.now() + 60 * 1000;
            localStorage.setItem("app_login_lockout_until", String(lockoutTime));
            localStorage.setItem("app_login_failed_attempts", "0");
            setLockoutRemaining(60);
            setError("Đăng nhập sai 5 lần liên tiếp. Tạm khóa 60 giây để bảo vệ an toàn.");
          } else {
            setError(`Tên đăng nhập hoặc mật khẩu không đúng (Lần thử ${attempts}/5).`);
          }
        } catch {
          setError("Tên đăng nhập hoặc mật khẩu không đúng.");
        }
      } else {
        try {
          localStorage.removeItem("app_login_failed_attempts");
          localStorage.removeItem("app_login_lockout_until");
        } catch {}

        // Redirect directly
        window.location.href = callbackUrl.startsWith("/login") || callbackUrl.startsWith("/dang-ky") ? "/" : callbackUrl;
      }
    } catch {
      setError("Có lỗi kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #0284c7 0%, #1e40af 50%, #4f46e5 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative glows */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(56,189,248,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#ffffff",
          borderRadius: 24,
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          padding: "32px 28px",
          position: "relative",
          zIndex: 1,
          border: "1px solid rgba(255,255,255,0.8)",
          animation: "slideUp 0.25s ease-out",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              background: "linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              boxShadow: "0 8px 20px rgba(2,132,199,0.35)",
            }}
          >
            <GraduationCap size={32} color="white" />
          </div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>
            Cổng Học Viên & Quản Lý
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
            Đăng nhập để xem thông tin lớp học và các tiện ích
          </p>
        </div>

        {/* Security Note */}
        <div
          style={{
            background: "#f0f9ff",
            border: "1.5px solid #bae6fd",
            borderRadius: 14,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <ShieldCheck size={18} color="#0284c7" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: "0.78rem", color: "#0369a1", fontWeight: 600, lineHeight: 1.35 }}>
            Bảo mật riêng tư: Mỗi tài khoản chỉ xem đúng dữ liệu lớp của mình.
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1.5px solid #fecaca",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#dc2626",
              fontSize: "0.82rem",
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1.5px solid #bbf7d0",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#16a34a",
              fontSize: "0.82rem",
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            <Sparkles size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Username */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 800, color: "#334155", marginBottom: 6 }}>
              Tên đăng nhập *
            </label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
                <User size={17} />
              </div>
              <input
                className="input"
                style={{
                  paddingLeft: 38,
                  height: 44,
                  fontSize: "0.9rem",
                  borderRadius: 12,
                  borderColor: "#cbd5e1",
                }}
                placeholder="Tên đăng nhập học viên / admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || lockoutRemaining > 0}
                autoFocus={!prefilledUsername}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 800, color: "#334155", marginBottom: 6 }}>
              Mật khẩu *
            </label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
                <Lock size={17} />
              </div>
              <input
                type={showPass ? "text" : "password"}
                className="input"
                style={{
                  paddingLeft: 38,
                  paddingRight: 38,
                  height: 44,
                  fontSize: "0.9rem",
                  borderRadius: 12,
                  borderColor: "#cbd5e1",
                }}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || lockoutRemaining > 0}
                autoFocus={!!prefilledUsername}
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
                  color: "#64748b",
                  padding: 2,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Login */}
          <button
            type="submit"
            disabled={loading || lockoutRemaining > 0}
            className="btn btn-primary"
            style={{
              marginTop: 8,
              height: 46,
              borderRadius: 12,
              fontWeight: 800,
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 6px 20px rgba(2, 132, 199, 0.35)",
              cursor: loading || lockoutRemaining > 0 ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Đang xác thực..." : (
              <>
                Đăng Nhập Ngay <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", margin: "22px 0 16px", gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Hoặc</span>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        </div>

        {/* Register CTA Button */}
        <Link
          href="/dang-ky"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            height: 44,
            borderRadius: 12,
            background: "#f0fdf4",
            border: "1.5px solid #86efac",
            color: "#16a34a",
            fontWeight: 800,
            fontSize: "0.9rem",
            textDecoration: "none",
            boxShadow: "0 2px 6px rgba(22, 163, 74, 0.12)",
            transition: "all 0.15s ease",
          }}
        >
          <UserPlus size={18} />
          Bạn là học sinh mới? Đăng ký ngay
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0284c7", color: "white", fontWeight: 700 }}>
          Đang tải trang đăng nhập...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
