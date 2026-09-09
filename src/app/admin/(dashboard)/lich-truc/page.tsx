"use client";
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar as CalendarIcon, Plus, Trash2, Edit2, Users, ChevronLeft,
  ChevronRight, CheckCircle, AlertCircle, Save, X, Sparkles, School, RotateCcw,
  Search, Shield, Info, Check, AlertTriangle, Clock, ArrowUpCircle, CheckSquare,
  Square, UserCheck, Flame, Filter, UserX,
} from "lucide-react";
import { getCurrentISOWeek, THU_NAMES, THU_ORDER } from "@/lib/format";
import { isStudentDutyExempt, calculateDutyDistribution, DUTY_WEEKDAYS } from "@/lib/dutyRules";

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

interface DutyPenaltyItem {
  id: number;
  studentId: number;
  lop: string;
  lyDo: string;
  ngay: string;
  ghiChu: string | null;
  trangThai: string; // "Chưa quét" | "Đã hoàn thành"
  createdAt: string;
  student: {
    id: number;
    hoTen: string;
    tenGoi: string | null;
    to: number;
    lop: string;
    avatar: string | null;
    gioiTinh?: string | null;
  };
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

  // Modal State (Phân 2 bạn trực cả tuần)
  const [weekPairModalOpen, setWeekPairModalOpen] = useState(false);
  const [pairStudentId1, setPairStudentId1] = useState<number | "">("");
  const [pairStudentId2, setPairStudentId2] = useState<number | "">("");
  const [pairSearch1, setPairSearch1] = useState("");
  const [pairSearch2, setPairSearch2] = useState("");
  const [pairToFilter1, setPairToFilter1] = useState<number | "ALL">("ALL");
  const [pairToFilter2, setPairToFilter2] = useState<number | "ALL">("ALL");
  const [clearPreviousPair, setClearPreviousPair] = useState<boolean>(true);
  const [pairSaving, setPairSaving] = useState(false);

  // State Danh Sách Vi Phạm & Phạt Quét Lớp
  const [penalties, setPenalties] = useState<DutyPenaltyItem[]>([]);
  const [violationCounts, setViolationCounts] = useState<Record<number, number>>({});
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [penaltyFilterStatus, setPenaltyFilterStatus] = useState<"ALL" | "Chưa quét" | "Đã hoàn thành" | "WARN_3">("ALL");
  const [penaltySearchQuery, setPenaltySearchQuery] = useState("");

  // Modal State Ghi Nhận Vi Phạm
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
  const [penaltyStudentId, setPenaltyStudentId] = useState<number | "">("");
  const [penaltyStudentSearch, setPenaltyStudentSearch] = useState("");
  const [penaltyStudentToFilter, setPenaltyStudentToFilter] = useState<number | "ALL">("ALL");
  const [penaltyLyDo, setPenaltyLyDo] = useState("");
  const [penaltyNgay, setPenaltyNgay] = useState(() => new Date().toISOString().split("T")[0]);
  const [penaltyGhiChu, setPenaltyGhiChu] = useState("");
  const [penaltySaving, setPenaltySaving] = useState(false);

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

  // Học sinh của Tổ hoặc Cả lớp cho modal tự động xếp lịch
  const currentToStudents = useMemo(() => {
    if (autoMode === "to") {
      return students.filter((s) => s.to === selectedToNum);
    }
    return students;
  }, [students, autoMode, selectedToNum]);

  // Tính toán kế hoạch phân bổ trực nhật tự động (cho preview) - Cố định 4 bạn/ngày kèm cơ chế bù ca lịch sử
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

  // Load classes, students, duties & penalties in parallel
  const loadData = async () => {
    setLoading(true);
    try {
      const activeClass = isSuperAdmin ? filterLop : assignedLop;
      const lopQuery = activeClass !== "ALL" ? `&lop=${activeClass}` : "";
      const [stdRes, dutyRes, classRes, penaltyRes] = await Promise.all([
        fetch(`/api/students${activeClass !== "ALL" ? `?lop=${activeClass}` : ""}`),
        fetch(`/api/duty?week=${currentWeek}${lopQuery}`),
        fetch("/api/classes"),
        fetch(`/api/duty/penalties${activeClass !== "ALL" ? `?lop=${activeClass}` : ""}`),
      ]);
      const [stdData, dutyData, classData, penaltyData] = await Promise.all([
        stdRes.json(), dutyRes.json(), classRes.json(), penaltyRes.json(),
      ]);

      setStudents(stdData.data || []);
      setEntries(dutyData.entries || []);
      setCumulativeDutyCounts(dutyData.cumulativeDutyCounts || {});
      setPriorDutyCounts(dutyData.priorDutyCounts || {});
      if (classData.data && classData.data.length > 0) setClassList(classData.data);
      setPenalties(penaltyData.penalties || []);
      setViolationCounts(penaltyData.violationCounts || {});
    } catch {
      showToast("Lỗi tải lịch trực nhật & danh sách vi phạm", "error");
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

  // Handle Save Week Pair (Phân 2 bạn trực cả tuần)
  async function handleSaveWeekPair() {
    if (!pairStudentId1 || !pairStudentId2) {
      showToast("Vui lòng chọn đủ 2 học sinh", "error");
      return;
    }
    if (pairStudentId1 === pairStudentId2) {
      showToast("Học sinh 1 và học sinh 2 không được trùng nhau", "error");
      return;
    }
    setPairSaving(true);
    const activeClass = isSuperAdmin ? filterLop : assignedLop;
    try {
      const res = await fetch("/api/duty/week-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuan: currentWeek,
          studentId1: pairStudentId1,
          studentId2: pairStudentId2,
          lop: activeClass,
          clearPrevious: clearPreviousPair,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Đã phân 2 bạn trực cả tuần thành công!");
        setWeekPairModalOpen(false);
        setPairStudentId1("");
        setPairStudentId2("");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Lỗi phân công", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra khi phân công", "error");
    } finally {
      setPairSaving(false);
    }
  }

  // Handle Save Penalty (Ghi nhận vi phạm & Phạt quét lớp)
  async function handleSavePenalty() {
    if (!penaltyStudentId) {
      showToast("Vui lòng chọn học sinh vi phạm", "error");
      return;
    }
    if (!penaltyLyDo.trim()) {
      showToast("Vui lòng nhập hoặc chọn lý do vi phạm", "error");
      return;
    }
    setPenaltySaving(true);
    const activeClass = isSuperAdmin ? (filterLop !== "ALL" ? filterLop : undefined) : assignedLop;
    try {
      const res = await fetch("/api/duty/penalties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: penaltyStudentId,
          lyDo: penaltyLyDo.trim(),
          ngay: penaltyNgay,
          ghiChu: penaltyGhiChu.trim(),
          lop: activeClass,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isRepeatedWarning) {
          showToast(`🚨 CẢNH BÁO: Học sinh này đã có ${data.violationCount} lần vi phạm và được đẩy lên đầu danh sách!`);
        } else {
          showToast(`Đã ghi nhận vi phạm (Lần thứ ${data.violationCount})`);
        }
        setPenaltyModalOpen(false);
        setPenaltyStudentId("");
        setPenaltyLyDo("");
        setPenaltyGhiChu("");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Lỗi ghi nhận vi phạm", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra", "error");
    } finally {
      setPenaltySaving(false);
    }
  }

  // Handle Toggle Penalty Status ("Chưa quét" ⇄ "Đã hoàn thành")
  async function handleTogglePenaltyStatus(item: DutyPenaltyItem) {
    const nextStatus = item.trangThai === "Chưa quét" ? "Đã hoàn thành" : "Chưa quét";
    try {
      const res = await fetch("/api/duty/penalties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, trangThai: nextStatus }),
      });
      if (res.ok) {
        showToast(`Đã đổi trạng thái sang: "${nextStatus}"`);
        loadData();
      } else {
        showToast("Lỗi cập nhật trạng thái", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra", "error");
    }
  }

  // Handle Delete Penalty
  async function handleDeletePenalty(id: number, name: string) {
    if (!confirm(`Bạn có chắc muốn xóa bản ghi vi phạm của "${name}"?`)) return;
    try {
      const res = await fetch(`/api/duty/penalties?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Đã xóa bản ghi vi phạm");
        loadData();
      } else {
        showToast("Lỗi khi xóa", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra", "error");
    }
  }

  // Quick Open Week Pair with pre-selected student
  function handleOpenWeekPairForStudent(studentId: number) {
    setPairStudentId1(studentId);
    setPairStudentId2("");
    setPairSearch1("");
    setPairSearch2("");
    setClearPreviousPair(true);
    setWeekPairModalOpen(true);
  }

  // Filtered Students for Pair Modal (Slot 1)
  const filteredPairStudents1 = useMemo(() => {
    let list = students;
    if (pairToFilter1 !== "ALL") {
      list = list.filter((s) => s.to === pairToFilter1);
    }
    if (!pairSearch1.trim()) return list;
    const q = normalizeVN(pairSearch1);
    return list.filter((s) => {
      const nameNorm = normalizeVN(s.hoTen);
      const nickNorm = s.tenGoi ? normalizeVN(s.tenGoi) : "";
      return nameNorm.includes(q) || nickNorm.includes(q) || `to ${s.to}`.includes(q);
    });
  }, [students, pairSearch1, pairToFilter1]);

  // Filtered Students for Pair Modal (Slot 2, excludes slot 1)
  const filteredPairStudents2 = useMemo(() => {
    let list = students.filter((s) => s.id !== pairStudentId1);
    if (pairToFilter2 !== "ALL") {
      list = list.filter((s) => s.to === pairToFilter2);
    }
    if (!pairSearch2.trim()) return list;
    const q = normalizeVN(pairSearch2);
    return list.filter((s) => {
      const nameNorm = normalizeVN(s.hoTen);
      const nickNorm = s.tenGoi ? normalizeVN(s.tenGoi) : "";
      return nameNorm.includes(q) || nickNorm.includes(q) || `to ${s.to}`.includes(q);
    });
  }, [students, pairStudentId1, pairSearch2, pairToFilter2]);

  // Filtered Students for Penalty Modal
  const filteredPenaltyModalStudents = useMemo(() => {
    let list = students;
    if (penaltyStudentToFilter !== "ALL") {
      list = list.filter((s) => s.to === penaltyStudentToFilter);
    }
    if (!penaltyStudentSearch.trim()) return list;
    const q = normalizeVN(penaltyStudentSearch);
    return list.filter((s) => {
      const nameNorm = normalizeVN(s.hoTen);
      const nickNorm = s.tenGoi ? normalizeVN(s.tenGoi) : "";
      return nameNorm.includes(q) || nickNorm.includes(q) || `to ${s.to}`.includes(q);
    });
  }, [students, penaltyStudentSearch, penaltyStudentToFilter]);

  // Selected Student Objects for Week Pair
  const pairStudentObj1 = useMemo(() => students.find((s) => s.id === pairStudentId1), [students, pairStudentId1]);
  const pairStudentObj2 = useMemo(() => students.find((s) => s.id === pairStudentId2), [students, pairStudentId2]);
  const penaltySelectedStudent = useMemo(() => students.find((s) => s.id === penaltyStudentId), [students, penaltyStudentId]);

  // Filtered and Sorted Penalty List
  // QUY TẮC: Học sinh có vi phạm >= 3 lần highlight màu đỏ nhạt và đưa lên nằm đầu trong danh sách!
  const sortedPenalties = useMemo(() => {
    let list = [...penalties];

    if (penaltyFilterStatus === "Chưa quét") {
      list = list.filter((p) => p.trangThai === "Chưa quét");
    } else if (penaltyFilterStatus === "Đã hoàn thành") {
      list = list.filter((p) => p.trangThai === "Đã hoàn thành");
    } else if (penaltyFilterStatus === "WARN_3") {
      list = list.filter((p) => (violationCounts[p.studentId] || 0) >= 3);
    }

    if (penaltySearchQuery.trim()) {
      const q = normalizeVN(penaltySearchQuery);
      list = list.filter((p) => {
        const nameNorm = normalizeVN(p.student.hoTen);
        const nickNorm = p.student.tenGoi ? normalizeVN(p.student.tenGoi) : "";
        const reasonNorm = normalizeVN(p.lyDo);
        const noteNorm = p.ghiChu ? normalizeVN(p.ghiChu) : "";
        return nameNorm.includes(q) || nickNorm.includes(q) || reasonNorm.includes(q) || noteNorm.includes(q);
      });
    }

    return list.sort((a, b) => {
      const countA = violationCounts[a.studentId] || 0;
      const countB = violationCounts[b.studentId] || 0;
      const isWarnA = countA >= 3;
      const isWarnB = countB >= 3;

      // 1. Học sinh có vi phạm >= 3 lần được ĐẨY LÊN NẰM ĐẦU DANH SÁCH
      if (isWarnA && !isWarnB) return -1;
      if (!isWarnA && isWarnB) return 1;

      // 2. Cùng nhóm >= 3 thì sắp theo số lần vi phạm giảm dần
      if (countA !== countB) return countB - countA;

      // 3. Sắp theo ngày vi phạm mới nhất
      return new Date(b.ngay).getTime() - new Date(a.ngay).getTime();
    });
  }, [penalties, violationCounts, penaltyFilterStatus, penaltySearchQuery]);

  // Thống kê nhanh cho sổ kỷ luật
  const penaltyWarnCount = useMemo(() => {
    const studentIds = new Set(penalties.map((p) => p.studentId));
    let count = 0;
    studentIds.forEach((sId) => {
      if ((violationCounts[sId] || 0) >= 3) count++;
    });
    return count;
  }, [penalties, violationCounts]);

  const penaltyPendingCount = useMemo(() => {
    return penalties.filter((p) => p.trangThai === "Chưa quét").length;
  }, [penalties]);

  const penaltyCompletedCount = useMemo(() => {
    return penalties.filter((p) => p.trangThai === "Đã hoàn thành").length;
  }, [penalties]);

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
            <Sparkles size={14} /> Tự động xếp lịch (Tổ)
          </button>

          <button
            className="btn btn-sm"
            onClick={() => {
              setPairStudentId1("");
              setPairStudentId2("");
              setPairSearch1("");
              setPairSearch2("");
              setClearPreviousPair(true);
              setWeekPairModalOpen(true);
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
            <Users size={14} /> Phân 2 bạn trực cả tuần
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

      {/* ====== DANH SÁCH VI PHẠM & PHẠT QUÉT LỚP ====== */}
      <div
        className="card"
        style={{
          marginTop: 26,
          padding: "22px 24px",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          borderRadius: 16,
        }}
      >
        {/* Section Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  background: "#fee2e2",
                  color: "#b91c1c",
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  border: "1px solid #fecaca",
                }}
              >
                <AlertTriangle size={13} /> SỔ KỶ LUẬT & PHẠT QUÉT LỚP
              </span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                Danh Sách Vi Phạm & Phạt Quét Lớp
              </h2>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
              Ghi nhận các trường hợp vi phạm kỷ luật của lớp. Những học sinh có tên từ{" "}
              <strong style={{ color: "#dc2626" }}>3 lần trở lên</strong> sẽ được{" "}
              <strong style={{ color: "#dc2626" }}>highlight màu đỏ nhạt</strong> và{" "}
              <strong style={{ color: "#dc2626" }}>tự động đưa lên nằm đầu danh sách</strong> để ưu tiên phân công trực nhật phạt quét lớp.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setPenaltyStudentId("");
                setPenaltyLyDo("");
                setPenaltyGhiChu("");
                setPenaltyNgay(new Date().toISOString().split("T")[0]);
                setPenaltyStudentSearch("");
                setPenaltyStudentToFilter("ALL");
                setPenaltyModalOpen(true);
              }}
              style={{
                background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
                border: "none",
                fontWeight: 600,
                boxShadow: "0 2px 8px rgba(239, 68, 68, 0.25)",
              }}
            >
              <Plus size={14} /> Ghi nhận vi phạm mới
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--bg-muted)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Tổng lượt vi phạm
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text-primary)", marginTop: 2 }}>
              {penalties.length}
            </div>
          </div>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fef2f2",
              border: "1.5px solid #fca5a5",
              boxShadow: penaltyWarnCount > 0 ? "0 2px 8px rgba(239, 68, 68, 0.12)" : "none",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#991b1b", fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
              <Flame size={12} color="#dc2626" /> Cảnh cáo 3+ lần (Đầu DS)
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#dc2626", marginTop: 2 }}>
              {penaltyWarnCount} <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>bạn</span>
            </div>
          </div>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fffbeb",
              border: "1px solid #fef3c7",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#92400e", fontWeight: 700, textTransform: "uppercase" }}>
              Chưa hoàn thành phạt
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#d97706", marginTop: 2 }}>
              {penaltyPendingCount}
            </div>
          </div>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
              Đã quét xong
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#16a34a", marginTop: 2 }}>
              {penaltyCompletedCount}
            </div>
          </div>
        </div>

        {/* Filter Toolbar: Filter Pills & Search */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            paddingBottom: 16,
            borderBottom: "1px solid var(--border)",
            marginBottom: 16,
          }}
        >
          {/* Status Pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              className="btn btn-sm"
              onClick={() => setPenaltyFilterStatus("ALL")}
              style={{
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: "0.78rem",
                fontWeight: 700,
                background: penaltyFilterStatus === "ALL" ? "var(--primary)" : "var(--bg-muted)",
                color: penaltyFilterStatus === "ALL" ? "white" : "var(--text-secondary)",
                border: "1px solid " + (penaltyFilterStatus === "ALL" ? "var(--primary)" : "var(--border)"),
              }}
            >
              Tất cả ({penalties.length})
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setPenaltyFilterStatus("WARN_3")}
              style={{
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: "0.78rem",
                fontWeight: 700,
                background: penaltyFilterStatus === "WARN_3" ? "#dc2626" : "#fef2f2",
                color: penaltyFilterStatus === "WARN_3" ? "white" : "#991b1b",
                border: "1px solid " + (penaltyFilterStatus === "WARN_3" ? "#dc2626" : "#fecaca"),
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Flame size={12} /> 🚨 Vi phạm 3+ lần ({penaltyWarnCount})
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setPenaltyFilterStatus("Chưa quét")}
              style={{
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: "0.78rem",
                fontWeight: 700,
                background: penaltyFilterStatus === "Chưa quét" ? "#d97706" : "#fffbeb",
                color: penaltyFilterStatus === "Chưa quét" ? "white" : "#92400e",
                border: "1px solid " + (penaltyFilterStatus === "Chưa quét" ? "#d97706" : "#fef3c7"),
              }}
            >
              Chưa quét ({penaltyPendingCount})
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setPenaltyFilterStatus("Đã hoàn thành")}
              style={{
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: "0.78rem",
                fontWeight: 700,
                background: penaltyFilterStatus === "Đã hoàn thành" ? "#16a34a" : "#f0fdf4",
                color: penaltyFilterStatus === "Đã hoàn thành" ? "white" : "#166534",
                border: "1px solid " + (penaltyFilterStatus === "Đã hoàn thành" ? "#16a34a" : "#bbf7d0"),
              }}
            >
              Đã xong ({penaltyCompletedCount})
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: "relative", minWidth: 220, flex: 1, maxWidth: 320 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: 30, minHeight: 34, fontSize: "0.82rem" }}
              placeholder="Tìm theo tên học sinh, lý do..."
              value={penaltySearchQuery}
              onChange={(e) => setPenaltySearchQuery(e.target.value)}
            />
            {penaltySearchQuery && (
              <button
                onClick={() => setPenaltySearchQuery("")}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Penalty Cards List */}
        {sortedPenalties.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--text-muted)", fontSize: "0.88rem" }}>
            {penalties.length === 0 ? (
              <div>
                <CheckCircle size={36} color="#16a34a" style={{ margin: "0 auto 10px", display: "block" }} />
                <p style={{ fontWeight: 700, margin: "0 0 4px", color: "var(--text-primary)" }}>
                  Chưa có ghi nhận vi phạm nào!
                </p>
                <p style={{ fontSize: "0.8rem", margin: 0 }}>Lớp học đang duy trì nề nếp và vệ sinh rất tốt 🎉</p>
              </div>
            ) : (
              <div>
                <Info size={32} style={{ margin: "0 auto 8px", display: "block" }} />
                <p style={{ margin: 0 }}>Không tìm thấy trường hợp vi phạm nào khớp với điều kiện lọc.</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sortedPenalties.map((item) => {
              const violationCount = violationCounts[item.studentId] || 1;
              const isWarning = violationCount >= 3;
              const isPending = item.trangThai === "Chưa quét";

              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 14,
                    padding: "14px 16px",
                    background: isWarning ? "#fef2f2" : "var(--bg-page)",
                    border: isWarning ? "1.5px solid #fca5a5" : "1px solid var(--border)",
                    boxShadow: isWarning ? "0 4px 16px rgba(239, 68, 68, 0.12)" : "none",
                    transition: "all 0.2s ease",
                    position: "relative",
                  }}
                >
                  {/* Top Warning Banner for >= 3 Violations */}
                  {isWarning && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: 10,
                        paddingBottom: 8,
                        borderBottom: "1px dashed #fca5a5",
                      }}
                    >
                      <span
                        style={{
                          background: "#dc2626",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          letterSpacing: "0.3px",
                        }}
                      >
                        <Flame size={12} /> 🚨 ĐÃ CÓ TÊN {violationCount} LẦN TRONG DANH SÁCH (ƯU TIÊN ĐẨY LÊN ĐẦU)
                      </span>
                      <span style={{ fontSize: "0.74rem", color: "#991b1b", fontWeight: 600 }}>
                        Ưu tiên phạt trực nhật cả tuần để rèn luyện nề nếp
                      </span>
                    </div>
                  )}

                  {/* Main Card Content */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    {/* Left: Student & Reason Info */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 260, flex: 1 }}>
                      {/* Avatar / Initials Circle */}
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          background: isWarning ? "#fee2e2" : "var(--primary-light)",
                          border: isWarning ? "2px solid #dc2626" : "1px solid var(--border)",
                          color: isWarning ? "#991b1b" : "var(--primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.95rem",
                          flexShrink: 0,
                        }}
                      >
                        {item.student.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.student.avatar}
                            alt={item.student.hoTen}
                            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                          />
                        ) : (
                          item.student.hoTen.charAt(0)
                        )}
                      </div>

                      {/* Details */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: "0.95rem",
                              color: isWarning ? "#991b1b" : "var(--text-primary)",
                            }}
                          >
                            {item.student.hoTen}
                          </span>
                          {item.student.tenGoi && (
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                              ({item.student.tenGoi})
                            </span>
                          )}
                          <span
                            style={{
                              background: "var(--bg-muted)",
                              border: "1px solid var(--border)",
                              padding: "1px 7px",
                              borderRadius: 6,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: "var(--text-secondary)",
                            }}
                          >
                            Tổ {item.student.to} • Lớp {item.student.lop}
                          </span>
                          {!isWarning && (
                            <span
                              style={{
                                background: "#fff1f2",
                                color: "#e11d48",
                                border: "1px solid #ffe4e6",
                                padding: "1px 7px",
                                borderRadius: 10,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                              }}
                            >
                              Vi phạm lần {violationCount}
                            </span>
                          )}
                        </div>

                        {/* Violation Reason */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: "0.85rem", marginTop: 4 }}>
                          <span style={{ fontWeight: 700, color: isWarning ? "#7f1d1d" : "var(--danger)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <AlertCircle size={13} /> Lỗi vi phạm: {item.lyDo}
                          </span>
                        </div>

                        {/* Date & Ghi chú */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 4 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Clock size={12} /> {new Date(item.ngay).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </span>
                          {item.ghiChu && (
                            <span style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>
                              Ghi chú: {item.ghiChu}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Pill & Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        alignSelf: "center",
                      }}
                    >
                      {/* Status Tag */}
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 12,
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          background: isPending ? "#fffbeb" : "#dcfce7",
                          color: isPending ? "#b45309" : "#15803d",
                          border: `1px solid ${isPending ? "#fde68a" : "#86efac"}`,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {isPending ? "⏳ Chưa quét" : "✅ Đã hoàn thành"}
                      </span>

                      {/* Action: Toggle Status */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleTogglePenaltyStatus(item)}
                        style={{
                          padding: "5px 9px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          borderColor: isPending ? "#86efac" : "var(--border)",
                          color: isPending ? "#15803d" : "var(--text-secondary)",
                        }}
                        title={isPending ? "Đánh dấu bạn này đã quét lớp xong" : "Đổi lại trạng thái chưa quét"}
                      >
                        <CheckSquare size={13} /> {isPending ? "Đã quét" : "Chưa quét"}
                      </button>

                      {/* Action: Quick Assign to Week Duty */}
                      <button
                        className="btn btn-sm"
                        onClick={() => handleOpenWeekPairForStudent(item.studentId)}
                        style={{
                          padding: "5px 10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: isWarning ? "#dc2626" : "#059669",
                          color: "white",
                          border: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                        }}
                        title="Phân bạn này trực nhật nguyên tuần để phạt"
                      >
                        <Users size={13} /> Phân trực tuần
                      </button>

                      {/* Action: Delete Penalty */}
                      <button
                        onClick={() => handleDeletePenalty(item.id, item.student.hoTen)}
                        style={{
                          background: "var(--danger-light)",
                          border: "none",
                          cursor: "pointer",
                          padding: "7px 9px",
                          borderRadius: 8,
                          color: "var(--danger)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Xóa bản ghi vi phạm này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkles size={14} color="var(--primary)" /> Dự kiến phân bổ:
                  </span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#16a34a" }}>
                    {autoPreviewPlan.eligibleStudents.length} bạn trực • {autoPreviewPlan.exemptedStudents.length} bạn miễn
                  </span>
                </div>

                {autoPreviewPlan.exemptedStudents.length > 0 && (
                  <div
                    style={{
                      marginBottom: 10,
                      padding: "6px 10px",
                      background: "#fff1f2",
                      border: "1px solid #ffe4e6",
                      borderRadius: 6,
                      color: "#9f1239",
                      fontSize: "0.75rem",
                      lineHeight: 1.4,
                    }}
                  >
                    <strong>🛡️ Miễn trực ({autoPreviewPlan.exemptedStudents.length}):</strong>{" "}
                    {autoPreviewPlan.exemptedStudents.map((e) => `${e.hoTen} (${e.reason.replace(" (Miễn trực)", "").replace(" (Miễn trực nhật)", "")})`).join(", ")}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, textAlign: "center" }}>
                  {DUTY_WEEKDAYS.map((day) => {
                    const count = autoPreviewPlan.dailyCounts[day] || 0;
                    return (
                      <div
                        key={day}
                        style={{
                          background: "white",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "6px 4px",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "0.74rem", color: "var(--text-secondary)" }}>{day}</div>
                        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--primary)", marginTop: 2 }}>
                          {count} <span style={{ fontSize: "0.68rem", fontWeight: 500 }}>HS</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 10px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 6,
                    color: "#166534",
                    fontSize: "0.74rem",
                    lineHeight: 1.45,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <Sparkles size={14} style={{ flexShrink: 0, marginTop: 2, color: "#16a34a" }} />
                  <div>
                    <strong>Cơ chế bù ca công bằng:</strong> Hệ thống tự động truy vết lịch sử từ các tuần trước. Bạn nào đã trực ít hơn sẽ được ưu tiên xếp 2 ca trong tuần này để bù đủ, đảm bảo tổng số ca trực quanh năm luôn cân bằng tuyệt đối giữa các bạn!
                  </div>
                </div>
              </div>

              <div style={{ background: "var(--bg-muted)", padding: "12px 14px", borderRadius: 8 }}>
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

            <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAutoModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1.6 }} onClick={handleAutoAssign} disabled={saving}>
                {saving ? "Đang xử lý..." : <><Sparkles size={15} /> Khởi tạo lịch tuần</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ====== ADD / EDIT SINGLE ENTRY MODAL ====== */}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
                {editingItem ? "Chỉnh sửa phân công trực nhật" : "Thêm phân công trực nhật"}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={20} color="var(--text-muted)" />
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className="label" style={{ margin: 0 }}>Chọn học sinh trực nhật *</label>
                  {selectedStudentObj && (
                    <span style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle size={13} /> {selectedStudentObj.hoTen} (Tổ {selectedStudentObj.to})
                    </span>
                  )}
                </div>

                {/* Ô tìm kiếm tên học sinh */}
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="🔍 Gõ tìm tên học sinh (ví dụ: An, Duy, Linh, Tổ 1...)"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    style={{
                      paddingLeft: 36,
                      paddingRight: studentSearchQuery ? 34 : 12,
                      borderRadius: 10,
                      fontSize: "0.88rem",
                      background: "var(--bg-muted)",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
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

                {/* Danh sách học sinh cuộn mượt mà */}
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
                      const toColors: Record<number, { bg: string; text: string; border: string }> = {
                        1: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
                        2: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
                        3: { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
                        4: { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
                      };
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

      {/* ====== MODAL PHÂN 2 BẠN TRỰC CẢ TUẦN ====== */}
      {weekPairModalOpen && typeof document !== "undefined" && createPortal(
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
          onClick={() => setWeekPairModalOpen(false)}
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
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ecfdf5", color: "#065f46", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, marginBottom: 6 }}>
                  <Users size={13} /> PHÂN CẶP TRỰC NHẬT
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                  Phân 2 Bạn Trực Cả Tuần (Thứ 2 → Thứ 6)
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Áp dụng cho <strong>Tuần {currentWeek}</strong> — Lớp {currentDisplayClass}
                </p>
              </div>
              <button
                onClick={() => setWeekPairModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Clear previous checkbox */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: 16,
                padding: "8px 12px",
                background: "var(--bg-muted)",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={clearPreviousPair}
                onChange={(e) => setClearPreviousPair(e.target.checked)}
                style={{ accentColor: "var(--primary)" }}
              />
              <span>Dọn dẹp/xóa lịch cũ của tuần này trước khi phân công</span>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 16 }}>
              {/* Slot 1: Bạn thứ nhất */}
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", background: "#f8fafc" }}>
                <div style={{ fontWeight: 800, fontSize: "0.86rem", color: "var(--primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <UserCheck size={15} /> Bạn thứ nhất (HS 1)
                </div>

                {pairStudentObj1 ? (
                  <div style={{ padding: "8px 10px", background: "white", borderRadius: 8, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                        {pairStudentObj1.hoTen}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Tổ {pairStudentObj1.to} • Lớp {pairStudentObj1.lop}
                      </div>
                    </div>
                    <button
                      onClick={() => setPairStudentId1("")}
                      style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}
                    >
                      Đổi bạn khác
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ position: "relative", marginBottom: 6 }}>
                      <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                      <input
                        type="text"
                        className="input"
                        placeholder="Tìm tên HS 1..."
                        style={{ paddingLeft: 26, minHeight: 32, fontSize: "0.8rem" }}
                        value={pairSearch1}
                        onChange={(e) => setPairSearch1(e.target.value)}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
                      {(["ALL", 1, 2, 3, 4] as const).map((to) => (
                        <button
                          key={String(to)}
                          type="button"
                          onClick={() => setPairToFilter1(to)}
                          style={{
                            padding: "2px 7px",
                            fontSize: "0.68rem",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: pairToFilter1 === to ? "var(--primary)" : "white",
                            color: pairToFilter1 === to ? "white" : "var(--text-secondary)",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          {to === "ALL" ? "Tất cả" : `T${to}`}
                        </button>
                      ))}
                    </div>
                    <div style={{ maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                      {filteredPairStudents1.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setPairStudentId1(s.id)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 6,
                            background: "white",
                            border: "1px solid var(--border)",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{s.hoTen}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Tổ {s.to}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Slot 2: Bạn thứ hai */}
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", background: "#f8fafc" }}>
                <div style={{ fontWeight: 800, fontSize: "0.86rem", color: "#059669", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <UserCheck size={15} /> Bạn thứ hai (HS 2)
                </div>

                {pairStudentObj2 ? (
                  <div style={{ padding: "8px 10px", background: "white", borderRadius: 8, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                        {pairStudentObj2.hoTen}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Tổ {pairStudentObj2.to} • Lớp {pairStudentObj2.lop}
                      </div>
                    </div>
                    <button
                      onClick={() => setPairStudentId2("")}
                      style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}
                    >
                      Đổi bạn khác
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ position: "relative", marginBottom: 6 }}>
                      <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                      <input
                        type="text"
                        className="input"
                        placeholder="Tìm tên HS 2..."
                        style={{ paddingLeft: 26, minHeight: 32, fontSize: "0.8rem" }}
                        value={pairSearch2}
                        onChange={(e) => setPairSearch2(e.target.value)}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
                      {(["ALL", 1, 2, 3, 4] as const).map((to) => (
                        <button
                          key={String(to)}
                          type="button"
                          onClick={() => setPairToFilter2(to)}
                          style={{
                            padding: "2px 7px",
                            fontSize: "0.68rem",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: pairToFilter2 === to ? "var(--primary)" : "white",
                            color: pairToFilter2 === to ? "white" : "var(--text-secondary)",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          {to === "ALL" ? "Tất cả" : `T${to}`}
                        </button>
                      ))}
                    </div>
                    <div style={{ maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                      {filteredPairStudents2.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setPairStudentId2(s.id)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 6,
                            background: "white",
                            border: "1px solid var(--border)",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{s.hoTen}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Tổ {s.to}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Banner */}
            {pairStudentObj1 && pairStudentObj2 && (
              <div
                style={{
                  padding: "12px 14px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 10,
                  fontSize: "0.82rem",
                  color: "#166534",
                  marginBottom: 16,
                  lineHeight: 1.5,
                }}
              >
                ✨ <strong>Xác nhận:</strong> Hai bạn <strong>{pairStudentObj1.hoTen}</strong> và <strong>{pairStudentObj2.hoTen}</strong> sẽ được phân công trực nhật toàn bộ 5 ngày từ <strong>Thứ 2 đến Thứ 6</strong> của tuần <strong>{currentWeek}</strong>.
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setWeekPairModalOpen(false)}>
                Hủy
              </button>
              <button
                className="btn btn-primary"
                style={{
                  flex: 1.8,
                  background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                  border: "none",
                }}
                onClick={handleSaveWeekPair}
                disabled={pairSaving || !pairStudentId1 || !pairStudentId2}
              >
                {pairSaving ? "Đang phân công..." : <><Users size={15} /> Xác nhận phân trực cả tuần</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ====== MODAL GHI NHẬN VI PHẠM & PHẠT QUÉT LỚP ====== */}
      {penaltyModalOpen && typeof document !== "undefined" && createPortal(
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
          onClick={() => setPenaltyModalOpen(false)}
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
              maxWidth: 520,
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fee2e2", color: "#b91c1c", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, marginBottom: 6 }}>
                  <AlertTriangle size={13} /> SỔ KỶ LUẬT LỚP HỌC
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                  Ghi Nhận Vi Phạm & Phạt Quét Lớp
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Theo dõi vi phạm để xếp lịch vệ sinh phòng học rèn luyện nề nếp
                </p>
              </div>
              <button
                onClick={() => setPenaltyModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Select Student */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
                Học sinh vi phạm <span style={{ color: "var(--danger)" }}>*</span>
              </label>

              {penaltySelectedStudent ? (
                <div
                  style={{
                    padding: "10px 14px",
                    background: (violationCounts[penaltySelectedStudent.id] || 0) >= 2 ? "#fef2f2" : "#f8fafc",
                    border: (violationCounts[penaltySelectedStudent.id] || 0) >= 2 ? "1.5px solid #fca5a5" : "1px solid var(--border)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                      {penaltySelectedStudent.hoTen}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                      Tổ {penaltySelectedStudent.to} • Lớp {penaltySelectedStudent.lop}
                      {" • "}
                      <strong style={{ color: (violationCounts[penaltySelectedStudent.id] || 0) >= 2 ? "#dc2626" : "var(--text-secondary)" }}>
                        Hiện đã có {violationCounts[penaltySelectedStudent.id] || 0} lần vi phạm
                      </strong>
                    </div>
                  </div>
                  <button
                    onClick={() => setPenaltyStudentId("")}
                    style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}
                  >
                    Đổi học sinh
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ position: "relative", marginBottom: 6 }}>
                    <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      type="text"
                      className="input"
                      placeholder="Gõ tìm kiếm tên học sinh..."
                      style={{ paddingLeft: 28, minHeight: 34, fontSize: "0.82rem" }}
                      value={penaltyStudentSearch}
                      onChange={(e) => setPenaltyStudentSearch(e.target.value)}
                    />
                  </div>
                  <div style={{ maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, border: "1px solid var(--border)", borderRadius: 8, padding: 6 }}>
                    {filteredPenaltyModalStudents.map((s) => {
                      const count = violationCounts[s.id] || 0;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setPenaltyStudentId(s.id)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            background: "white",
                            cursor: "pointer",
                            fontSize: "0.82rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            border: "1px solid transparent",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                        >
                          <span style={{ fontWeight: 600 }}>{s.hoTen}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Tổ {s.to}</span>
                            {count > 0 && (
                              <span
                                style={{
                                  background: count >= 2 ? "#fee2e2" : "var(--bg-muted)",
                                  color: count >= 2 ? "#dc2626" : "var(--text-secondary)",
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  padding: "1px 6px",
                                  borderRadius: 8,
                                }}
                              >
                                {count} lần vi phạm
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Warning if student already has >= 2 violations */}
              {penaltySelectedStudent && (violationCounts[penaltySelectedStudent.id] || 0) >= 2 && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    color: "#991b1b",
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Flame size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Cảnh báo quan trọng:</strong> Học sinh này hiện đã có <strong>{violationCounts[penaltySelectedStudent.id]} lần vi phạm</strong>. Khi thêm lần này, bạn sẽ đạt <strong>{ (violationCounts[penaltySelectedStudent.id] || 0) + 1 } lần (≥ 3 lần)</strong> và tự động được <strong>highlight màu đỏ nhạt</strong>, <strong>đưa lên đầu danh sách</strong>!
                  </span>
                </div>
              )}
            </div>

            {/* Violation Reason with Presets */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
                Lý do vi phạm <span style={{ color: "var(--danger)" }}>*</span>
              </label>

              {/* Quick Preset Chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {[
                  "Đi trễ",
                  "Nói chuyện trong giờ",
                  "Không làm BTVN",
                  "Vứt rác bừa bãi",
                  "Quên SGK/vở",
                  "Sử dụng ĐT trong lớp",
                  "Không trực nhật đúng ca",
                  "Mất trật tự",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setPenaltyLyDo(reason)}
                    style={{
                      padding: "4px 9px",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      borderRadius: 6,
                      border: penaltyLyDo === reason ? "1px solid var(--primary)" : "1px solid var(--border)",
                      background: penaltyLyDo === reason ? "var(--primary-light)" : "var(--bg-muted)",
                      color: penaltyLyDo === reason ? "var(--primary)" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <input
                type="text"
                className="input"
                placeholder="Nhập hoặc chọn lý do vi phạm phía trên..."
                value={penaltyLyDo}
                onChange={(e) => setPenaltyLyDo(e.target.value)}
              />
            </div>

            {/* Date & Note */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
                  Ngày vi phạm
                </label>
                <input
                  type="date"
                  className="input"
                  value={penaltyNgay}
                  onChange={(e) => setPenaltyNgay(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
                  Ghi chú thêm (Tùy chọn)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ví dụ: Tiết 2 môn Hóa..."
                  value={penaltyGhiChu}
                  onChange={(e) => setPenaltyGhiChu(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPenaltyModalOpen(false)}>
                Hủy
              </button>
              <button
                className="btn btn-primary"
                style={{
                  flex: 1.8,
                  background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
                  border: "none",
                }}
                onClick={handleSavePenalty}
                disabled={penaltySaving || !penaltyStudentId || !penaltyLyDo.trim()}
              >
                {penaltySaving ? "Đang lưu..." : <><Check size={15} /> Ghi nhận vi phạm</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
