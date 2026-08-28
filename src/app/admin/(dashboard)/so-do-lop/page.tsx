"use client";
import React, { useState, useEffect } from "react";
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
  Calendar,
  Sparkles,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  Settings,
  School,
  RotateCcw,
  Filter,
  Download,
} from "lucide-react";
import { SeatSlotData, generateEmptySlots, getSlotTo } from "@/lib/seatingTypes";
import { compressImage } from "@/lib/imageUtils";

interface StudentOption {
  id: number;
  hoTen: string;
  tenGoi: string | null;
  gioiTinh: string;
  avatar: string | null;
  to: number;
}

const TO_COLORS: Record<number, { label: string; bg: string; text: string; border: string; glow: string; badgeBg: string }> = {
  1: { label: "Tổ 1", bg: "#e0f2fe", text: "#0369a1", border: "#38bdf8", glow: "rgba(2, 132, 199, 0.35)", badgeBg: "#0284c7" },
  2: { label: "Tổ 2", bg: "#dcfce7", text: "#15803d", border: "#4ade80", glow: "rgba(22, 163, 74, 0.35)", badgeBg: "#16a34a" },
  3: { label: "Tổ 3", bg: "#fef3c7", text: "#b45309", border: "#fcd34d", glow: "rgba(217, 119, 6, 0.35)", badgeBg: "#d97706" },
  4: { label: "Tổ 4", bg: "#f3e8ff", text: "#7e22ce", border: "#c084fc", glow: "rgba(147, 51, 234, 0.35)", badgeBg: "#9333ea" },
};

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

  // Filter on Main Page by Tổ (0 = All, 1, 2, 3, 4)
  const [filterTo, setFilterTo] = useState<number>(0);

  // Chart data
  const [chartId, setChartId] = useState<number | null>(null);
  const [title, setTitle] = useState("SƠ ĐỒ LỚP 12T2");
  const [gvcn, setGvcn] = useState("KIM LIÊN");
  const [slogan, setSlogan] = useState("12T2 – CÙNG NHAU VƯỢT VŨ MÔN, CÙNG NHAU CHIẾN THẮNG! 100% ĐẬU TỐT NGHIỆP – WE ARE WINNERS! 🏆");
  const [slots, setSlots] = useState<SeatSlotData[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Drag and Drop & Touch Swap state
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [selectedSlotForSwap, setSelectedSlotForSwap] = useState<string | null>(null);

  // Edit Slot Modal
  const [editSlotModal, setEditSlotModal] = useState<SeatSlotData | null>(null);
  const [modalFilterTo, setModalFilterTo] = useState<number>(0);
  const [slotForm, setSlotForm] = useState<{
    studentId: number | null;
    studentName: string;
    studentPhoto: string | null;
    to: number | null;
  }>({
    studentId: null,
    studentName: "",
    studentPhoto: null,
    to: null,
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

  // Load ALL data in parallel (classes + months + chart) — 3x faster than sequential
  const loadAll = async () => {
    setLoading(true);
    try {
      const [classRes, monthRes, chartRes] = await Promise.all([
        fetch("/api/classes"),
        fetch(`/api/seating/months?lop=${selectedLop}`),
        fetch(`/api/seating?lop=${selectedLop}&month=${encodeURIComponent(selectedMonth)}`),
      ]);

      const [classData, monthData, chartData] = await Promise.all([
        classRes.json(),
        monthRes.json(),
        chartRes.json(),
      ]);

      // Classes
      if (classData.data && classData.data.length > 0) setClassList(classData.data);

      // Months
      if (monthData.months && monthData.months.length > 0) {
        setMonthList(monthData.months);
        if (!monthData.months.includes(selectedMonth)) {
          setSelectedMonth(monthData.months[0]);
        }
      }

      // Chart
      if (chartData.success && chartData.chart) {
        setChartId(chartData.chart.id);
        setTitle(chartData.chart.title || `SƠ ĐỒ LỚP ${selectedLop}`);
        setGvcn(chartData.chart.gvcn || "KIM LIÊN");
        setSlogan(chartData.chart.slogan || "12T2 – CÙNG NHAU VƯỢT VŨ MÔN, CÙNG NHAU CHIẾN THẮNG!");

        const loadedStudents: StudentOption[] = chartData.students || [];
        setStudents(loadedStudents);

        let loadedSlots: SeatSlotData[] = chartData.chart.slots || [];
        if (loadedSlots.length < 56) {
          const empty = generateEmptySlots();
          loadedSlots = empty.map((e) => {
            const found = loadedSlots.find((l) => l.row === e.row && l.col === e.col);
            return found || e;
          });
        }

        // Backfill 'to' from student list if available
        loadedSlots = loadedSlots.map((s) => {
          if (s.studentId) {
            const st = loadedStudents.find((st) => st.id === s.studentId);
            if (st) return { ...s, to: st.to };
          }
          if (s.studentName) {
            const st = loadedStudents.find((st) => st.hoTen.toLowerCase().includes(s.studentName?.toLowerCase() || ""));
            if (st) return { ...s, to: st.to };
          }
          return s;
        });

        setSlots(loadedSlots);
      }
    } catch {
      showToast("Lỗi tải sơ đồ lớp học", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLop, selectedMonth]);

  // Save Chart (Lightweight 3KB payload, no heavy base64 strings)
  async function handleSaveChart(
    customSlots?: SeatSlotData[],
    customTitle?: string,
    customGvcn?: string,
    customSlogan?: string
  ) {
    setSaving(true);
    try {
      const rawSlots = customSlots || slots;
      // Strip base64 photos from seating layout payload so size is always ~3KB
      const lightweightSlots = rawSlots.map((s) => ({
        id: s.id,
        row: s.row,
        col: s.col,
        block: s.block,
        studentId: s.studentId || null,
        studentName: s.studentName ? s.studentName.toUpperCase() : null,
        to: s.to || null,
        gender: s.gender || null,
      }));

      const finalTitle = customTitle !== undefined ? customTitle : title;
      const finalGvcn = customGvcn !== undefined ? customGvcn : gvcn;
      const finalSlogan = customSlogan !== undefined ? customSlogan : slogan;

      const res = await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chartId,
          lop: selectedLop,
          month: selectedMonth,
          title: finalTitle,
          gvcn: finalGvcn,
          slogan: finalSlogan,
          slots: lightweightSlots,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Mã lỗi HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        showToast("Đã lưu sơ đồ lớp học thành công");
        if (data.data?.id) setChartId(data.data.id);
      } else {
        showToast(data.error || "Lỗi khi lưu sơ đồ", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ: " + (e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setSaving(false);
    }
  }

  // Clear all seats to blank
  async function handleClearAllSlots() {
    if (!confirm(`Bạn có chắc muốn LÀM TRỐNG TOÀN BỘ 56 vị trí chỗ ngồi của Lớp ${selectedLop} (${selectedMonth}) không?`)) return;
    setClearing(true);
    try {
      const empty = generateEmptySlots();
      setSlots(empty);
      await handleSaveChart(empty);
      showToast("Đã làm trống toàn bộ sơ đồ 56 chỗ ngồi");
    } catch {
      showToast("Lỗi làm trống sơ đồ", "error");
    } finally {
      setClearing(false);
    }
  }

  // 1-Click Direct Full-Height A4 PDF Download
  async function handleDownloadPdf() {
    const element = document.getElementById("seating-chart-print-area");
    if (!element) {
      window.print();
      return;
    }

    setExportingPdf(true);
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default;
      const jsPdfModule = await import("jspdf");
      const jsPDF = jsPdfModule.default;

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 4;
      const marginY = 4;
      const renderWidth = pageWidth - marginX * 2; // 202mm
      const renderHeight = pageHeight - marginY * 2; // 289mm

      pdf.addImage(imgData, "PNG", marginX, marginY, renderWidth, renderHeight);
      pdf.save(`So_do_lop_${selectedLop}_A4_${selectedMonth.replace(/[\s/]+/g, "_")}.pdf`);
      showToast("Đã xuất file PDF A4 chuẩn tràn trang thành công!");
    } catch (error) {
      console.error("PDF export error:", error);
      showToast("Đang mở hộp thoại in...", "success");
      window.print();
    } finally {
      setExportingPdf(false);
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

      const tempName = newSlots[srcIdx].studentName;
      const tempPhoto = newSlots[srcIdx].studentPhoto;
      const tempId = newSlots[srcIdx].studentId;
      const tempGender = newSlots[srcIdx].gender;
      const tempTo = newSlots[srcIdx].to;

      newSlots[srcIdx] = {
        ...newSlots[srcIdx],
        studentName: newSlots[tgtIdx].studentName,
        studentPhoto: newSlots[tgtIdx].studentPhoto,
        studentId: newSlots[tgtIdx].studentId,
        gender: newSlots[tgtIdx].gender,
        to: newSlots[tgtIdx].to,
      };

      newSlots[tgtIdx] = {
        ...newSlots[tgtIdx],
        studentName: tempName,
        studentPhoto: tempPhoto,
        studentId: tempId,
        gender: tempGender,
        to: tempTo,
      };

      handleSaveChart(newSlots);
      return newSlots;
    });

    showToast("Đã đổi chỗ ngồi thành công");
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

  // Click-to-swap
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
    const slotTo = slot.to || (slot.studentId ? students.find(s => s.id === slot.studentId)?.to : null) || 1;
    setEditSlotModal(slot);
    setModalFilterTo(slotTo);
    setSlotForm({
      studentId: slot.studentId || null,
      studentName: slot.studentName || "",
      studentPhoto: slot.studentPhoto || null,
      to: slotTo,
    });
  }

  function handleStudentSelect(stId: number) {
    if (!editSlotModal) return;
    if (stId === 0) {
      setSlotForm({ studentId: null, studentName: "", studentPhoto: null, to: null });
      return;
    }
    const st = students.find((s) => s.id === stId);
    if (st) {
      setSlotForm({
        studentId: st.id,
        studentName: st.hoTen.toUpperCase(),
        studentPhoto: st.avatar || null,
        to: st.to,
      });
    }
  }

  // Photo Upload with Auto-Compression
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file, 280, 320, 0.8);
      setSlotForm((f) => ({ ...f, studentPhoto: compressedBase64 }));
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSlotForm((f) => ({ ...f, studentPhoto: base64 }));
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSaveSlot() {
    if (!editSlotModal) return;

    // 1. If student has studentId, persist photo to Student table
    if (slotForm.studentId) {
      try {
        await fetch(`/api/students/${slotForm.studentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatar: slotForm.studentPhoto,
          }),
        });
      } catch (err) {
        console.error("Student avatar save error:", err);
      }

      // Update local student list
      setStudents((prev) =>
        prev.map((st) =>
          st.id === slotForm.studentId ? { ...st, avatar: slotForm.studentPhoto } : st
        )
      );
    }

    // 2. Update slot in seating chart state
    const studentTo = slotForm.to || (slotForm.studentId ? students.find(s => s.id === slotForm.studentId)?.to : null) || null;
    const updated = slots.map((s) => {
      if (s.id === editSlotModal.id) {
        return {
          ...s,
          studentName: slotForm.studentName.trim() ? slotForm.studentName.trim().toUpperCase() : null,
          studentPhoto: slotForm.studentPhoto,
          studentId: slotForm.studentId,
          to: studentTo,
        };
      }
      return s;
    });

    setSlots(updated);
    handleSaveChart(updated);
    setEditSlotModal(null);
    showToast("Đã lưu vị trí chỗ ngồi thành công");
  }

  function handleClearSlot() {
    if (!editSlotModal) return;
    setSlots((prev) => {
      const updated = prev.map((s) => {
        if (s.id === editSlotModal.id) {
          return { ...s, studentName: null, studentPhoto: null, studentId: null, to: null };
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
  function handleRotateRows() {
    if (!confirm("Bạn có muốn xoay vòng các hàng ghế (Dời tiến 1 hàng cho cả 2 dãy) không?")) return;

    setSlots((prev) => {
      const newSlots = [...prev];
      for (let c = 1; c <= 8; c++) {
        const colSeats = [1, 2, 3, 4, 5, 6, 7].map((r) => newSlots.find((s) => s.row === r && s.col === c)!);
        const lastSeat = { ...colSeats[6] };
        for (let r = 6; r >= 1; r--) {
          const prevSeat = colSeats[r - 1];
          colSeats[r].studentName = prevSeat.studentName;
          colSeats[r].studentPhoto = prevSeat.studentPhoto;
          colSeats[r].studentId = prevSeat.studentId;
          colSeats[r].to = prevSeat.to;
        }
        colSeats[0].studentName = lastSeat.studentName;
        colSeats[0].studentPhoto = lastSeat.studentPhoto;
        colSeats[0].studentId = lastSeat.studentId;
        colSeats[0].to = lastSeat.to;
      }

      handleSaveChart(newSlots);
      return newSlots;
    });

    showToast("Đã xoay vòng 7 hàng ghế thành công!");
  }

  function handleSwapBlocks() {
    if (!confirm("Bạn có muốn đổi chỗ giữa Dãy Trái và Dãy Phải không?")) return;

    setSlots((prev) => {
      const newSlots = [...prev];
      for (let r = 1; r <= 7; r++) {
        for (let i = 0; i < 4; i++) {
          const leftSeat = newSlots.find((s) => s.row === r && s.col === 1 + i);
          const rightSeat = newSlots.find((s) => s.row === r && s.col === 5 + i);

          if (leftSeat && rightSeat) {
            const tempName = leftSeat.studentName;
            const tempPhoto = leftSeat.studentPhoto;
            const tempId = leftSeat.studentId;
            const tempTo = leftSeat.to;

            leftSeat.studentName = rightSeat.studentName;
            leftSeat.studentPhoto = rightSeat.studentPhoto;
            leftSeat.studentId = rightSeat.studentId;
            leftSeat.to = rightSeat.to;

            rightSeat.studentName = tempName;
            rightSeat.studentPhoto = tempPhoto;
            rightSeat.studentId = tempId;
            rightSeat.to = tempTo;
          }
        }
      }
      handleSaveChart(newSlots);
      return newSlots;
    });

    showToast("Đã hoán đổi vị trí 2 dãy bàn thành công!");
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

  // Settings
  function openSettings() {
    setSettingsForm({ title, gvcn, slogan });
    setSettingsModalOpen(true);
  }

  async function handleSaveSettings() {
    const newTitle = settingsForm.title.trim() || `SƠ ĐỒ LỚP ${selectedLop}`;
    const newGvcn = settingsForm.gvcn.trim() || "CHỀNH KIM LIÊN";
    const newSlogan = settingsForm.slogan.trim() || "12T2 CÙNG NHAU VƯỢT VŨ MÔN, CÙNG NHAU CHIẾN THẮNG!";

    setTitle(newTitle);
    setGvcn(newGvcn);
    setSlogan(newSlogan);
    setSettingsModalOpen(false);

    await handleSaveChart(slots, newTitle, newGvcn, newSlogan);
  }

  // Filtered Students for Modal
  const modalFilteredStudents = modalFilterTo === 0 ? students : students.filter((s) => s.to === modalFilterTo);

  // Render Seat Card with EXPANDED AVATAR (92px) and NON-CLIPPED FULL NAME CAPSULE BOX
  function renderSeatCard(slot: SeatSlotData) {
    const isSelected = selectedSlotForSwap === slot.id;
    const isDragOver = dragOverSlotId === slot.id;
    const hasStudent = !!slot.studentName;

    // Derived Tổ strictly from student's assigned Tổ in database (color follows student info)
    const matchedStudent = students.find(
      (st) =>
        (slot.studentId && st.id === slot.studentId) ||
        (slot.studentName && st.hoTen.trim().toLowerCase() === slot.studentName.trim().toLowerCase())
    );
    const slotTo = (matchedStudent && matchedStudent.to) ? matchedStudent.to : (slot.to || 1);
    const toConfig = TO_COLORS[slotTo] || TO_COLORS[1];

    // Filter by Tổ on Main Page
    const isMatchingTo = filterTo === 0 || (hasStudent && slotTo === filterTo);
    const isDimmed = filterTo !== 0 && (!hasStudent || slotTo !== filterTo);

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
          opacity: isDimmed ? 0.25 : 1,
          transform: isDragOver ? "scale(1.05)" : isSelected ? "scale(1.03)" : isMatchingTo && filterTo !== 0 ? "scale(1.02)" : "none",
          zIndex: isDragOver || isSelected ? 10 : 1,
          width: "100%",
        }}
      >
        {/* RECTANGULAR PHOTO CONTAINER (98px x 104px, Bo tròn nhẹ 4 góc) */}
        <div
          style={{
            width: 98,
            height: 104,
            borderRadius: 14,
            background: hasStudent ? toConfig.bg : "#ffffff",
            border: isSelected
              ? "3px solid #0284c7"
              : isDragOver
              ? "3px dashed #0284c7"
              : filterTo !== 0 && isMatchingTo
              ? `3px solid ${toConfig.border}`
              : hasStudent
              ? `2.5px solid ${toConfig.border}`
              : "2px dashed #94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: filterTo !== 0 && isMatchingTo
              ? `0 0 14px ${toConfig.glow}`
              : hasStudent
              ? `0 3px 8px ${toConfig.glow}`
              : "none",
            marginBottom: 5,
            position: "relative",
            transition: "all 0.15s ease",
          }}
        >
          {hasStudent ? (
            slot.studentPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.studentPhoto}
                alt={slot.studentName || "Avatar"}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: toConfig.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "1.45rem",
                  color: toConfig.text,
                }}
              >
                {slot.studentName?.substring(0, 2) || <User size={32} color={toConfig.text} />}
              </div>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Plus size={26} color="#94a3b8" />
            </div>
          )}

          {/* Tổ Badge on Avatar corner */}
          {hasStudent && (
            <div
              title={`Tổ ${slotTo}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                background: toConfig.badgeBg,
                color: "white",
                fontSize: "0.68rem",
                fontWeight: 900,
                padding: "2px 7px",
                borderRadius: "11px 0 9px 0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            >
              T{slotTo}
            </div>
          )}

          {/* Drag handle icon */}
          {hasStudent && (
            <div
              className="no-print"
              title="Kéo chuột để đổi chỗ"
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 20,
                height: 20,
                background: "rgba(15,23,42,0.75)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Move size={11} />
            </div>
          )}
        </div>

        {/* Name Capsule Box (Enhanced height & clear 3-line overflow) */}
        <div
          style={{
            width: "100%",
            maxWidth: 112,
            minHeight: 46,
            borderRadius: 14,
            border: isSelected
              ? "2px solid #0284c7"
              : filterTo !== 0 && isMatchingTo
              ? `2px solid ${toConfig.border}`
              : hasStudent
              ? `2px solid ${toConfig.border}`
              : "1px dashed #cbd5e1",
            background: isSelected
              ? "#e0f2fe"
              : hasStudent
              ? toConfig.bg
              : "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 6px",
            textAlign: "center",
            boxShadow: hasStudent ? `0 2px 5px ${toConfig.glow}` : "none",
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 900,
              color: hasStudent ? toConfig.text : "#94a3b8",
              lineHeight: 1.22,
              textTransform: "uppercase",
              wordBreak: "break-word",
              display: "block",
            }}
          >
            {slot.studentName || "TRỐNG"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Full-Height A4 Print CSS Styles (No whitespace, 100% 1-Page Fit) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 5mm;
          }
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #seating-chart-print-area, #seating-chart-print-area * {
            visibility: visible;
          }
          #seating-chart-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 288mm !important;
            min-height: 288mm !important;
            max-height: 288mm !important;
            margin: 0 !important;
            padding: 16px 20px 14px !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: 2.5px solid #000000 !important;
            border-radius: 18px !important;
            display: flex !important;
            flex-direction: column !important;
            justifyContent: space-between !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            overflow: hidden !important;
          }
          .no-print, header, nav, aside, footer {
            display: none !important;
          }
        }
      `}</style>

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
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              flexShrink: 0,
            }}
          >
            <LayoutGrid size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
              Sơ Đồ Lớp Học — Lớp {selectedLop}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: "2px 0 0" }}>
              56 chỗ • Kéo thả / Chạm để đổi vị trí
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.78rem", padding: "5px 10px" }}
            onClick={openSettings}
          >
            <Settings size={13} /> Cấu hình
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.78rem", padding: "5px 10px" }}
            onClick={() => setNewMonthModalOpen(true)}
          >
            <Calendar size={13} /> Đổi tháng
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.78rem", padding: "5px 10px" }}
            onClick={handleDownloadPdf}
            disabled={exportingPdf}
            title="Tải file PDF A4"
          >
            <Download size={13} /> {exportingPdf ? "Đang tạo..." : "Tải PDF"}
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ fontSize: "0.78rem", padding: "5px 12px" }}
            onClick={() => window.print()}
          >
            <Printer size={13} /> In A4
          </button>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div
        className="no-print"
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 12,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          background: "white",
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              Lớp:
            </span>
            <select
              className="select"
              style={{ fontWeight: 800, color: "var(--primary)", minWidth: 90, fontSize: "0.85rem", padding: "4px 8px" }}
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

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              Tháng:
            </span>
            <select
              className="select"
              style={{ fontWeight: 700, minWidth: 120, fontSize: "0.85rem", padding: "4px 8px" }}
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

          {/* Filter By Tổ (Tổ 1 - Tổ 4) */}
          <div className="mobile-chips-bar" style={{ background: "#f8fafc", padding: "3px 6px", borderRadius: 10, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4, paddingLeft: 2 }}>
              <Filter size={12} /> Tổ:
            </span>
            {[
              { id: 0, label: "Tất cả", color: "#64748b", bg: "#f1f5f9" },
              { id: 1, label: "Tổ 1", color: "#0284c7", bg: "#e0f2fe" },
              { id: 2, label: "Tổ 2", color: "#16a34a", bg: "#dcfce7" },
              { id: 3, label: "Tổ 3", color: "#d97706", bg: "#fef3c7" },
              { id: 4, label: "Tổ 4", color: "#9333ea", bg: "#f3e8ff" },
            ].map((t) => {
              const isActive = filterTo === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterTo(t.id)}
                  style={{
                    border: isActive ? `2px solid ${t.color}` : "1px solid transparent",
                    background: isActive ? t.bg : "transparent",
                    color: isActive ? t.color : "#64748b",
                    fontWeight: isActive ? 800 : 600,
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: 7,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Rotation Buttons */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.78rem", padding: "4px 8px" }}
            onClick={handleRotateRows}
            title="Dời tiến 7 hàng ghế 1 bậc"
          >
            <RotateCw size={12} /> Xoay hàng
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.78rem", padding: "4px 8px" }}
            onClick={handleSwapBlocks}
            title="Hoán đổi toàn bộ 2 Dãy Trái và Dãy Phải"
          >
            <ArrowLeftRight size={12} /> Đổi 2 dãy
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.78rem", padding: "4px 8px", color: "#dc2626" }}
            onClick={handleClearAllSlots}
            disabled={clearing}
            title="Làm trống toàn bộ sơ đồ"
          >
            <RotateCcw size={12} /> {clearing ? "..." : "Xóa trắng"}
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ fontSize: "0.78rem", padding: "4px 10px" }}
            onClick={() => handleSaveChart()}
            disabled={saving}
          >
            <Save size={12} /> {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      {/* Mobile Swipe Hint Notice */}
      <div
        className="no-print"
        style={{
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 10,
          padding: "7px 12px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.78rem",
          color: "#0369a1",
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Move size={14} />
          <span>📱 <strong>Mẹo điện thoại:</strong> Vuốt sang ngang ↔️ để xem 2 dãy bàn. Chạm 1 ô để sửa, hoặc chạm 2 ô liên tiếp để hoán đổi chỗ ngồi!</span>
        </div>
        {selectedSlotForSwap && (
          <span style={{ color: "#0284c7", fontWeight: 800, whiteSpace: "nowrap", marginLeft: 8 }}>
            Đang chọn 1 ô • Chạm ô thứ 2 để đổi!
          </span>
        )}
      </div>

      {/* Main Seating Chart Poster wrapped in responsive horizontal scroller */}
      <div className="seating-scroll-wrapper">
        <div
          id="seating-chart-print-area"
          className="card"
          style={{
            background: "#ffffff",
            backgroundImage: "radial-gradient(#e2e8f0 1.2px, transparent 1.2px)",
            backgroundSize: "22px 22px",
            borderRadius: 22,
            border: "2.5px solid #000000",
            padding: "24px 22px 20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
            position: "relative",
            minWidth: 880,
            maxWidth: 960,
            margin: "0 auto",
          }}
        >


        {/* Main 7 Rows Grid Layout */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[1, 2, 3, 4, 5, 6, 7].map((rowNum) => {
            const leftSlots = slots.filter((s) => s.row === rowNum && s.block === "left");
            const rightSlots = slots.filter((s) => s.row === rowNum && s.block === "right");

            return (
              <div
                key={`row-${rowNum}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 34px 1fr",
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
                    fontSize: "0.72rem",
                    fontWeight: 900,
                    color: "#94a3b8",
                    letterSpacing: "1px",
                  }}
                >
                  H{rowNum}
                </div>

                {/* Dãy Phải (4 cột bàn đều 7 hàng) */}
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
        {/* TEACHER'S DESK (ONLY "TEACHER'S DESK" TEXT)               */}
        {/* ========================================================= */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "flex-end",
            paddingRight: 16,
          }}
        >
          <div
            style={{
              width: 320,
              background: "#ffffff",
              border: "3px solid #1e293b",
              borderRadius: 18,
              padding: "12px 20px",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 900,
                color: "#1e293b",
                letterSpacing: "2px",
              }}
            >
              TEACHER'S DESK
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* FOOTER SECTION: TITLE, CLASS, TEACHER, SLOGAN             */}
        {/* ========================================================= */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "2.5px solid #000000",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          {/* Bottom Left Title */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: 900,
                color: "#000000",
                letterSpacing: "-0.5px",
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>
            {slogan && (
              <div style={{ fontSize: "0.825rem", color: "#475569", fontStyle: "italic", marginTop: 4 }}>
                "{slogan}"
              </div>
            )}
            {/* Chú thích màu sắc 4 Tổ */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#000000", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Chú thích:
              </span>
              {[
                { to: 1, name: "Tổ 1", bg: "#e0f2fe", text: "#0369a1", border: "#38bdf8" },
                { to: 2, name: "Tổ 2", bg: "#dcfce7", text: "#15803d", border: "#4ade80" },
                { to: 3, name: "Tổ 3", bg: "#fef3c7", text: "#b45309", border: "#fcd34d" },
                { to: 4, name: "Tổ 4", bg: "#f3e8ff", text: "#7e22ce", border: "#c084fc" },
              ].map((t) => (
                <div
                  key={t.to}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 10px",
                    borderRadius: 8,
                    background: t.bg,
                    border: `1.5px solid ${t.border}`,
                    color: t.text,
                    fontSize: "0.78rem",
                    fontWeight: 800,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: t.text,
                    }}
                  />
                  {t.name}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Right Badges (Class & Teacher) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
            {/* Class Box */}
            <div
              style={{
                border: "2.5px solid #000000",
                borderRadius: 16,
                padding: "6px 16px",
                fontSize: "0.9rem",
                fontWeight: 900,
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
                border: "2.5px solid #000000",
                borderRadius: 16,
                padding: "6px 16px",
                fontSize: "0.9rem",
                fontWeight: 900,
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
      </div>

      {/* ========================================================= */}
      {/* EDIT SLOT MODAL WITH TO FILTER                            */}
      {/* ========================================================= */}
      {editSlotModal && typeof document !== "undefined" && createPortal(
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
          onClick={() => setEditSlotModal(null)}
        >
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              padding: "24px 24px",
              width: "100%",
              maxWidth: 500,
              maxHeight: "calc(100vh - 40px)",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--border)",
              animation: "slideUp 0.18s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10, flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#0284c7" }}>
                  Xếp chỗ: Hàng {editSlotModal.row} — {editSlotModal.block === "left" ? "Dãy Trái" : "Dãy Phải"} (Cột {editSlotModal.col})
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0, marginTop: 2 }}>
                  Chọn học sinh, lọc theo Tổ hoặc tải ảnh đại diện
                </p>
              </div>
              <button
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)" }}
                onClick={() => setEditSlotModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Filter By Tổ Buttons inside Modal */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className="label" style={{ fontWeight: 800, margin: 0 }}>
                    Bộ lọc theo Tổ:
                  </label>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    ({modalFilteredStudents.length} học sinh)
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { id: 0, label: "Tất cả tổ", color: "#64748b", bg: "#f1f5f9" },
                    { id: 1, label: "🔵 Tổ 1", color: "#0284c7", bg: "#e0f2fe" },
                    { id: 2, label: "🟢 Tổ 2", color: "#16a34a", bg: "#dcfce7" },
                    { id: 3, label: "🟠 Tổ 3", color: "#d97706", bg: "#fef3c7" },
                    { id: 4, label: "🟣 Tổ 4", color: "#9333ea", bg: "#f3e8ff" },
                  ].map((t) => {
                    const isActive = modalFilterTo === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setModalFilterTo(t.id)}
                        style={{
                          border: isActive ? `2px solid ${t.color}` : "1px solid var(--border)",
                          background: isActive ? t.bg : "#ffffff",
                          color: isActive ? t.color : "#475569",
                          fontWeight: isActive ? 800 : 600,
                          fontSize: "0.78rem",
                          padding: "4px 8px",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Student Select Dropdown */}
              <div>
                <label className="label" style={{ fontWeight: 800 }}>Chọn học sinh từ danh sách:</label>
                <select
                  className="select"
                  value={slotForm.studentId || 0}
                  onChange={(e) => handleStudentSelect(Number(e.target.value))}
                  style={{ fontWeight: 700 }}
                >
                  <option value={0}>-- Chọn học sinh hoặc để trống --</option>
                  {modalFilteredStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.hoTen} ({st.gioiTinh}) - Tổ {st.to}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Name Display/Input */}
              <div>
                <label className="label" style={{ fontWeight: 800 }}>Họ và tên học sinh:</label>
                <input
                  className="input"
                  value={slotForm.studentName}
                  onChange={(e) => setSlotForm((f) => ({ ...f, studentName: e.target.value }))}
                  placeholder="Nhập tên học sinh (HOẶC CHỌN Ở TRÊN)"
                  style={{ textTransform: "uppercase", fontWeight: 800 }}
                />
              </div>

              {/* Photo Upload with Live Preview */}
              <div>
                <label className="label" style={{ fontWeight: 800 }}>Ảnh đại diện học sinh (Chân dung):</label>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div
                    style={{
                      width: 60,
                      height: 66,
                      borderRadius: 10,
                      border: "2px solid var(--border)",
                      background: "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {slotForm.studentPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slotForm.studentPhoto}
                        alt="Preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <User size={24} color="#94a3b8" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ fontSize: "0.8rem" }}
                    />
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                      Hệ thống tự nén ảnh tối ưu tốc độ và độ sắc nét khi in A4.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 18, paddingTop: 12, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: "var(--danger)", borderColor: "var(--danger-border)" }}
                onClick={handleClearSlot}
              >
                Để trống
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditSlotModal(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveSlot}>
                <Save size={15} /> Lưu vị trí
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* SETTINGS MODAL (EDIT TITLE, GVCN, SLOGAN)                 */}
      {/* ========================================================= */}
      {settingsModalOpen && typeof document !== "undefined" && createPortal(
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
          onClick={() => setSettingsModalOpen(false)}
        >
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              padding: "24px 24px",
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10, flexShrink: 0 }}>
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

            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label" style={{ fontWeight: 800 }}>Tiêu đề sơ đồ:</label>
                <input
                  className="input"
                  value={settingsForm.title}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="VD: SƠ ĐỒ LỚP 12T2"
                />
              </div>

              <div>
                <label className="label" style={{ fontWeight: 800 }}>Giáo viên chủ nhiệm (GVCN):</label>
                <input
                  className="input"
                  value={settingsForm.gvcn}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, gvcn: e.target.value }))}
                  placeholder="VD: KIM LIÊN"
                />
              </div>

              <div>
                <label className="label" style={{ fontWeight: 800 }}>Câu Slogan / Châm ngôn của lớp:</label>
                <input
                  className="input"
                  value={settingsForm.slogan}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, slogan: e.target.value }))}
                  placeholder="VD: 12T2 – CÙNG NHAU VƯỢT VŨ MÔN, CÙNG NHAU CHIẾN THẮNG!"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSettingsModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={handleSaveSettings}>
                <Save size={15} /> Lưu thông tin
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* NEW MONTH MODAL                                           */}
      {/* ========================================================= */}
      {newMonthModalOpen && typeof document !== "undefined" && createPortal(
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
          onClick={() => setNewMonthModalOpen(false)}
        >
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 20,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              padding: "24px 24px",
              width: "100%",
              maxWidth: 440,
              margin: "auto",
              border: "1px solid var(--border)",
              animation: "slideUp 0.18s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
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

            <p style={{ color: "var(--text-muted)", fontSize: "0.825rem", margin: "0 0 14px", lineHeight: 1.5 }}>
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
