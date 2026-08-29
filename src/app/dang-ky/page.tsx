"use client";
import React, { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  User,
  School,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface StudentStatus {
  id: number;
  hoTen: string;
  to: number;
  lop: string;
  isRegistered: boolean;
  username: string | null;
}

function DangKyHocVienForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultLop = searchParams.get("lop") || "12T2";

  const [classList, setClassList] = useState<string[]>(["12T2", "11AT3"]);
  const [students, setStudents] = useState<StudentStatus[]>([]);
  const [hoTen, setHoTen] = useState("");
  const [lop, setLop] = useState(defaultLop);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load active class list
  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) {
          setClassList(d.data);
          if (!d.data.includes(lop)) {
            setLop(d.data[0]);
          }
        }
      })
      .catch(() => {});
  }, [lop]);

  // Load student list and registration status for selected class
  useEffect(() => {
    if (!lop) return;
    fetch(`/api/auth/register-student?lop=${encodeURIComponent(lop)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setStudents(d.data);
        }
      })
      .catch(() => {});
  }, [lop]);

  // Check matching student status
  const matchedStudent = students.find(
    (s) => s.hoTen.normalize("NFC").trim().toLowerCase() === hoTen.normalize("NFC").trim().toLowerCase()
  );

  const isAlreadyRegistered = matchedStudent?.isRegistered;

  const handleSelectStudentName = (name: string) => {
    setHoTen(name);
    // Auto suggest clean username if empty
    if (!username) {
      const clean = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "d")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      setUsername(`${clean}${lop.toLowerCase()}`);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!hoTen.trim()) {
      setError("Vui lòng nhập hoặc chọn họ và tên của bạn.");
      return;
    }
    if (!lop) {
      setError("Vui lòng chọn lớp học.");
      return;
    }
    if (isAlreadyRegistered) {
      setError(
        `Mỗi học sinh chỉ được đăng ký DUY NHẤT 1 tài khoản để chống tài khoản clone! Học sinh "${matchedStudent?.hoTen}" đã có tài khoản (Username: "${matchedStudent?.username}"). Vui lòng liên hệ Admin/GVCN để lấy lại mật khẩu.`
      );
      return;
    }
    if (!username.trim()) {
      setError("Vui lòng nhập tên đăng nhập mong muốn.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }
    if (password.length < 4) {
      setError("Mật khẩu phải có ít nhất 4 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu và xác nhận mật khẩu không khớp nhau.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hoTen: hoTen.trim(),
          lop,
          username: username.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
        setLoading(false);
        return;
      }

      setSuccess(`Chúc mừng ${data.user.hoTen}! Đang tự động đăng nhập vào Lớp ${data.user.lop}...`);

      // Auto sign-in immediately
      const loginRes = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (loginRes?.ok) {
        setTimeout(() => {
          window.location.href = `/?lop=${data.user.lop}`;
        }, 1000);
      } else {
        setTimeout(() => {
          router.push(`/login?registered=1&username=${encodeURIComponent(username.trim())}`);
        }, 1200);
      }
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
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
          maxWidth: 480,
          background: "#ffffff",
          borderRadius: 24,
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          padding: "32px 30px",
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
            Đăng Ký Tài Khoản Học Viên
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0, lineHeight: 1.4 }}>
            Xác thực danh tính học sinh để xem dữ liệu lớp học riêng tư
          </p>
        </div>

        {/* Security Note Banner */}
        <div
          style={{
            background: "#f0f9ff",
            border: "1.5px solid #bae6fd",
            borderRadius: 14,
            padding: "12px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <ShieldCheck size={20} color="#0284c7" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: "0.78rem", color: "#0369a1", lineHeight: 1.4 }}>
            <strong style={{ display: "block", marginBottom: 2 }}>Chính sách bảo mật & Chống tài khoản Clone:</strong>
            Mỗi học sinh trong danh sách lớp chỉ được đăng ký <strong>1 tài khoản duy nhất</strong>. Hệ thống sẽ tự động đối soát và khóa chặn mọi hành vi tạo tài khoản ảo trùng lặp.
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

        {success && (
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
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 1. Lớp Học */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 800, color: "#334155", marginBottom: 6 }}>
              Lớp học của bạn *
            </label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
                <School size={17} />
              </div>
              <select
                className="select"
                style={{
                  paddingLeft: 38,
                  height: 44,
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  borderRadius: 12,
                  borderColor: "#cbd5e1",
                }}
                value={lop}
                onChange={(e) => {
                  setLop(e.target.value);
                  setHoTen("");
                  setUsername("");
                }}
                disabled={loading}
              >
                {classList.map((c) => (
                  <option key={c} value={c}>
                    Lớp {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Họ và tên học sinh */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155" }}>
                Họ và tên học sinh (Đúng danh sách lớp) *
              </label>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
                <User size={17} />
              </div>
              <input
                className="input"
                list="students-datalist"
                style={{
                  paddingLeft: 38,
                  height: 44,
                  fontSize: "0.9rem",
                  borderRadius: 12,
                  borderColor: isAlreadyRegistered ? "#ef4444" : matchedStudent ? "#10b981" : "#cbd5e1",
                  background: isAlreadyRegistered ? "#fef2f2" : "white",
                }}
                placeholder="VD: Nguyễn Văn An (Nhập hoặc chọn)"
                value={hoTen}
                onChange={(e) => handleSelectStudentName(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <datalist id="students-datalist">
                {students.map((s) => (
                  <option key={s.id} value={s.hoTen}>
                    {s.isRegistered ? `(Đã có tài khoản: ${s.username})` : `(Tổ ${s.to} - Chưa đăng ký)`}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Realtime Anti-Clone Status Badges */}
            {hoTen.trim() && (
              <div style={{ marginTop: 6 }}>
                {isAlreadyRegistered ? (
                  <div
                    style={{
                      background: "#fee2e2",
                      border: "1px solid #fca5a5",
                      color: "#b91c1c",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>
                      Học sinh này đã có tài khoản (<strong>{matchedStudent?.username}</strong>). Mỗi học sinh chỉ được đăng ký 1 lần duy nhất!
                    </span>
                  </div>
                ) : matchedStudent ? (
                  <div
                    style={{
                      background: "#dcfce7",
                      border: "1px solid #86efac",
                      color: "#15803d",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                    <span>Hợp lệ: Học sinh {matchedStudent.hoTen} (Tổ {matchedStudent.to} • Lớp {lop}) — Sẵn sàng đăng ký!</span>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.72rem", color: "#d97706", margin: 0 }}>
                    💡 Hãy nhập đúng họ và tên như trên danh bạ lớp học để hệ thống xác thực.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 3. Tên đăng nhập */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 800, color: "#334155", marginBottom: 6 }}>
              Tên đăng nhập mong muốn *
            </label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
                <Sparkles size={17} />
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
                placeholder="VD: vanan12t2 (viết liền không dấu)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <p style={{ fontSize: "0.72rem", color: "#64748b", margin: "4px 0 0", lineHeight: 1.3 }}>
              Dùng để đăng nhập vào trang cá nhân của bạn sau này.
            </p>
          </div>

          {/* 4. Mật khẩu */}
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
                placeholder="Tối thiểu 4 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
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

          {/* 5. Xác nhận mật khẩu */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 800, color: "#334155", marginBottom: 6 }}>
              Xác nhận lại mật khẩu *
            </label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
                <Lock size={17} />
              </div>
              <input
                type={showConfirmPass ? "text" : "password"}
                className="input"
                style={{
                  paddingLeft: 38,
                  paddingRight: 38,
                  height: 44,
                  fontSize: "0.9rem",
                  borderRadius: 12,
                  borderColor: "#cbd5e1",
                }}
                placeholder="Nhập lại chính xác mật khẩu trên"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
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
                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              marginTop: 10,
              height: 46,
              borderRadius: 12,
              fontWeight: 800,
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 6px 20px rgba(2, 132, 199, 0.35)",
              transition: "all 0.15s ease",
            }}
          >
            {loading ? "Đang xác thực & tạo tài khoản..." : (
              <>
                Đăng Ký Tài Khoản Học Viên <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Footer switch to Login */}
        <div style={{ marginTop: 22, textAlign: "center", borderTop: "1.5px solid #f1f5f9", paddingTop: 16 }}>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Đã có tài khoản học viên? </span>
          <Link
            href="/login"
            style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0284c7", textDecoration: "none" }}
          >
            Đăng nhập ngay →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DangKyHocVienPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0284c7", color: "white", fontWeight: 700 }}>
          Đang tải trang đăng ký...
        </div>
      }
    >
      <DangKyHocVienForm />
    </Suspense>
  );
}
