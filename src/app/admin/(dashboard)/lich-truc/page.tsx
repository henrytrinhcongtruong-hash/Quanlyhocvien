"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar as CalendarIcon, Plus, Trash2, Edit2, Users, ChevronLeft,
  ChevronRight, CheckCircle, AlertCircle, Save, X, Sparkles, School, RotateCcw,
} from "lucide-react";
import { getCurrentISOWeek, THU_NAMES, THU_ORDER } from "@/lib/format";

interface Student {
  id: number;
  hoTen: string;
  tenGoi: string | null;
  to: number;
  lop: string;
}

interface DutyItem {
  id: number;
  studentId: number;
  name: string;
  to: number;
  lop: string;
}

interface DutyDayGroup {
  thu: string;
  thuOrder: number;
  items: DutyItem[];
  students: string[];
}

export default function AdminLichTrucPage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const { data: session } = useSession();

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "11AT3";

  const [currentWeek, setCurrentWeek] = useState(getCurrentISOWeek());
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<DutyDayGroup[]>([]);
  const [classList, setClassList] = useState<string[]>(["11AT3", "12T2"]);
  const [filterLop, setFilterLop] = useState(() => {
    if (!isSuperAdmin && assignedLop) return assignedLop;
    return urlLop || "ALL";
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Modal State (Add or Edit single entry)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DutyItem | null>(null);
  const [selectedThu, setSelectedThu] = useState<string>("Thứ 2");
  const [selectedStudentId, setSelectedStudentId] = useState<number | "">("");

  // Modal State (Auto Assign / Reset Modal)
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [autoMode, setAutoMode] = useState<"to" | "all_class">("to");
  const [selectedToNum, setSelectedToNum] = useState<number>(1);
  const [clearPrevious, setClearPrevious] = useState<boolean>(true);

  const [saving, setSaving] = useState(false);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Load distinct classes
  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) setClassList(d.data);
      })
      .catch(() => {});
  }, []);

  // Sync with URL query parameter or assignedLop
  useEffect(() => {
    if (!isSuperAdmin && assignedLop) {
      setFilterLop(assignedLop);
      return;
    }
    if (urlLop) setFilterLop(urlLop);
  }, [urlLop, isSuperAdmin, assignedLop]);

  const currentDisplayClass = isSuperAdmin
    ? (filterLop !== "ALL" ? filterLop : "Toàn trường")
    : assignedLop;

  const loadData = async () => {
    setLoading(true);
    try {
      const activeClass = isSuperAdmin ? filterLop : assignedLop;
      const lopQuery = activeClass !== "ALL" ? `&lop=${activeClass}` : "";
      const [stdRes, dutyRes] = await Promise.all([
        fetch(`/api/students${activeClass !== "ALL" ? `?lop=${activeClass}` : ""}`),
        fetch(`/api/duty?week=${currentWeek}${lopQuery}`),
      ]);
      const stdData = await stdRes.json();
      const dutyData = await dutyRes.json();

      setStudents(stdData.data || []);
      setEntries(dutyData.entries || []);
    } catch {
      showToast("Lỗi tải lịch trực nhật", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek, filterLop]);

  // Navigate weeks
  function changeWeek(delta: number) {
    const [yearStr, weekStr] = currentWeek.split("-W");
    let year = Number(yearStr);
    let week = Number(weekStr) + delta;
    if (week < 1) {
      year--;
      week = 52;
    } else if (week > 52) {
      year++;
      week = 1;
    }
    setCurrentWeek(`${year}-W${String(week).padStart(2, "0")}`);
  }

  // Open modal for new duty assignment
  function openAdd(thu: string = "Thứ 2") {
    setEditingItem(null);
    setSelectedThu(thu);
    setSelectedStudentId("");
    setModalOpen(true);
  }

  // Open modal for editing existing duty assignment
  function openEdit(thu: string, item: DutyItem) {
    setEditingItem(item);
    setSelectedThu(thu);
    setSelectedStudentId(item.studentId);
    setModalOpen(true);
  }

  // Save or Update Entry
  async function handleSaveEntry() {
    if (!selectedStudentId) {
      showToast("Vui lòng chọn học sinh", "error");
      return;
    }
    setSaving(true);
    const thuOrder = THU_ORDER[selectedThu] || 2;

    if (editingItem) {
      // Update
      const res = await fetch("/api/duty", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          thu: selectedThu,
          studentId: selectedStudentId,
        }),
      });
      if (res.ok) {
        showToast("Đã cập nhật phân công trực nhật");
        setModalOpen(false);
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Lỗi cập nhật", "error");
      }
    } else {
      // Create
      const res = await fetch("/api/duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuan: currentWeek,
          thu: selectedThu,
          thuOrder,
          studentId: selectedStudentId,
        }),
      });

      if (res.ok) {
        showToast("Đã phân công trực nhật");
        setModalOpen(false);
        setSelectedStudentId("");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Lỗi phân công", "error");
      }
    }
    setSaving(false);
  }

  // Delete Single Duty Entry
  async function handleDeleteEntry(id: number, name: string) {
    if (!confirm(`Bạn có chắc muốn xóa phân công của học sinh "${name}"?`)) return;
    const res = await fetch(`/api/duty?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Đã xóa phân công");
      loadData();
    } else {
      showToast("Lỗi khi xóa", "error");
    }
  }

  // Clear / Reset All Duty in Current Week
  async function handleClearAllWeek() {
    const targetLop = isSuperAdmin ? (filterLop !== "ALL" ? filterLop : "11AT3") : assignedLop;
    if (!confirm(`Bạn có chắc muốn XÓA TOÀN BỘ lịch trực nhật của Tuần ${currentWeek} (Lớp ${targetLop}) để thiết lập lại từ đầu?`)) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/duty?week=${currentWeek}&lop=${targetLop}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Đã xóa sạch toàn bộ ${data.count || 0} lượt trực nhật của Tuần ${currentWeek}!`);
        loadData();
      } else {
        showToast("Lỗi khi xóa lịch tuần", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra", "error");
    } finally {
      setSaving(false);
    }
  }

  // Handle Auto Assign / Generate Duty Roster
  async function handleAutoAssign() {
    const targetLop = isSuperAdmin ? (filterLop !== "ALL" ? filterLop : "11AT3") : assignedLop;
    setSaving(true);
    try {
      const res = await fetch("/api/duty/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuan: currentWeek,
          lop: targetLop,
          mode: autoMode,
          toNum: autoMode === "to" ? selectedToNum : undefined,
          clearPrevious,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Đã tự động xếp thành công ${data.count} lượt trực nhật cho Tuần ${currentWeek}!`);
        setAutoModalOpen(false);
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Lỗi tự động xếp lịch", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra", "error");
    } finally {
      setSaving(false);
    }
  }

  const totalAssignedThisWeek = entries.reduce((acc, curr) => acc + curr.items.length, 0);

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
            Lịch trực nhật — Lớp {currentDisplayClass}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Phân công vệ sinh lớp học ({totalAssignedThisWeek} lượt trong tuần), hỗ trợ thiết lập lại và xếp lịch tự động
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {totalAssignedThisWeek > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleClearAllWeek}
              disabled={saving}
              style={{ color: "var(--danger)", borderColor: "var(--danger-border)" }}
              title="Xóa hết toàn bộ lịch của tuần này để tạo lại"
            >
              <RotateCcw size={14} /> Xóa sạch lịch tuần này
            </button>
          )}

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setAutoModalOpen(true)}
            style={{ background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(260,80%,58%) 100%)" }}
          >
            <Sparkles size={14} /> Thiết lập lại / Tự động xếp lịch
          </button>

          <button className="btn btn-secondary btn-sm" onClick={() => openAdd("Thứ 2")}>
            <Plus size={14} /> Thêm thủ công
          </button>
        </div>
      </div>

      {/* Controls: Week Navigator + Class Filter + Quick Tổ Assign */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => changeWeek(-1)}>
            <ChevronLeft size={16} /> Tuần trước
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "1.05rem" }}>
            <CalendarIcon size={18} color="var(--primary)" />
            Tuần: <span style={{ color: "var(--primary)" }}>{currentWeek}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => changeWeek(1)}>
            Tuần sau <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Class Filter for SuperAdmin */}
          {isSuperAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <select
                className="select"
                style={{ minHeight: 34, padding: "4px 28px 4px 10px", fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)" }}
                value={filterLop}
                onChange={(e) => setFilterLop(e.target.value)}
              >
                <option value="ALL">🏫 Tất cả các lớp</option>
                {classList.map(c => (
                  <option key={c} value={c}>Lớp {c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Assign by Tổ */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Sparkles size={13} color="var(--warning)" /> Xếp nhanh theo:
            </span>
            {[1, 2, 3, 4].map(to => (
              <button
                key={to}
                className="btn btn-secondary btn-sm"
                style={{ padding: "4px 9px", fontSize: "0.75rem", fontWeight: 700 }}
                onClick={() => {
                  setSelectedToNum(to);
                  setAutoMode("to");
                  setClearPrevious(true);
                  setAutoModalOpen(true);
                }}
                disabled={saving}
              >
                Tổ {to}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Schedule Grid with Edit and Delete */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
        {THU_NAMES.map((thu, i) => {
          const dayGroup = entries.find(e => e.thu === thu);
          const items = dayGroup?.items || [];

          return (
            <div key={thu} className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  padding: "12px 14px",
                  background: i === 0 ? "var(--primary-light)" : "var(--bg-muted)",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: i === 0 ? "var(--primary)" : "var(--text-primary)" }}>
                    {thu}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    ({items.length} HS)
                  </span>
                </div>
                <button
                  onClick={() => openAdd(thu)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--primary)", padding: 4, display: "flex", alignItems: "center",
                  }}
                  title="Thêm học sinh trực"
                >
                  <Plus size={15} />
                </button>
              </div>

              <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {loading ? (
                  <div className="skeleton" style={{ height: 60 }} />
                ) : items.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                    Chưa phân công
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "8px 10px",
                        background: "var(--bg-page)",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          Lớp {item.lop} • Tổ {item.to}
                        </div>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <button
                          onClick={() => openEdit(thu, item)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            padding: "4px", borderRadius: 4, color: "var(--primary)",
                          }}
                          title="Chỉnh sửa / Đổi học sinh"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(item.id, item.name)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            padding: "4px", borderRadius: 4, color: "var(--danger)",
                          }}
                          title="Xóa phân công"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ====== MODAL THIẾT LẬP LẠI / TỰ ĐỘNG XẾP LỊCH TRỰC NHẬT ====== */}
      {autoModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={() => setAutoModalOpen(false)} />
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "white", borderRadius: 14, boxShadow: "var(--shadow-lg)", padding: "28px",
            width: "100%", maxWidth: 460, animation: "fadeIn 0.2s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                  <Sparkles size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Tự động thiết lập lịch trực nhật</h3>
              </div>
              <button onClick={() => setAutoModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={18} color="var(--text-muted)" />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 18 }}>
              Áp dụng cho <strong>Tuần {currentWeek}</strong> — Lớp <strong>{currentDisplayClass}</strong>.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Chọn hình thức phân công *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setAutoMode("to")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: autoMode === "to" ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: autoMode === "to" ? "var(--primary-light)" : "white",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      color: autoMode === "to" ? "var(--primary)" : "var(--text-primary)",
                      textAlign: "center",
                    }}
                  >
                    Phân công theo Tổ
                  </button>

                  <button
                    type="button"
                    onClick={() => setAutoMode("all_class")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: autoMode === "all_class" ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: autoMode === "all_class" ? "var(--primary-light)" : "white",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      color: autoMode === "all_class" ? "var(--primary)" : "var(--text-primary)",
                      textAlign: "center",
                    }}
                  >
                    Chia đều cả lớp
                  </button>
                </div>
              </div>

              {autoMode === "to" && (
                <div>
                  <label className="label">Chọn Tổ trực nhật trong tuần này *</label>
                  <select
                    className="select"
                    value={selectedToNum}
                    onChange={(e) => setSelectedToNum(Number(e.target.value))}
                  >
                    <option value={1}>Tổ 1 (Chia đều Thứ 2 $\rightarrow$ Thứ 6)</option>
                    <option value={2}>Tổ 2 (Chia đều Thứ 2 $\rightarrow$ Thứ 6)</option>
                    <option value={3}>Tổ 3 (Chia đều Thứ 2 $\rightarrow$ Thứ 6)</option>
                    <option value={4}>Tổ 4 (Chia đều Thứ 2 $\rightarrow$ Thứ 6)</option>
                  </select>
                </div>
              )}

              <div style={{ background: "var(--bg-muted)", padding: "12px 14px", borderRadius: 8, marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={clearPrevious}
                    onChange={(e) => setClearPrevious(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
                  />
                  <span>Xóa sạch lịch cũ của tuần này trước khi tạo mới</span>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAutoModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleAutoAssign} disabled={saving}>
                {saving ? "Đang xử lý..." : <><Sparkles size={14} /> Khởi tạo lịch tuần</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== ADD / EDIT SINGLE ENTRY MODAL ====== */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={() => setModalOpen(false)} />
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "white", borderRadius: 14, boxShadow: "var(--shadow-lg)", padding: "28px",
            width: "100%", maxWidth: 440, animation: "fadeIn 0.2s ease",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
                {editingItem ? "Chỉnh sửa phân công trực nhật" : "Thêm phân công trực nhật"}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={18} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Thứ trong tuần *</label>
                <select
                  className="select"
                  value={selectedThu}
                  onChange={(e) => setSelectedThu(e.target.value)}
                >
                  {THU_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Chọn học sinh *</label>
                <select
                  className="select"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                >
                  <option value="">-- Chọn học sinh --</option>
                  {classList.map(c => {
                    const classStudents = students.filter(s => s.lop === c);
                    if (classStudents.length === 0) return null;
                    return (
                      <optgroup key={c} label={`Lớp ${c}`}>
                        {[1, 2, 3, 4].map(to => {
                          const toStudents = classStudents.filter(s => s.to === to);
                          if (toStudents.length === 0) return null;
                          return (
                            <React.Fragment key={to}>
                              {toStudents.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.hoTen} (Tổ {s.to})
                                </option>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveEntry} disabled={saving}>
                {saving ? "Đang lưu..." : <><Save size={14} /> {editingItem ? "Cập nhật" : "Lưu phân công"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
