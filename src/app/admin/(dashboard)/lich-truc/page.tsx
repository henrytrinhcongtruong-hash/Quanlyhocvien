"use client";
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar as CalendarIcon, Plus, Trash2, Edit2, Users, ChevronLeft,
  ChevronRight, CheckCircle, AlertCircle, Save, X, Sparkles, RotateCcw,
  Search, Shield, Check, UserCheck,
} from "lucide-react";
import { getCurrentISOWeek, THU_NAMES, THU_ORDER } from "@/lib/format";
import { isStudentDutyExempt, calculateDutyDistribution } from "@/lib/dutyRules";

function normalizeVN(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

interface Student {
  id: number;
  hoTen: string;
  tenGoi: string | null;
  to: number;
  lop: string;
  ghiChu?: string | null;
  gioiTinh?: string | null;
}

interface DutyItem {
  id: number;
  studentId: number;
  name: string;
  to: number;
  lop: string;
  ghiChu?: string | null;
  gioiTinh?: string | null;
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
  const [cumulativeDutyCounts, setCumulativeDutyCounts] = useState<Record<number, number>>({});
  const [priorDutyCounts, setPriorDutyCounts] = useState<Record<number, number>>({});
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
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [selectedToFilter, setSelectedToFilter] = useState<number | "ALL">("ALL");

  // Modal State (Auto Assign / Reset Modal)
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [autoMode, setAutoMode] = useState<"to" | "all_class">("to");
  const [selectedToNum, setSelectedToNum] = useState<number>(1);
  const [clearPrevious, setClearPrevious] = useState<boolean>(true);
  const [slotsPerDay, setSlotsPerDay] = useState<number>(4);
  const [activeMobileTab, setActiveMobileTab] = useState<string>("Thứ 2");
  const [saving, setSaving] = useState(false);

  // Modal State (Phân học sinh trực cả tuần - Tùy chọn số lượng)
  const [weekDutyModalOpen, setWeekDutyModalOpen] = useState(false);
  const [weekDutyStudentIds, setWeekDutyStudentIds] = useState<number[]>([]);
  const [weekDutySearch, setWeekDutySearch] = useState("");
  const [weekDutyToFilter, setWeekDutyToFilter] = useState<number | "ALL">("ALL");
  const [clearPreviousWeekDuty, setClearPreviousWeekDuty] = useState<boolean>(true);
  const [weekDutySaving, setWeekDutySaving] = useState(false);

  // Selected student object & filtered list for Modal
  const selectedStudentObj = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const filteredModalStudents = useMemo(() => {
    let list = students;
    if (selectedToFilter !== "ALL") {
      list = list.filter((s) => s.to === selectedToFilter);
    }
    if (!studentSearchQuery.trim()) return list;
    const q = normalizeVN(studentSearchQuery);
    return list.filter((s) => {
      const nameNorm = normalizeVN(s.hoTen);
      const nickNorm = s.tenGoi ? normalizeVN(s.tenGoi) : "";
      const toStr = `to ${s.to}`;
      const lopStr = `lop ${s.lop.toLowerCase()}`;
      return nameNorm.includes(q) || nickNorm.includes(q) || toStr.includes(q) || lopStr.includes(q);
    });
  }, [students, studentSearchQuery, selectedToFilter]);

  // Filtered students for Week Duty Modal
  const filteredWeekDutyStudents = useMemo(() => {
    let list = students;
    if (weekDutyToFilter !== "ALL") {
      list = list.filter((s) => s.to === weekDutyToFilter);
    }
    if (!weekDutySearch.trim()) return list;
    const q = normalizeVN(weekDutySearch);
    return list.filter((s) => {
      const nameNorm = normalizeVN(s.hoTen);
      const nickNorm = s.tenGoi ? normalizeVN(s.tenGoi) : "";
      const toStr = `to ${s.to}`;
      return nameNorm.includes(q) || nickNorm.includes(q) || toStr.includes(q);
    });
  }, [students, weekDutySearch, weekDutyToFilter]);

  // Selected Student Objects for Week Duty
  const selectedWeekDutyStudents = useMemo(() => {
    return students.filter((s) => weekDutyStudentIds.includes(s.id));
  }, [students, weekDutyStudentIds]);

  // Học sinh của Tổ hoặc Cả lớp cho modal tự động xếp lịch
  const currentToStudents = useMemo(() => {
    if (autoMode === "to") {
      return students.filter((s) => s.to === selectedToNum);
    }
    return students;
  }, [students, autoMode, selectedToNum]);

  // Tính toán kế hoạch phân bổ trực nhật tự động (cho preview)
  const autoPreviewPlan = useMemo(() => {
    return calculateDutyDistribution(currentToStudents, undefined, slotsPerDay, priorDutyCounts);
  }, [currentToStudents, slotsPerDay, priorDutyCounts]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

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

  // Load classes, students, duties in parallel
  const loadData = async () => {
    setLoading(true);
    try {
      const activeClass = isSuperAdmin ? filterLop : assignedLop;
      const lopQuery = activeClass !== "ALL" ? `&lop=${activeClass}` : "";
      const [stdRes, dutyRes, classRes] = await Promise.all([
        fetch(`/api/students${activeClass !== "ALL" ? `?lop=${activeClass}` : ""}`),
        fetch(`/api/duty?week=${currentWeek}${lopQuery}`),
        fetch("/api/classes"),
      ]);
      const [stdData, dutyData, classData] = await Promise.all([
        stdRes.json(), dutyRes.json(), classRes.json(),
      ]);

      setStudents(stdData.data || []);
      setEntries(dutyData.entries || []);
      setCumulativeDutyCounts(dutyData.cumulativeDutyCounts || {});
      setPriorDutyCounts(dutyData.priorDutyCounts || {});
      if (classData.data && classData.data.length > 0) setClassList(classData.data);
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
    setStudentSearchQuery("");
    setSelectedToFilter("ALL");
    setModalOpen(true);
  }

  // Open modal for editing existing duty assignment
  function openEdit(thu: string, item: DutyItem) {
    setEditingItem(item);
    setSelectedThu(thu);
    setSelectedStudentId(item.studentId);
    setStudentSearchQuery("");
    setSelectedToFilter("ALL");
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
          slotsPerDay,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assigned = data.assignedCount || data.count;
        const exemptCount = data.exemptedCount || 0;
        showToast(
          `Đã xếp lịch thành công cho ${assigned} bạn (${data.count} lượt, 4 bạn/ngày) kèm bù ca công bằng!${
            exemptCount > 0 ? ` (Đã miễn trực cho ${exemptCount} cán sự & Trịnh Công Trường)` : ""
          }`
        );
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

  // Toggle select student for Week Duty Modal
  function toggleWeekDutyStudent(studentId: number) {
    setWeekDutyStudentIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  }

  // Handle Save Week Duty (Phân học sinh trực cả tuần với số lượng tùy chọn)
  async function handleSaveWeekDuty() {
    if (weekDutyStudentIds.length === 0) {
      showToast("Vui lòng chọn ít nhất 1 học sinh trực nhật", "error");
      return;
    }
    setWeekDutySaving(true);
    const activeClass = isSuperAdmin ? filterLop : assignedLop;
    try {
      const res = await fetch("/api/duty/week-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuan: currentWeek,
          studentIds: weekDutyStudentIds,
          lop: activeClass,
          clearPrevious: clearPreviousWeekDuty,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || `Đã phân công ${weekDutyStudentIds.length} bạn trực cả tuần thành công!`);
        setWeekDutyModalOpen(false);
        setWeekDutyStudentIds([]);
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Lỗi phân công", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra khi phân công", "error");
    } finally {
      setWeekDutySaving(false);
    }
  }

  const totalAssignedThisWeek = entries.reduce((acc, curr) => acc + curr.items.length, 0);

  const toColors: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    2: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
    3: { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
    4: { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
  };

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
            <Sparkles size={14} /> Tự động xếp lịch (Tổ)
          </button>

          <button
            className="btn btn-sm"
            onClick={() => {
              setWeekDutyStudentIds([]);
              setWeekDutySearch("");
              setWeekDutyToFilter("ALL");
              setClearPreviousWeekDuty(true);
              setWeekDutyModalOpen(true);
            }}
            style={{
              background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              color: "white",
              border: "none",
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Users size={14} /> Phân công trực cả tuần
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
                  setSlotsPerDay(4);
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

      {/* Mobile Tab Bar (only visible on mobile) */}
      <div className="mobile-day-tabs hide-on-desktop">
        {THU_NAMES.map(thu => (
          <button
            key={thu}
            className={`mobile-tab-btn ${activeMobileTab === thu ? "active" : ""}`}
            onClick={() => setActiveMobileTab(thu)}
          >
            {thu}
          </button>
        ))}
      </div>

      {/* Weekly Schedule Grid with Edit and Delete */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
        {THU_NAMES.map((thu, i) => {
          const dayGroup = entries.find(e => e.thu === thu);
          const items = dayGroup?.items || [];

          return (
            <div key={thu} className={`card ${activeMobileTab !== thu ? "hide-on-mobile" : ""}`} style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
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
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span>Lớp {item.lop} • Tổ {item.to}</span>
                          {cumulativeDutyCounts[item.studentId] !== undefined && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "1px 6px",
                                borderRadius: 8,
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                background: "var(--bg-muted)",
                                color: "var(--text-secondary)",
                              }}
                              title={`Tổng số ca trực từ trước đến nay: ${cumulativeDutyCounts[item.studentId]} ca`}
                            >
                              {cumulativeDutyCounts[item.studentId]} ca
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => openEdit(thu, item)}
                          style={{
                            background: "var(--primary-light)", border: "none", cursor: "pointer",
                            padding: "8px", borderRadius: 8, color: "var(--primary)",
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}
                          title="Chỉnh sửa / Đổi học sinh"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(item.id, item.name)}
                          style={{
                            background: "var(--danger-light)", border: "none", cursor: "pointer",
                            padding: "8px", borderRadius: 8, color: "var(--danger)",
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}
                          title="Xóa phân công"
                        >
                          <Trash2 size={14} />
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
      {autoModalOpen && typeof document !== "undefined" && createPortal(
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
          onClick={() => setAutoModalOpen(false)}
        >
          <div
            className="mobile-bottom-sheet"
            style={{
              position: "relative",
              background: "white",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
              padding: "24px 26px",
              width: "100%",
              maxWidth: 480,
              maxHeight: "calc(100vh - 40px)",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--border)",
              animation: "slideUp 0.18s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                  <Sparkles size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>Tự động xếp lịch trực nhật</h3>
              </div>
              <button onClick={() => setAutoModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4, display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                Áp dụng cho <strong>Tuần {currentWeek}</strong> — Lớp <strong>{currentDisplayClass}</strong>.
              </p>

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
                    <option value={1}>Tổ 1 (Chia đều Thứ 2 → Thứ 6)</option>
                    <option value={2}>Tổ 2 (Chia đều Thứ 2 → Thứ 6)</option>
                    <option value={3}>Tổ 3 (Chia đều Thứ 2 → Thứ 6)</option>
                    <option value={4}>Tổ 4 (Chia đều Thứ 2 → Thứ 6)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="label">Số học sinh trực mỗi ngày *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setSlotsPerDay(4)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: slotsPerDay === 4 ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: slotsPerDay === 4 ? "var(--primary-light)" : "white",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      color: slotsPerDay === 4 ? "var(--primary)" : "var(--text-primary)",
                      textAlign: "center",
                    }}
                  >
                    ✨ Cố định 4 bạn / ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotsPerDay(3)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: slotsPerDay === 3 ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: slotsPerDay === 3 ? "var(--primary-light)" : "white",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      color: slotsPerDay === 3 ? "var(--primary)" : "var(--text-primary)",
                      textAlign: "center",
                    }}
                  >
                    Cố định 3 bạn / ngày
                  </button>
                </div>
              </div>

              {/* Preview kế hoạch phân bổ trực nhật */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: "0.82rem",
                }}
              >
                <div style={{ fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
                  📋 Kế hoạch xếp lịch dự kiến:
                </div>
                <div style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  • Tổng học sinh khả dụng: <strong>{autoPreviewPlan.eligibleStudents.length} bạn</strong>
                  {autoPreviewPlan.exemptedStudents.length > 0 && (
                    <span style={{ color: "var(--danger)" }}> (Đã tự động miễn trực cho {autoPreviewPlan.exemptedStudents.length} cán sự)</span>
                  )}
                  <br />
                  • Cố định: <strong>{slotsPerDay} bạn / ngày</strong> (Tổng cộng {slotsPerDay * 5} lượt/tuần).
                  <br />
                  • Cơ chế: Phân công công bằng, ưu tiên học sinh có ít ca trực nhất trước đó.
                </div>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={clearPrevious}
                    onChange={(e) => setClearPrevious(e.target.checked)}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span>Xóa toàn bộ lịch cũ của tuần này trước khi phân bổ</span>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAutoModalOpen(false)}>
                Hủy
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.5, background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(260,80%,58%) 100%)" }}
                onClick={handleAutoAssign}
                disabled={saving}
              >
                {saving ? "Đang xếp lịch..." : <><Sparkles size={15} /> Bắt đầu xếp lịch</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ====== MODAL THÊM / SỬA THỦ CÔNG 1 LƯỢT TRỰC ====== */}
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
            className="mobile-bottom-sheet"
            style={{
              position: "relative",
              background: "white",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
              padding: "24px 26px",
              width: "100%",
              maxWidth: 480,
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
                {editingItem ? "Đổi học sinh trực nhật" : "Phân công học sinh trực"}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Thứ trong tuần *</label>
                <select className="select" value={selectedThu} onChange={(e) => setSelectedThu(e.target.value)}>
                  {THU_NAMES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Chọn học sinh *</label>

                {/* Ô tìm kiếm học sinh */}
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="input"
                    placeholder="Tìm tên học sinh..."
                    style={{ paddingLeft: 30 }}
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                  />
                  {studentSearchQuery && (
                    <button
                      onClick={() => setStudentSearchQuery("")}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: 2,
                      }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Bộ lọc nhanh theo Tổ */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  {(["ALL", 1, 2, 3, 4] as const).map((toVal) => (
                    <button
                      key={toVal}
                      type="button"
                      onClick={() => setSelectedToFilter(toVal)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        border: selectedToFilter === toVal ? "1px solid var(--primary)" : "1px solid var(--border)",
                        background: selectedToFilter === toVal ? "var(--primary)" : "var(--bg-muted)",
                        color: selectedToFilter === toVal ? "#ffffff" : "var(--text-secondary)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {toVal === "ALL" ? "Tất cả tổ" : `Tổ ${toVal}`}
                    </button>
                  ))}
                </div>

                {/* Danh sách học sinh */}
                <div
                  style={{
                    maxHeight: 200,
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 6,
                    background: "white",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {filteredModalStudents.length === 0 ? (
                    <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      Không tìm thấy học sinh nào khớp với &ldquo;{studentSearchQuery}&rdquo;
                    </div>
                  ) : (
                    filteredModalStudents.map((s) => {
                      const isSelected = selectedStudentId === s.id;
                      const exemptInfo = isStudentDutyExempt(s);
                      const toStyle = toColors[s.to] || toColors[1];

                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedStudentId(s.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: 8,
                            cursor: "pointer",
                            background: isSelected ? "var(--primary-light)" : "transparent",
                            border: isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "var(--bg-muted)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                background: toStyle.bg,
                                color: toStyle.text,
                                border: `1px solid ${toStyle.border}`,
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: "0.72rem",
                                fontWeight: 800,
                              }}
                            >
                              Tổ {s.to}
                            </span>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: isSelected ? 800 : 600, fontSize: "0.88rem", color: isSelected ? "var(--primary)" : "var(--text-primary)" }}>
                                  {s.hoTen}
                                </span>
                                {exemptInfo.exempt && (
                                  <span
                                    style={{
                                      background: "#fee2e2",
                                      color: "#991b1b",
                                      border: "1px solid #fecaca",
                                      fontSize: "0.68rem",
                                      fontWeight: 700,
                                      padding: "1px 6px",
                                      borderRadius: 10,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                    }}
                                  >
                                    <Shield size={10} /> {exemptInfo.reason?.replace(" (Miễn trực)", "").replace(" (Miễn trực nhật)", "") || "Miễn trực"}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                Lớp {s.lop} {s.tenGoi ? `• Tên gọi: ${s.tenGoi}` : ""}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: "var(--primary)",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <CheckCircle size={14} />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedStudentObj && isStudentDutyExempt(selectedStudentObj).exempt && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "#fff1f2",
                      border: "1px solid #fecdd3",
                      borderRadius: 8,
                      color: "#9f1239",
                      fontSize: "0.78rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Shield size={15} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Lưu ý:</strong> {selectedStudentObj.hoTen} thuộc diện <em>miễn trực nhật</em> ({isStudentDutyExempt(selectedStudentObj).reason}). Bạn vẫn có thể phân công thủ công nếu có sự thống nhất riêng.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1.6 }} onClick={handleSaveEntry} disabled={saving}>
                {saving ? "Đang lưu..." : <><Save size={15} /> {editingItem ? "Cập nhật" : "Lưu phân công"}</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ====== MODAL PHÂN CÔNG TRỰC CẢ TUẦN (TÙY CHỌN SỐ LƯỢNG) ====== */}
      {weekDutyModalOpen && typeof document !== "undefined" && createPortal(
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
          onClick={() => setWeekDutyModalOpen(false)}
        >
          <div
            className="mobile-bottom-sheet"
            style={{
              position: "relative",
              background: "white",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
              padding: "24px 26px",
              width: "100%",
              maxWidth: 580,
              maxHeight: "calc(100vh - 40px)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexShrink: 0 }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ecfdf5", color: "#065f46", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, marginBottom: 6 }}>
                  <Users size={13} /> PHÂN CÔNG TRỰC CẢ TUẦN
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                  Phân Học Sinh Trực Cả Tuần (Thứ 2 → Thứ 6)
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Áp dụng cho <strong>Tuần {currentWeek}</strong> — Lớp {currentDisplayClass}
                </p>
              </div>
              <button
                onClick={() => setWeekDutyModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Clear previous checkbox */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  padding: "8px 12px",
                  background: "var(--bg-muted)",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={clearPreviousWeekDuty}
                  onChange={(e) => setClearPreviousWeekDuty(e.target.checked)}
                  style={{ accentColor: "var(--primary)" }}
                />
                <span>Dọn dẹp/xóa lịch cũ của tuần này trước khi phân công</span>
              </label>

              {/* Selected Students Badges Area */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: weekDutyStudentIds.length > 0 ? "#f0fdf4" : "#f8fafc",
                  border: weekDutyStudentIds.length > 0 ? "1.5px solid #bbf7d0" : "1px solid var(--border)",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: "0.84rem", fontWeight: 800, color: weekDutyStudentIds.length > 0 ? "#166534" : "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <UserCheck size={16} color={weekDutyStudentIds.length > 0 ? "#16a34a" : "var(--text-muted)"} />
                    <span>Đã chọn: <strong>{weekDutyStudentIds.length} học sinh</strong> trực cả tuần</span>
                  </div>
                  {weekDutyStudentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setWeekDutyStudentIds([])}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--danger)",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>

                {weekDutyStudentIds.length > 0 ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selectedWeekDutyStudents.map((s) => (
                      <span
                        key={s.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "white",
                          border: "1px solid #86efac",
                          color: "#166534",
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                        }}
                      >
                        <span>{s.hoTen} (Tổ {s.to})</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWeekDutyStudent(s.id);
                          }}
                          style={{
                            background: "#fee2e2",
                            border: "none",
                            borderRadius: "50%",
                            width: 16,
                            height: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#dc2626",
                            padding: 0,
                          }}
                          title="Bỏ chọn bạn này"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                    Chưa chọn học sinh nào. Bạn có thể chọn 1, 2, 3... hoặc bất kỳ số lượng bạn nào ở danh sách bên dưới.
                  </div>
                )}
              </div>

              {/* Search & Filter Bar */}
              <div>
                <label className="label" style={{ marginBottom: 6 }}>
                  Chọn học sinh từ danh sách:
                </label>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="input"
                    placeholder="Tìm tên học sinh cần phân trực..."
                    style={{ paddingLeft: 30, minHeight: 34, fontSize: "0.82rem" }}
                    value={weekDutySearch}
                    onChange={(e) => setWeekDutySearch(e.target.value)}
                  />
                  {weekDutySearch && (
                    <button
                      onClick={() => setWeekDutySearch("")}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: 2,
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Tổ filter chips */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  {(["ALL", 1, 2, 3, 4] as const).map((toVal) => (
                    <button
                      key={toVal}
                      type="button"
                      onClick={() => setWeekDutyToFilter(toVal)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        border: weekDutyToFilter === toVal ? "1px solid var(--primary)" : "1px solid var(--border)",
                        background: weekDutyToFilter === toVal ? "var(--primary)" : "var(--bg-muted)",
                        color: weekDutyToFilter === toVal ? "white" : "var(--text-secondary)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {toVal === "ALL" ? "Tất cả tổ" : `Tổ ${toVal}`}
                    </button>
                  ))}
                </div>

                {/* Students List with Multi-Select */}
                <div
                  style={{
                    maxHeight: 220,
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 6,
                    background: "white",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {filteredWeekDutyStudents.length === 0 ? (
                    <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      Không tìm thấy học sinh nào khớp với &ldquo;{weekDutySearch}&rdquo;
                    </div>
                  ) : (
                    filteredWeekDutyStudents.map((s) => {
                      const isSelected = weekDutyStudentIds.includes(s.id);
                      const exemptInfo = isStudentDutyExempt(s);
                      const toStyle = toColors[s.to] || toColors[1];

                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleWeekDutyStudent(s.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: 8,
                            cursor: "pointer",
                            background: isSelected ? "#ecfdf5" : "transparent",
                            border: isSelected ? "1px solid #6ee7b7" : "1px solid transparent",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "var(--bg-muted)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {/* Checkbox */}
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 6,
                                border: isSelected ? "2px solid #059669" : "2px solid #cbd5e1",
                                background: isSelected ? "#059669" : "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                flexShrink: 0,
                                transition: "all 0.15s ease",
                              }}
                            >
                              {isSelected && <Check size={13} strokeWidth={3} />}
                            </div>

                            <span
                              style={{
                                background: toStyle.bg,
                                color: toStyle.text,
                                border: `1px solid ${toStyle.border}`,
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: "0.72rem",
                                fontWeight: 800,
                              }}
                            >
                              Tổ {s.to}
                            </span>

                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: isSelected ? 800 : 600, fontSize: "0.88rem", color: isSelected ? "#065f46" : "var(--text-primary)" }}>
                                  {s.hoTen}
                                </span>
                                {exemptInfo.exempt && (
                                  <span
                                    style={{
                                      background: "#fee2e2",
                                      color: "#991b1b",
                                      border: "1px solid #fecaca",
                                      fontSize: "0.68rem",
                                      fontWeight: 700,
                                      padding: "1px 6px",
                                      borderRadius: 10,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                    }}
                                  >
                                    <Shield size={10} /> {exemptInfo.reason?.replace(" (Miễn trực)", "").replace(" (Miễn trực nhật)", "") || "Miễn trực"}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                Lớp {s.lop} {s.tenGoi ? `• Tên gọi: ${s.tenGoi}` : ""}
                              </div>
                            </div>
                          </div>

                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isSelected ? "#059669" : "var(--text-muted)" }}>
                            {isSelected ? "Đã chọn" : "Chọn"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, paddingTop: 14, marginTop: 14, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setWeekDutyModalOpen(false)}>
                Hủy
              </button>
              <button
                className="btn btn-primary"
                style={{
                  flex: 1.8,
                  background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                  border: "none",
                }}
                onClick={handleSaveWeekDuty}
                disabled={weekDutySaving || weekDutyStudentIds.length === 0}
              >
                {weekDutySaving ? "Đang phân công..." : (
                  <>
                    <Users size={15} /> Xác nhận phân trực cả tuần {weekDutyStudentIds.length > 0 ? `(${weekDutyStudentIds.length} bạn)` : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
