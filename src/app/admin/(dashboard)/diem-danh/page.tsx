"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BookOpen, Calendar as CalendarIcon, CheckCircle, XCircle, Clock,
  Upload, Download, Plus, Trash2, Filter, AlertCircle, Save,
  Search, Users, X, School, ArrowUpDown, ArrowUpAZ, ArrowDownAZ, Check,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { compareVietnameseNames } from "@/lib/utils";

// Hook detect mobile screen
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

interface Student {
  id: number;
  hoTen: string;
  tenGoi: string | null;
  to: number;
  lop: string;
}

interface AttendanceRecord {
  id: number;
  studentId: number;
  ngay: string;
  loai: string;
  ghiChu: string | null;
  student: { id: number; hoTen: string; tenGoi: string | null; to: number; lop: string };
}

const ATTENDANCE_TYPES = ["Vắng có phép", "Vắng không phép", "Đi trễ"] as const;

export default function DiemDanhAdminPage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const isMobile = useIsMobile();
  const { data: session } = useSession();

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "11AT3";

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedTo, setSelectedTo] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CO_MAT" | "VANG_CO_PHEP" | "VANG_KHONG_PHEP" | "DI_TRE">("ALL");
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("admin_attendance_sort_order") as "default" | "asc" | "desc") || "default";
    }
    return "default";
  });

  const handleSetSortOrder = (newOrder: "default" | "asc" | "desc") => {
    setSortOrder(newOrder);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_attendance_sort_order", newOrder);
    }
  };
  const [filterLop, setFilterLop] = useState(() => {
    if (!isSuperAdmin && assignedLop) return assignedLop;
    return urlLop || "ALL";
  });
  const [classList, setClassList] = useState<string[]>(["11AT3", "12T2"]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // Manual modal
  const [modalOpen, setModalOpen] = useState(false);
  const [manualStudentId, setManualStudentId] = useState<number | "">("");
  const [manualLoai, setManualLoai] = useState<string>("Vắng có phép");
  const [manualGhiChu, setManualGhiChu] = useState("");

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Load students, records & classes in parallel
  const loadData = async () => {
    setLoading(true);
    try {
      const activeClass = !isSuperAdmin ? assignedLop : filterLop;
      const lopQuery = activeClass !== "ALL" ? `&lop=${activeClass}` : "";
      const [stdRes, attRes, classRes] = await Promise.all([
        fetch(`/api/students${activeClass !== "ALL" ? `?lop=${activeClass}` : ""}`),
        fetch(`/api/attendance?ngay=${selectedDate}${lopQuery}`),
        fetch("/api/classes"),
      ]);
      const [stdData, attData, classData] = await Promise.all([
        stdRes.json(), attRes.json(), classRes.json(),
      ]);

      setStudents(stdData.data || []);
      setRecords(attData.data || []);
      if (classData.data && classData.data.length > 0) setClassList(classData.data);
    } catch {
      showToast("Lỗi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, filterLop]);

  // Fast toggle attendance for a student — OPTIMISTIC UI (instant, no reload)
  async function handleToggleStatus(studentId: number, loai: string) {
    const existing = records.find(r => r.studentId === studentId && r.loai === loai);
    if (existing) {
      // Optimistic: remove from local state immediately
      setRecords(prev => prev.filter(r => r.id !== existing.id));
      showToast("Đã hủy ghi nhận (Có mặt)");

      // Fire API in background
      const res = await fetch(`/api/attendance?id=${existing.id}`, { method: "DELETE" });
      if (!res.ok) {
        // Rollback on failure
        setRecords(prev => [...prev, existing]);
        showToast("Lỗi khi hủy — đã khôi phục", "error");
      }
    } else {
      // Optimistic: add a temporary record to local state immediately
      const student = students.find(s => s.id === studentId);
      const tempId = -(Date.now()); // negative temp ID
      const tempRecord: AttendanceRecord = {
        id: tempId,
        studentId,
        ngay: selectedDate,
        loai,
        ghiChu: null,
        student: student
          ? { id: student.id, hoTen: student.hoTen, tenGoi: student.tenGoi, to: student.to, lop: student.lop }
          : { id: studentId, hoTen: "", tenGoi: null, to: 0, lop: "" },
      };
      setRecords(prev => [...prev, tempRecord]);
      showToast(`Đã ghi nhận: ${loai}`);

      // Fire API in background
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, ngay: selectedDate, loai }),
      });
      if (res.ok) {
        // Replace temp record with real server record
        const serverRecord = await res.json();
        setRecords(prev =>
          prev.map(r =>
            r.id === tempId
              ? { ...tempRecord, id: serverRecord.id ?? tempRecord.id }
              : r
          )
        );
      } else {
        // Rollback on failure
        setRecords(prev => prev.filter(r => r.id !== tempId));
        showToast("Lỗi khi ghi nhận — đã khôi phục", "error");
      }
    }
  }

  // Handle Manual Save
  async function handleSaveManual() {
    if (!manualStudentId) {
      showToast("Vui lòng chọn học sinh", "error");
      return;
    }
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: manualStudentId,
        ngay: selectedDate,
        loai: manualLoai,
        ghiChu: manualGhiChu.trim(),
      }),
    });
    if (res.ok) {
      showToast("Đã thêm bản ghi điểm danh");
      setModalOpen(false);
      setManualStudentId("");
      setManualGhiChu("");
      loadData();
    } else {
      showToast("Lỗi khi thêm", "error");
    }
  }

  // Handle Excel Import
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/attendance/import", { method: "POST", body: formData });
    if (res.ok) {
      const d = await res.json();
      showToast(`Đã import ${d.count} bản ghi điểm danh thành công`);
      loadData();
    } else {
      showToast("Import thất bại. Kiểm tra file Excel.", "error");
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const baseStudents = React.useMemo(() => {
    let list = students.filter(s => {
      const matchTo = selectedTo === 0 || s.to === selectedTo;
      const matchLop = filterLop === "ALL" || s.lop === filterLop;
      const matchSearch =
        !search ||
        s.hoTen.toLowerCase().includes(search.toLowerCase()) ||
        (s.tenGoi && s.tenGoi.toLowerCase().includes(search.toLowerCase()));
      return matchTo && matchLop && matchSearch;
    });

    if (sortOrder !== "default") {
      list = [...list].sort((a, b) => compareVietnameseNames(a.hoTen, b.hoTen, sortOrder));
    }
    return list;
  }, [students, selectedTo, filterLop, search, sortOrder]);

  const stats = React.useMemo(() => {
    let vangCoPhep = 0;
    let vangKhongPhep = 0;
    let diTre = 0;

    baseStudents.forEach(s => {
      const sRecords = records.filter(r => r.studentId === s.id);
      if (sRecords.some(r => r.loai === "Vắng có phép")) vangCoPhep++;
      if (sRecords.some(r => r.loai === "Vắng không phép")) vangKhongPhep++;
      if (sRecords.some(r => r.loai === "Đi trễ")) diTre++;
    });

    const total = baseStudents.length;
    const coMat = Math.max(0, total - (vangCoPhep + vangKhongPhep));

    return { total, coMat, vangCoPhep, vangKhongPhep, diTre };
  }, [baseStudents, records]);

  const filteredStudents = React.useMemo(() => {
    if (statusFilter === "ALL") return baseStudents;

    return baseStudents.filter(s => {
      const sRecords = records.filter(r => r.studentId === s.id);
      const isVangCP = sRecords.some(r => r.loai === "Vắng có phép");
      const isVangKP = sRecords.some(r => r.loai === "Vắng không phép");
      const isDiTre = sRecords.some(r => r.loai === "Đi trễ");

      if (statusFilter === "CO_MAT") {
        return !isVangCP && !isVangKP;
      }
      if (statusFilter === "VANG_CO_PHEP") {
        return isVangCP;
      }
      if (statusFilter === "VANG_KHONG_PHEP") {
        return isVangKP;
      }
      if (statusFilter === "DI_TRE") {
        return isDiTre;
      }
      return true;
    });
  }, [baseStudents, records, statusFilter]);

  const { coMat, vangCoPhep, vangKhongPhep, diTre, total: totalStudentsCount } = stats;

  return (
    <div className="animate-fade-in">
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 1000,
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 18px", borderRadius: 10,
            background: toast.type === "success" ? "var(--success)" : "var(--danger)",
            color: "white", fontWeight: 600, fontSize: "0.875rem",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: isMobile ? "stretch" : "flex-start", justifyContent: "space-between", marginBottom: isMobile ? 14 : 20, flexWrap: "wrap", gap: isMobile ? 8 : 12, flexDirection: isMobile ? "column" : "row" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "1.15rem" : "1.4rem", marginBottom: 4 }}>
            Điểm danh {filterLop !== "ALL" ? `— ${filterLop}` : "Toàn trường"}
          </h1>
          {!isMobile && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
              Điểm danh 1-chạm: Vắng có phép, Vắng không phép, Đi trễ
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: "none" }} />
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={importing} style={isMobile ? { flex: 1, fontSize: "0.75rem", padding: "6px 8px" } : undefined}>
            <Upload size={14} />
            {importing ? "Import..." : "Import"}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.open("/api/attendance/export", "_blank")} style={isMobile ? { flex: 1, fontSize: "0.75rem", padding: "6px 8px" } : undefined}>
            <Download size={14} /> Export
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)} style={isMobile ? { flex: 1, fontSize: "0.75rem", padding: "6px 8px" } : undefined}>
            <Plus size={14} /> Ghi nhận
          </button>
        </div>
      </div>

      {/* Controls Bar: Date + Class Filter + Tổ + Search + Sort */}
      <div className="card" style={{ padding: isMobile ? "12px 14px" : "16px 20px", marginBottom: isMobile ? 12 : 20, display: "flex", gap: isMobile ? 8 : 12, alignItems: "stretch", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexWrap: "wrap", flex: "1 1 auto" }}>
          {/* Row 1 on mobile: Date + Class + Tổ */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, ...(isMobile ? { width: "100%" } : {}) }}>
            <CalendarIcon size={isMobile ? 14 : 16} color="var(--primary)" />
            <input
              type="date"
              className="input"
              style={{ minHeight: 36, padding: "4px 10px", width: isMobile ? undefined : 145, flex: isMobile ? 1 : undefined }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 6, ...(isMobile ? { width: "100%" } : {}) }}>
            <select
              className="select"
              style={{ width: isMobile ? undefined : 145, flex: isMobile ? 1 : undefined, fontWeight: 700, color: "var(--primary)", minHeight: 36 }}
              value={filterLop}
              onChange={(e) => setFilterLop(e.target.value)}
            >
              <option value="ALL">🏫 Tất cả lớp</option>
              {classList.map(c => (
                <option key={c} value={c}>Lớp {c}</option>
              ))}
            </select>

            <select
              className="select"
              style={{ width: isMobile ? undefined : 120, flex: isMobile ? 1 : undefined, minHeight: 36 }}
              value={selectedTo}
              onChange={(e) => setSelectedTo(Number(e.target.value))}
            >
              <option value={0}>Tất cả tổ</option>
              {[1, 2, 3, 4].map(t => <option key={t} value={t}>Tổ {t}</option>)}
            </select>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", minWidth: isMobile ? undefined : 180, flex: "1 1 180px", ...(isMobile ? { width: "100%" } : {}) }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              className="input"
              style={{ paddingLeft: 34, minHeight: 36, width: "100%" }}
              placeholder="Tìm tên học sinh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sort + Clear row */}
          <div style={{ display: "flex", gap: 6, ...(isMobile ? { width: "100%" } : {}) }}>
            <button
              type="button"
              className={`btn btn-sm ${sortOrder !== "default" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                if (sortOrder === "default") handleSetSortOrder("asc");
                else if (sortOrder === "asc") handleSetSortOrder("desc");
                else handleSetSortOrder("default");
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, minHeight: 36, flex: isMobile ? 1 : undefined, justifyContent: "center" }}
              title="Bấm để đổi sắp xếp tên: A-Z -> Z-A -> Mặc định"
            >
              {sortOrder === "asc" ? (
                <>
                  <ArrowUpAZ size={15} /> {isMobile ? "A→Z" : "Tên: A → Z"}
                </>
              ) : sortOrder === "desc" ? (
                <>
                  <ArrowDownAZ size={15} /> {isMobile ? "Z→A" : "Tên: Z → A"}
                </>
              ) : (
                <>
                  <ArrowUpDown size={14} /> {isMobile ? "Sắp xếp" : "Sắp xếp tên"}
                </>
              )}
            </button>

            {(search || selectedTo > 0 || filterLop !== "ALL" || sortOrder !== "default" || statusFilter !== "ALL") && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setSearch(""); setSelectedTo(0); setFilterLop("ALL"); handleSetSortOrder("default"); setStatusFilter("ALL"); }}
                style={{ minHeight: 36, flex: isMobile ? 1 : undefined, justifyContent: "center" }}
              >
                <X size={13} /> Bỏ lọc
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats on selected day — BỘ LỌC 1-CHẠM TRỰC QUAN */}
        <div style={{
          display: "flex",
          gap: isMobile ? 6 : 8,
          flexWrap: isMobile ? "nowrap" : "wrap",
          alignItems: "center",
          ...(isMobile ? { overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4, width: "100%", msOverflowStyle: "none", scrollbarWidth: "none" } : {}),
        }}>
          {([
            { key: "ALL" as const, label: "Tất cả", count: totalStudentsCount, activeBg: "#334155", activeBorder: "#334155", inactiveBg: "#f8fafc", inactiveBorder: "#cbd5e1", activeColor: "#ffffff", inactiveColor: "#475569", shadow: "rgba(51, 65, 85, 0.25)" },
            { key: "CO_MAT" as const, label: "Có mặt", count: coMat, activeBg: "#16a34a", activeBorder: "#15803d", inactiveBg: "#ecfdf5", inactiveBorder: "#86efac", activeColor: "#ffffff", inactiveColor: "#065f46", shadow: "rgba(22, 163, 74, 0.3)" },
            { key: "VANG_CO_PHEP" as const, label: "Có phép", count: vangCoPhep, activeBg: "#ca8a04", activeBorder: "#a16207", inactiveBg: "#fffbeb", inactiveBorder: "#fde047", activeColor: "#ffffff", inactiveColor: "#92400e", shadow: "rgba(202, 138, 4, 0.3)" },
            { key: "VANG_KHONG_PHEP" as const, label: isMobile ? "K.phép" : "Không phép", count: vangKhongPhep, activeBg: "#dc2626", activeBorder: "#b91c1c", inactiveBg: "#fef2f2", inactiveBorder: "#fca5a5", activeColor: "#ffffff", inactiveColor: "#991b1b", shadow: "rgba(220, 38, 38, 0.3)" },
            { key: "DI_TRE" as const, label: "Đi trễ", count: diTre, activeBg: "#2563eb", activeBorder: "#1d4ed8", inactiveBg: "#eff6ff", inactiveBorder: "#bfdbfe", activeColor: "#ffffff", inactiveColor: "#1e40af", shadow: "rgba(37, 99, 235, 0.3)" },
          ] as const).map(pill => {
            const isActive = statusFilter === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setStatusFilter(isActive && pill.key !== "ALL" ? "ALL" : pill.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: isMobile ? "5px 10px" : "6px 12px",
                  fontSize: isMobile ? "0.73rem" : "0.8rem",
                  fontWeight: isActive ? 800 : 600,
                  borderRadius: 9999,
                  border: isActive ? `2px solid ${pill.activeBorder}` : `1.5px solid ${pill.inactiveBorder}`,
                  background: isActive ? pill.activeBg : pill.inactiveBg,
                  color: isActive ? pill.activeColor : pill.inactiveColor,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? `0 2px 8px ${pill.shadow}` : "none",
                  transform: isActive ? "scale(1.03)" : "scale(1)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {isActive && <Check size={11} />}
                {pill.label}: {pill.count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Student Attendance Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {statusFilter !== "ALL" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 16px",
              background: "rgba(59, 130, 246, 0.06)",
              borderBottom: "1px solid var(--border)",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Filter size={13} color="var(--primary)" />
              <span>
                Đang lọc:{" "}
                <strong style={{ color: "var(--primary)" }}>
                  {statusFilter === "CO_MAT" && "🟢 Học sinh Có mặt"}
                  {statusFilter === "VANG_CO_PHEP" && "🟡 Học sinh Vắng có phép"}
                  {statusFilter === "VANG_KHONG_PHEP" && "🔴 Học sinh Vắng không phép"}
                  {statusFilter === "DI_TRE" && "🔵 Học sinh Đi trễ"}
                </strong>{" "}
                ({filteredStudents.length} học sinh)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <X size={12} /> Xem tất cả ({totalStudentsCount})
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 32 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 42, marginBottom: 6, borderRadius: 6 }} />
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
            <Users size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", margin: 0 }}>
              {statusFilter === "VANG_CO_PHEP"
                ? `Không có học sinh nào Vắng có phép trong ngày ${formatDate(selectedDate)}`
                : statusFilter === "VANG_KHONG_PHEP"
                ? `Không có học sinh nào Vắng không phép trong ngày ${formatDate(selectedDate)}`
                : statusFilter === "DI_TRE"
                ? `Không có học sinh nào Đi trễ trong ngày ${formatDate(selectedDate)}`
                : statusFilter === "CO_MAT"
                ? `Không có học sinh nào Có mặt trong ngày ${formatDate(selectedDate)}`
                : "Không có học sinh nào phù hợp"}
            </p>
            {statusFilter !== "ALL" && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setStatusFilter("ALL")}
                style={{ marginTop: 12 }}
              >
                Xem tất cả ({totalStudentsCount} học sinh)
              </button>
            )}
          </div>
        ) : isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {filteredStudents.map((s, idx) => {
              const studentRecords = records.filter(r => r.studentId === s.id);
              const isVangCoPhep = studentRecords.some(r => r.loai === "Vắng có phép");
              const isVangKhongPhep = studentRecords.some(r => r.loai === "Vắng không phép");
              const isDiTre = studentRecords.some(r => r.loai === "Đi trễ");

              return (
                <div
                  key={s.id}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600, flexShrink: 0, width: 22, textAlign: "right" }}>{idx + 1}.</span>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.hoTen}</span>
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", gap: 4, alignItems: "center" }}>
                      <span className="badge badge-info" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>{s.lop}</span>
                      <span className="badge badge-neutral" style={{ fontSize: "0.68rem", padding: "1px 5px" }}>T{s.to}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ flexShrink: 0 }}>
                      {studentRecords.length === 0 ? (
                        <span className="badge badge-success" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
                          <CheckCircle size={11} /> Có mặt
                        </span>
                      ) : (
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                          {studentRecords.map(r => (
                            <span
                              key={r.id}
                              className={`badge ${
                                r.loai === "Vắng có phép" ? "badge-warning"
                                  : r.loai === "Vắng không phép" ? "badge-danger"
                                  : "badge-info"
                              }`}
                              style={{ fontSize: "0.68rem", padding: "2px 6px" }}
                            >
                              {r.loai === "Vắng có phép" ? "Có phép" : r.loai === "Vắng không phép" ? "K.phép" : "Đi trễ"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => handleToggleStatus(s.id, "Vắng có phép")}
                        className={`btn btn-sm ${isVangCoPhep ? "btn-primary" : "btn-secondary"}`}
                        style={{
                          fontSize: "0.68rem", padding: "3px 8px", minHeight: 28,
                          background: isVangCoPhep ? "var(--warning)" : undefined,
                          color: isVangCoPhep ? "black" : undefined,
                        }}
                      >
                        Phép
                      </button>
                      <button
                        onClick={() => handleToggleStatus(s.id, "Vắng không phép")}
                        className={`btn btn-sm ${isVangKhongPhep ? "btn-danger" : "btn-secondary"}`}
                        style={{ fontSize: "0.68rem", padding: "3px 8px", minHeight: 28 }}
                      >
                        K.P
                      </button>
                      <button
                        onClick={() => handleToggleStatus(s.id, "Đi trễ")}
                        className={`btn btn-sm ${isDiTre ? "btn-primary" : "btn-secondary"}`}
                        style={{
                          fontSize: "0.68rem", padding: "3px 8px", minHeight: 28,
                          background: isDiTre ? "var(--info)" : undefined,
                          color: isDiTre ? "white" : undefined,
                        }}
                      >
                        Trễ
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => {
                      if (sortOrder === "default") handleSetSortOrder("asc");
                      else if (sortOrder === "asc") handleSetSortOrder("desc");
                      else handleSetSortOrder("default");
                    }}
                    title="Bấm để đổi chiều sắp xếp tên: A-Z -> Z-A -> Mặc định"
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span>Họ và tên</span>
                      {sortOrder === "asc" ? (
                        <span className="badge badge-primary" style={{ padding: "1px 6px", fontSize: "0.7rem" }}>
                          <ArrowUpAZ size={12} /> A-Z
                        </span>
                      ) : sortOrder === "desc" ? (
                        <span className="badge badge-primary" style={{ padding: "1px 6px", fontSize: "0.7rem" }}>
                          <ArrowDownAZ size={12} /> Z-A
                        </span>
                      ) : (
                        <ArrowUpDown size={12} style={{ color: "var(--text-muted)" }} />
                      )}
                    </div>
                  </th>
                  <th>Lớp</th>
                  <th>Tổ</th>
                  <th style={{ textAlign: "center" }}>Trạng thái ngày {formatDate(selectedDate)}</th>
                  <th style={{ width: 220, textAlign: "right" }}>Ghi nhận nhanh (1-chạm)</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => {
                  const studentRecords = records.filter(r => r.studentId === s.id);
                  const isVangCoPhep = studentRecords.some(r => r.loai === "Vắng có phép");
                  const isVangKhongPhep = studentRecords.some(r => r.loai === "Vắng không phép");
                  const isDiTre = studentRecords.some(r => r.loai === "Đi trễ");

                  return (
                    <tr key={s.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{s.hoTen}</td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                          {s.lop}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>Tổ {s.to}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {studentRecords.length === 0 ? (
                          <span className="badge badge-success" style={{ fontSize: "0.78rem" }}>
                            <CheckCircle size={12} /> Có mặt
                          </span>
                        ) : (
                          <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                            {studentRecords.map(r => (
                              <span
                                key={r.id}
                                className={`badge ${
                                  r.loai === "Vắng có phép"
                                    ? "badge-warning"
                                    : r.loai === "Vắng không phép"
                                    ? "badge-danger"
                                    : "badge-info"
                                }`}
                                style={{ fontSize: "0.75rem" }}
                              >
                                {r.loai}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          <button
                            onClick={() => handleToggleStatus(s.id, "Vắng có phép")}
                            className={`btn btn-sm ${isVangCoPhep ? "btn-primary" : "btn-secondary"}`}
                            style={{
                              fontSize: "0.75rem", padding: "3px 7px",
                              background: isVangCoPhep ? "var(--warning)" : undefined,
                              color: isVangCoPhep ? "black" : undefined,
                            }}
                          >
                            Có phép
                          </button>
                          <button
                            onClick={() => handleToggleStatus(s.id, "Vắng không phép")}
                            className={`btn btn-sm ${isVangKhongPhep ? "btn-danger" : "btn-secondary"}`}
                            style={{ fontSize: "0.75rem", padding: "3px 7px" }}
                          >
                            Không phép
                          </button>
                          <button
                            onClick={() => handleToggleStatus(s.id, "Đi trễ")}
                            className={`btn btn-sm ${isDiTre ? "btn-primary" : "btn-secondary"}`}
                            style={{
                              fontSize: "0.75rem", padding: "3px 7px",
                              background: isDiTre ? "var(--info)" : undefined,
                              color: isDiTre ? "white" : undefined,
                            }}
                          >
                            Đi trễ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Modal */}
      {modalOpen && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            overflowY: "auto",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
              padding: "24px 26px",
              width: "100%",
              maxWidth: 460,
              maxHeight: "calc(100vh - 40px)",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--border)",
              animation: "slideUp 0.18s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>Ghi nhận điểm danh chi tiết</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Chọn học sinh *</label>
                <select
                  className="select"
                  value={manualStudentId}
                  onChange={(e) => setManualStudentId(Number(e.target.value))}
                >
                  <option value="">-- Chọn học sinh --</option>
                  {classList.map(c => {
                    const classStudents = students.filter(s => s.lop === c);
                    if (classStudents.length === 0) return null;
                    return (
                      <optgroup key={c} label={`Lớp ${c}`}>
                        {classStudents.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.hoTen} (Tổ {s.to})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="label">Loại điểm danh *</label>
                <select
                  className="select"
                  value={manualLoai}
                  onChange={(e) => setManualLoai(e.target.value)}
                >
                  {ATTENDANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Lý do / Ghi chú</label>
                <input
                  className="input"
                  value={manualGhiChu}
                  onChange={(e) => setManualGhiChu(e.target.value)}
                  placeholder="Ví dụ: Bị sốt có đơn của phụ huynh..."
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1.6 }} onClick={handleSaveManual}>
                <Save size={15} /> Lưu ghi nhận
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
