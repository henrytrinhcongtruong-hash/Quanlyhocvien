"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutGrid,
  Move,
  Upload,
  User,
  Plus,
  Trash2,
  Save,
  Printer,
  RotateCw,
  ArrowLeftRight,
  Shuffle,
  Calendar,
  Sparkles,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  Settings,
  Search,
  School,
  Maximize2,
} from "lucide-react";
import { SeatSlotData } from "@/app/api/seating/route";

interface StudentOption {
  id: number;
  hoTen: string;
  tenGoi: string | null;
  gioiTinh: string;
  avatar: string | null;
  to: number;
}

export default function AdminSoDoLopPage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const { data: session } = useSession();

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";

  const [selectedLop, setSelectedLop] = useState(() => {
    if (!isSuperAdmin && assignedLop) return assignedLop;
    return urlLop || "12T2";
  });

  const [classList, setClassList] = useState<string[]>(["12T2", "11AT3"]);
  const [selectedMonth, setSelectedMonth] = useState("Tháng 09/2025");
  const [monthList, setMonthList] = useState<string[]>(["Tháng 09/2025", "Tháng 10/2025"]);

  // Chart data
  const [chartId, setChartId] = useState<number | null>(null);
  const [title, setTitle] = useState("CLASSROOM SEATING CHART");
  const [gvcn, setGvcn] = useState("Phí Huỳnh Anh Hào");
  const [slogan, setSlogan] = useState("Kỷ Cương - Trách Nhiệm - Hiệu Quả - Phát Triển");
  const [slots, setSlots] = useState<SeatSlotData[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Drag and Drop & Touch Swap state
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [selectedSlotForSwap, setSelectedSlotForSwap] = useState<string | null>(null);

  // Edit Slot Modal
  const [editSlotModal, setEditSlotModal] = useState<SeatSlotData | null>(null);
  const [slotForm, setSlotForm] = useState<{
    studentId: number | null;
    studentName: string;
    studentPhoto: string | null;
  }>({
    studentId: null,
    studentName: "",
    studentPhoto: null,
  });

  // Settings Modal (Title, GVCN, Slogan)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    title: "",
    gvcn: "",
    slogan: "",
  });

  // New Month Modal
  const [newMonthModalOpen, setNewMonthModalOpen] = useState(false);
  const [newMonthName, setNewMonthName] = useState("");

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Load Classes
  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && d.data.length > 0) setClassList(d.data);
      })
      .catch(() => {});
  }, []);

  // Load Months
  useEffect(() => {
    fetch(`/api/seating/months?lop=${selectedLop}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.months && d.months.length > 0) {
          setMonthList(d.months);
          if (!d.months.includes(selectedMonth)) {
            setSelectedMonth(d.months[0]);
          }
        }
      })
      .catch(() => {});
  }, [selectedLop, selectedMonth]);

  // Load Chart
  const loadChart = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seating?lop=${selectedLop}&month=${encodeURIComponent(selectedMonth)}`);
      const data = await res.json();
      if (data.success && data.chart) {
        setChartId(data.chart.id);
        setTitle(data.chart.title || "CLASSROOM SEATING CHART");
        setGvcn(data.chart.gvcn || "Phí Huỳnh Anh Hào");
        setSlogan(data.chart.slogan || "Kỷ Cương - Trách Nhiệm - Hiệu Quả - Phát Triển");
        setSlots(data.chart.slots || []);
        setStudents(data.students || []);
      }
    } catch {
      showToast("Lỗi tải sơ đồ lớp học", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLop, selectedMonth]);

  // Save Chart
  async function handleSaveChart(customSlots?: SeatSlotData[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chartId,
          lop: selectedLop,
          month: selectedMonth,
          title,
          gvcn,
          slogan,
          slots: customSlots || slots,
        }),
      });

      if (res.ok) {
        showToast("Đã lưu sơ đồ lớp học thành công");
      } else {
        showToast("Lỗi khi lưu sơ đồ", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setSaving(false);
    }
  }

  // Swap / Move 2 Slots
  function swapSlots(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    setSlots((prev) => {
      const newSlots = [...prev];
      const srcIdx = newSlots.findIndex((s) => s.id === sourceId);
      const tgtIdx = newSlots.findIndex((s) => s.id === targetId);

      if (srcIdx === -1 || tgtIdx === -1) return prev;

      // Swap student details
      const tempName = newSlots[srcIdx].studentName;
      const tempPhoto = newSlots[srcIdx].studentPhoto;
      const tempId = newSlots[srcIdx].studentId;
      const tempGender = newSlots[srcIdx].gender;

      newSlots[srcIdx] = {
        ...newSlots[srcIdx],
        studentName: newSlots[tgtIdx].studentName,
        studentPhoto: newSlots[tgtIdx].studentPhoto,
        studentId: newSlots[tgtIdx].studentId,
        gender: newSlots[tgtIdx].gender,
      };

      newSlots[tgtIdx] = {
        ...newSlots[tgtIdx],
        studentName: tempName,
        studentPhoto: tempPhoto,
        studentId: tempId,
        gender: tempGender,
      };

      // Auto save after swap
      handleSaveChart(newSlots);
      return newSlots;
    });

    showToast("Đã đổi chỗ 2 học sinh");
    setSelectedSlotForSwap(null);
    setDraggedSlotId(null);
    setDragOverSlotId(null);
  }

  // HTML5 Drag & Drop handlers
  function handleDragStart(e: React.DragEvent, slotId: string) {
    setDraggedSlotId(slotId);
    e.dataTransfer.setData("text/plain", slotId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, slotId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverSlotId !== slotId) {
      setDragOverSlotId(slotId);
    }
  }

  function handleDrop(e: React.DragEvent, targetSlotId: string) {
    e.preventDefault();
    const sourceSlotId = e.dataTransfer.getData("text/plain") || draggedSlotId;
    if (sourceSlotId && sourceSlotId !== targetSlotId) {
      swapSlots(sourceSlotId, targetSlotId);
    }
    setDraggedSlotId(null);
    setDragOverSlotId(null);
  }

  // Click-to-swap for mobile or easy one-tap
  function handleSlotClick(slot: SeatSlotData) {
    if (selectedSlotForSwap) {
      if (selectedSlotForSwap === slot.id) {
        setSelectedSlotForSwap(null);
      } else {
        swapSlots(selectedSlotForSwap, slot.id);
      }
    } else {
      openEditSlotModal(slot);
    }
  }

  // Edit Slot Modal
  function openEditSlotModal(slot: SeatSlotData) {
    setEditSlotModal(slot);
    setSlotForm({
      studentId: slot.studentId || null,
      studentName: slot.studentName || "",
      studentPhoto: slot.studentPhoto || null,
    });
  }

  function handleStudentSelect(stId: number) {
    if (stId === 0) {
      setSlotForm({ studentId: null, studentName: "", studentPhoto: null });
      return;
    }
    const st = students.find((s) => s.id === stId);
    if (st) {
      setSlotForm({
        studentId: st.id,
        studentName: st.hoTen.toUpperCase(),
        studentPhoto: st.avatar || null,
      });
    }
  }

  // Handle Photo Upload (Base64)
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSlotForm((f) => ({ ...f, studentPhoto: base64 }));
    };
    reader.readAsDataURL(file);
  }

  function handleSaveSlot() {
    if (!editSlotModal) return;

    setSlots((prev) => {
      const updated = prev.map((s) => {
        if (s.id === editSlotModal.id) {
          return {
            ...s,
            studentName: slotForm.studentName.trim() ? slotForm.studentName.trim().toUpperCase() : null,
            studentPhoto: slotForm.studentPhoto,
            studentId: slotForm.studentId,
          };
        }
        return s;
      });
      handleSaveChart(updated);
      return updated;
    });

    setEditSlotModal(null);
    showToast("Đã cập nhật vị trí học sinh");
  }

  function handleClearSlot() {
    if (!editSlotModal) return;
    setSlots((prev) => {
      const updated = prev.map((s) => {
        if (s.id === editSlotModal.id) {
          return { ...s, studentName: null, studentPhoto: null, studentId: null };
        }
        return s;
      });
      handleSaveChart(updated);
      return updated;
    });
    setEditSlotModal(null);
    showToast("Đã để trống vị trí");
  }

  // ====== ROTATION TOOLS ======
  // 1. Dời hàng (Hàng 1 -> Hàng 2 -> ... Hàng 7 -> Hàng 1)
  function handleRotateRows() {
    if (!confirm("Bạn có muốn xoay vòng các hàng ghế (Dời tiến 1 hàng) không?")) return;

    setSlots((prev) => {
      const newSlots = [...prev];
      // For left block
      for (let c = 1; c <= 4; c++) {
        const colSeats = [1, 2, 3, 4, 5, 6, 7].map((r) => newSlots.find((s) => s.row === r && s.col === c)!);
        const lastSeat = { ...colSeats[6] };
        for (let r = 6; r >= 1; r--) {
          const prevSeat = colSeats[r - 1];
          colSeats[r].studentName = prevSeat.studentName;
          colSeats[r].studentPhoto = prevSeat.studentPhoto;
          colSeats[r].studentId = prevSeat.studentId;
        }
        colSeats[0].studentName = lastSeat.studentName;
        colSeats[0].studentPhoto = lastSeat.studentPhoto;
        colSeats[0].studentId = lastSeat.studentId;
      }

      // For right block (rows 1-6 only, row 7 is teacher desk)
      for (let c = 5; c <= 8; c++) {
        const colSeats = [1, 2, 3, 4, 5, 6].map((r) => newSlots.find((s) => s.row === r && s.col === c)!);
        const lastSeat = { ...colSeats[5] };
        for (let r = 5; r >= 1; r--) {
          const prevSeat = colSeats[r - 1];
          colSeats[r].studentName = prevSeat.studentName;
          colSeats[r].studentPhoto = prevSeat.studentPhoto;
          colSeats[r].studentId = prevSeat.studentId;
        }
        colSeats[0].studentName = lastSeat.studentName;
        colSeats[0].studentPhoto = lastSeat.studentPhoto;
        colSeats[0].studentId = lastSeat.studentId;
      }

      handleSaveChart(newSlots);
      return newSlots;
    });

    showToast("Đã xoay vòng các hàng ghế thành công!");
  }

  // 2. Hoán đổi 2 dãy (Left Block <-> Right Block)
  function handleSwapBlocks() {
    if (!confirm("Bạn có muốn đổi chỗ giữa Dãy Trái và Dãy Phải không?")) return;

    setSlots((prev) => {
      const newSlots = [...prev];
      for (let r = 1; r <= 6; r++) {
        for (let i = 0; i < 4; i++) {
          const leftSeat = newSlots.find((s) => s.row === r && s.col === 1 + i);
          const rightSeat = newSlots.find((s) => s.row === r && s.col === 5 + i);

          if (leftSeat && rightSeat) {
            const tempName = leftSeat.studentName;
            const tempPhoto = leftSeat.studentPhoto;
            const tempId = leftSeat.studentId;

            leftSeat.studentName = rightSeat.studentName;
            leftSeat.studentPhoto = rightSeat.studentPhoto;
            leftSeat.studentId = rightSeat.studentId;

            rightSeat.studentName = tempName;
            rightSeat.studentPhoto = tempPhoto;
            rightSeat.studentId = tempId;
          }
        }
      }
      handleSaveChart(newSlots);
      return newSlots;
    });

    showToast("Đã hoán đổi vị trí 2 dãy bàn!");
  }

  // Create New Month
  async function handleCreateNewMonth() {
    if (!newMonthName.trim()) {
      showToast("Vui lòng nhập tên tháng", "error");
      return;
    }

    try {
      const res = await fetch("/api/seating/months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lop: selectedLop,
          newMonth: newMonthName.trim(),
          copyFromMonth: selectedMonth,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Đã tạo sơ đồ tháng mới");
        setMonthList((prev) => [newMonthName.trim(), ...prev]);
        setSelectedMonth(newMonthName.trim());
        setNewMonthModalOpen(false);
        setNewMonthName("");
      } else {
        showToast(data.error || "Lỗi tạo tháng mới", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    }
  }

  // Open Settings Modal
  function openSettings() {
    setSettingsForm({ title, gvcn, slogan });
    setSettingsModalOpen(true);
  }

  function handleSaveSettings() {
    setTitle(settingsForm.title.trim() || "CLASSROOM SEATING CHART");
    setGvcn(settingsForm.gvcn.trim() || "Phí Huỳnh Anh Hào");
    setSlogan(settingsForm.slogan.trim() || "Kỷ Cương - Trách Nhiệm - Hiệu Quả - Phát Triển");
    setSettingsModalOpen(false);
    showToast("Đã cập nhật thông tin sơ đồ");
    // trigger save
    setTimeout(() => handleSaveChart(), 100);
  }

  // Render Seat Card Component
  function renderSeatCard(slot: SeatSlotData) {
    const isTeacherDesk = slot.row === 7 && slot.col >= 5;
    const isSelected = selectedSlotForSwap === slot.id;
    const isDragOver = dragOverSlotId === slot.id;

    if (isTeacherDesk) {
      // Row 7, Col 5-8 is merged for Teacher's Desk
      if (slot.col === 5) {
        return (
          <div
            key="teacher-desk"
            style={{
              gridColumn: "span 4",
              background: "#ffffff",
              border: "3px solid #1e293b",
              borderRadius: 20,
              padding: "16px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              minHeight: 110,
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: 900,
                color: "#1e293b",
                letterSpacing: "1px",
                fontFamily: "var(--font-sans)",
              }}
            >
              TEACHER'S DESK
            </div>
            <div
              style={{
                width: 38,
                height: 12,
                background: "#facc15",
                borderRadius: "0 0 8px 8px",
                border: "2px solid #1e293b",
                borderTop: "none",
                marginTop: 4,
              }}
            />
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, marginTop: 4 }}>
              BÀN GIÁO VIÊN
            </div>
          </div>
        );
      }
      return null;
    }

    const hasStudent = !!slot.studentName;

    return (
      <div
        key={slot.id}
        draggable={hasStudent}
        onDragStart={(e) => handleDragStart(e, slot.id)}
        onDragOver={(e) => handleDragOver(e, slot.id)}
        onDrop={(e) => handleDrop(e, slot.id)}
        onClick={() => handleSlotClick(slot)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          transition: "all 0.15s ease",
          position: "relative",
          transform: isDragOver ? "scale(1.06)" : isSelected ? "scale(1.04)" : "none",
          zIndex: isDragOver || isSelected ? 10 : 1,
        }}
      >
        {/* Photo Container */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: hasStudent ? "#f1f5f9" : "transparent",
            border: isSelected
              ? "3px solid #0284c7"
              : isDragOver
              ? "3px dashed #0284c7"
              : hasStudent
              ? "2px solid #e2e8f0"
              : "2px dashed #cbd5e1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: hasStudent ? "0 4px 10px rgba(0,0,0,0.06)" : "none",
            marginBottom: 6,
            position: "relative",
          }}
        >
          {hasStudent ? (
            slot.studentPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.studentPhoto}
                alt={slot.studentName || "Avatar"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "1.1rem",
                  color: "#0369a1",
                }}
              >
                {slot.studentName?.substring(0, 2) || <User size={26} color="#0284c7" />}
              </div>
            )
          ) : (
            <Plus size={20} color="#94a3b8" />
          )}

          {/* Drag handle badge indicator */}
          {hasStudent && (
            <div
              title="Kéo chuột để đổi chỗ"
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 18,
                height: 18,
                background: "rgba(15,23,42,0.7)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Move size={10} />
            </div>
          )}
        </div>

        {/* Name Capsule Box (Pixel Perfect match to User's sample) */}
        <div
          style={{
            width: "100%",
            maxWidth: 100,
            minHeight: 38,
            borderRadius: 14,
            border: isSelected
              ? "2px solid #0284c7"
              : hasStudent
              ? "2px solid #000000"
              : "1px dashed #cbd5e1",
            background: isSelected ? "#e0f2fe" : hasStudent ? "#ffffff" : "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 6px",
            textAlign: "center",
            boxShadow: hasStudent ? "0 2px 4px rgba(0,0,0,0.04)" : "none",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 900,
              color: hasStudent ? "#000000" : "#94a3b8",
              lineHeight: 1.15,
              textTransform: "uppercase",
              wordBreak: "break-word",
            }}
          >
            {slot.studentName || "Trống"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Toast */}
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
          }}
        >
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #0284c7 0%, #0891b2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <LayoutGrid size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
                Sơ Đồ Lớp Học & Chỗ Ngồi — Lớp {selectedLop}
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.825rem", margin: 0 }}>
                Sắp xếp chỗ ngồi 7 hàng ngang, 2 dãy (56 chỗ) • Kéo thả đổi chỗ bằng chuột • Xuất PDF in bàn giáo viên
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-secondary btn-sm" onClick={openSettings}>
            <Settings size={14} /> Chỉnh sửa thông tin
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setNewMonthModalOpen(true)}>
            <Calendar size={14} /> Đổi tháng / Tạo mới
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <Printer size={14} /> Xuất PDF / In Sơ Đồ
          </button>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          background: "white",
          padding: "12px 18px",
          borderRadius: 14,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* Class Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              Lớp:
            </span>
            <select
              className="select"
              style={{ fontWeight: 800, color: "var(--primary)", minWidth: 110 }}
              value={selectedLop}
              onChange={(e) => setSelectedLop(e.target.value)}
            >
              {classList.map((c) => (
                <option key={c} value={c}>
                  Lớp {c}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              Tháng:
            </span>
            <select
              className="select"
              style={{ fontWeight: 700, minWidth: 140 }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {monthList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Rotation Buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRotateRows}
            title="Dời tiến mỗi hàng 1 bậc"
          >
            <RotateCw size={13} /> Xoay vòng hàng ghế
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSwapBlocks}
            title="Hoán đổi toàn bộ Dãy Trái và Dãy Phải"
          >
            <ArrowLeftRight size={13} /> Đổi chéo 2 dãy
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleSaveChart()}
            disabled={saving}
          >
            <Save size={13} /> {saving ? "Đang lưu..." : "Lưu sơ đồ"}
          </button>
        </div>
      </div>

      {/* Drag & Drop Hint Banner */}
      <div
        style={{
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 10,
          padding: "8px 14px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.8rem",
          color: "#0369a1",
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Move size={14} />
          <span>💡 <strong>Mẹo đổi chỗ:</strong> Dùng chuột <strong>kéo thả</strong> ảnh học sinh sang vị trí khác để đổi chỗ, hoặc bấm vào 1 vị trí để sửa/thêm ảnh!</span>
        </div>
        {selectedSlotForSwap && (
          <span style={{ color: "#0284c7", fontWeight: 800 }}>
            Đang chọn 1 vị trí • Bấm vị trí thứ 2 để hoán đổi!
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SEATING CHART POSTER / PRINT CONTAINER (MATCHES USER'S EXACT SAMPLE IMAGE) */}
      {/* ========================================================================= */}
      <div
        id="seating-chart-print-area"
        className="card"
        style={{
          background: "#ffffff",
          backgroundImage: "radial-gradient(#e2e8f0 1.2px, transparent 1.2px)",
          backgroundSize: "24px 24px",
          borderRadius: 24,
          border: "2px solid #e2e8f0",
          padding: "36px 32px 28px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          position: "relative",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        {/* Main 7 Rows Grid Layout */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[1, 2, 3, 4, 5, 6, 7].map((rowNum) => {
            const leftSlots = slots.filter((s) => s.row === rowNum && s.block === "left");
            const rightSlots = slots.filter((s) => s.row === rowNum && s.block === "right");

            return (
              <div
                key={`row-${rowNum}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 40px 1fr",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {/* Dãy Trái (4 cột bàn) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 10,
                  }}
                >
                  {leftSlots.map((s) => renderSeatCard(s))}
                </div>

                {/* Lối đi chính ở giữa */}
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    color: "#cbd5e1",
                    letterSpacing: "1px",
                  }}
                >
                  H{rowNum}
                </div>

                {/* Dãy Phải (4 cột bàn) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 10,
                  }}
                >
                  {rightSlots.map((s) => renderSeatCard(s))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* FOOTER SECTION: TITLE, CLASS, TEACHER, SLOGAN (EXACT MATCH) */}
        {/* ========================================================= */}
        <div
          style={{
            marginTop: 36,
            paddingTop: 20,
            borderTop: "2px solid #000000",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Bottom Left Title */}
          <div>
            <div
              style={{
                fontSize: "1.7rem",
                fontWeight: 900,
                color: "#000000",
                letterSpacing: "-0.5px",
                lineHeight: 1.1,
                fontFamily: "var(--font-sans)",
              }}
            >
              {title}
            </div>
            {slogan && (
              <div style={{ fontSize: "0.8rem", color: "#64748b", fontStyle: "italic", marginTop: 4 }}>
                "{slogan}"
              </div>
            )}
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2, fontWeight: 600 }}>
              Áp dụng: {selectedMonth} • Hệ thống Quanlyhocvien
            </div>
          </div>

          {/* Bottom Right Badges (Class & Teacher) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
            {/* Class Box */}
            <div
              style={{
                border: "2px solid #000000",
                borderRadius: 20,
                padding: "6px 16px",
                fontSize: "0.85rem",
                fontWeight: 800,
                color: "#000000",
                background: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Class:</span>
              <span style={{ color: "#0284c7" }}>{selectedLop}</span>
            </div>

            {/* Teacher Box */}
            <div
              style={{
                border: "2px solid #000000",
                borderRadius: 20,
                padding: "6px 16px",
                fontSize: "0.85rem",
                fontWeight: 800,
                color: "#000000",
                background: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span>Teacher:</span>
              <span style={{ color: "#0284c7" }}>{gvcn}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EDIT SLOT MODAL (SELECT STUDENT, UPLOAD PHOTO, EDIT NAME) */}
      {/* ========================================================= */}
      {editSlotModal && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 999999 }}>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)" }}
            onClick={() => setEditSlotModal(null)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              background: "white",
              borderRadius: 20,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: "26px 28px",
              width: "92%",
              maxWidth: 480,
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#0284c7" }}>
                  Chỉnh sửa vị trí: Hàng {editSlotModal.row} — {editSlotModal.block === "left" ? "Dãy Trái" : "Dãy Phải"} (Cột {editSlotModal.col})
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0, marginTop: 2 }}>
                  Gán học sinh, tải ảnh đại diện hoặc xóa vị trí
                </p>
              </div>
              <button
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)" }}
                onClick={() => setEditSlotModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Select from existing students */}
              <div>
                <label className="label" style={{ fontWeight: 800 }}>
                  Chọn từ danh sách học sinh Lớp {selectedLop}:
                </label>
                <select
                  className="select"
                  style={{ fontWeight: 700, width: "100%" }}
                  value={slotForm.studentId || 0}
                  onChange={(e) => handleStudentSelect(Number(e.target.value))}
                >
                  <option value={0}>-- Chọn học sinh có sẵn trong danh sách --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.hoTen} (Tổ {st.to})
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Name */}
              <div>
                <label className="label" style={{ fontWeight: 800 }}>
                  Họ và tên học sinh (In hoa):
                </label>
                <input
                  className="input"
                  style={{ fontWeight: 800, textTransform: "uppercase" }}
                  value={slotForm.studentName}
                  onChange={(e) => setSlotForm((f) => ({ ...f, studentName: e.target.value }))}
                  placeholder="VD: TRẦN HOÀNG QUÂN"
                />
              </div>

              {/* Photo Upload & Preview */}
              <div>
                <label className="label" style={{ fontWeight: 800 }}>
                  Ảnh thẻ / Avatar học sinh:
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "#f1f5f9",
                      border: "2px solid #cbd5e1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {slotForm.studentPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slotForm.studentPhoto} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <User size={24} color="#94a3b8" />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <label
                      className="btn btn-secondary btn-sm"
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <Upload size={14} /> Tải ảnh lên (.jpg, .png)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        style={{ display: "none" }}
                      />
                    </label>
                    {slotForm.studentPhoto && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ marginLeft: 8, color: "#dc2626", background: "#fee2e2", border: "none" }}
                        onClick={() => setSlotForm((f) => ({ ...f, studentPhoto: null }))}
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                className="btn"
                style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fca5a5" }}
                onClick={handleClearSlot}
              >
                <Trash2 size={14} /> Để trống
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditSlotModal(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveSlot}>
                <Save size={14} /> Lưu vị trí
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* SETTINGS MODAL (EDIT TITLE, GVCN, SLOGAN) */}
      {/* ========================================================= */}
      {settingsModalOpen && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 999999 }}>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)" }}
            onClick={() => setSettingsModalOpen(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              background: "white",
              borderRadius: 20,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: "26px 28px",
              width: "92%",
              maxWidth: 460,
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "var(--primary)" }}>
                Cấu hình thông tin sơ đồ
              </h3>
              <button
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                onClick={() => setSettingsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label" style={{ fontWeight: 800 }}>Tiêu đề sơ đồ:</label>
                <input
                  className="input"
                  value={settingsForm.title}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="VD: CLASSROOM SEATING CHART"
                />
              </div>

              <div>
                <label className="label" style={{ fontWeight: 800 }}>Giáo viên chủ nhiệm (GVCN):</label>
                <input
                  className="input"
                  value={settingsForm.gvcn}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, gvcn: e.target.value }))}
                  placeholder="VD: Phí Huỳnh Anh Hào"
                />
              </div>

              <div>
                <label className="label" style={{ fontWeight: 800 }}>Câu Slogan / Châm ngôn của lớp:</label>
                <input
                  className="input"
                  value={settingsForm.slogan}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, slogan: e.target.value }))}
                  placeholder="VD: Kỷ Cương - Trách Nhiệm - Hiệu Quả - Phát Triển"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSettingsModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveSettings}>
                <Save size={14} /> Lưu thông tin
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* NEW MONTH MODAL */}
      {/* ========================================================= */}
      {newMonthModalOpen && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 999999 }}>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)" }}
            onClick={() => setNewMonthModalOpen(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              background: "white",
              borderRadius: 20,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: "26px 28px",
              width: "92%",
              maxWidth: 420,
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "var(--primary)" }}>
                Tạo sơ đồ cho tháng mới
              </h3>
              <button
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                onClick={() => setNewMonthModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.825rem", margin: "0 0 14px" }}>
              Hệ thống sẽ sao chép vị trí chỗ ngồi từ <strong>{selectedMonth}</strong> sang tháng mới để bạn dễ dàng xoay vòng hoặc chỉnh sửa đổi chỗ.
            </p>

            <div style={{ marginBottom: 18 }}>
              <label className="label" style={{ fontWeight: 800 }}>Tên tháng mới:</label>
              <input
                className="input"
                value={newMonthName}
                onChange={(e) => setNewMonthName(e.target.value)}
                placeholder="VD: Tháng 10/2025..."
                autoFocus
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setNewMonthModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreateNewMonth}>
                <Plus size={14} /> Tạo tháng mới
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
