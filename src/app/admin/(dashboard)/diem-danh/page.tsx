"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BookOpen, Calendar as CalendarIcon, CheckCircle, XCircle, Clock,
  Upload, Download, Plus, Trash2, Filter, AlertCircle, Save,
  Search, Users, X, School,
} from "lucide-react";
import { formatDate } from "@/lib/format";

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
  const { data: session } = useSession();

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "11AT3";

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedTo, setSelectedTo] = useState(0);
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

  const filteredStudents = students.filter(s => {
    const matchTo = selectedTo === 0 || s.to === selectedTo;
    const matchLop = filterLop === "ALL" || s.lop === filterLop;
    return matchTo && matchLop;
  });

  const vangCoPhep = records.filter(r => r.loai === "Vắng có phép").length;
  const vangKhongPhep = records.filter(r => r.loai === "Vắng không phép").length;
  const diTre = records.filter(r => r.loai === "Đi trễ").length;
  const coMat = Math.max(0, filteredStudents.length - (vangCoPhep + vangKhongPhep));

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: 4 }}>
            Điểm danh chuyên cần {filterLop !== "ALL" ? `— Lớp ${filterLop}` : "Toàn trường"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Điểm danh 1-chạm: Vắng có phép, Vắng không phép, Đi trễ
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: "none" }} />
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload size={14} />
            {importing ? "Đang import..." : "Import Excel"}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.open("/api/attendance/export", "_blank")}>
            <Download size={14} /> Export Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Ghi nhận chi tiết
          </button>
        </div>
      </div>

      {/* Controls Bar: Date + Class Filter + Tổ */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: 20, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CalendarIcon size={16} color="var(--primary)" />
            <input
              type="date"
              className="input"
              style={{ minHeight: 36, padding: "4px 10px", width: 150 }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <select
            className="select"
            style={{ width: 160, fontWeight: 700, color: "var(--primary)" }}
            value={filterLop}
            onChange={(e) => setFilterLop(e.target.value)}
          >
            <option value="ALL">🏫 Tất cả các lớp</option>
            {classList.map(c => (
              <option key={c} value={c}>Lớp {c}</option>
            ))}
          </select>

          <select
            className="select"
            style={{ width: 130 }}
            value={selectedTo}
            onChange={(e) => setSelectedTo(Number(e.target.value))}
          >
            <option value={0}>Tất cả tổ</option>
            {[1, 2, 3, 4].map(t => <option key={t} value={t}>Tổ {t}</option>)}
          </select>
        </div>

        {/* Quick Stats on selected day */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge badge-success" style={{ padding: "6px 12px", fontSize: "0.82rem" }}>
            Có mặt: {coMat}
          </span>
          <span className="badge badge-warning" style={{ padding: "6px 12px", fontSize: "0.82rem" }}>
            Có phép: {vangCoPhep}
          </span>
          <span className="badge badge-danger" style={{ padding: "6px 12px", fontSize: "0.82rem" }}>
            Không phép: {vangKhongPhep}
          </span>
          <span className="badge badge-info" style={{ padding: "6px 12px", fontSize: "0.82rem" }}>
            Đi trễ: {diTre}
          </span>
        </div>
      </div>

      {/* Main Student Attendance Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 42, marginBottom: 6, borderRadius: 6 }} />
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
            <Users size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <p>Không có học sinh nào</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Họ và tên</th>
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
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={() => setModalOpen(false)} />
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "white", borderRadius: 14, boxShadow: "var(--shadow-lg)", padding: "28px",
            width: "100%", maxWidth: 440, animation: "fadeIn 0.2s ease",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Ghi nhận điểm danh chi tiết</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={18} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveManual}>
                <Save size={14} /> Lưu ghi nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
