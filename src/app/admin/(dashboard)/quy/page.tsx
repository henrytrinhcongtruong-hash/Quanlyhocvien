"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Wallet, TrendingUp, AlertCircle, Plus, Edit2, Trash2,
  Upload, Download, Search, CheckCircle, XCircle, Filter,
  DollarSign, ArrowUpRight, ArrowDownRight, Save, X, Settings2, Sparkles, School,
  ArrowUpDown, ArrowUpAZ, ArrowDownAZ,
} from "lucide-react";
import { formatVND, formatDate } from "@/lib/format";
import { compareVietnameseNames } from "@/lib/utils";

interface Student {
  id: number;
  hoTen: string;
  to: number;
  lop: string;
}

interface FeeRecord {
  id: number;
  studentId: number;
  kyThu: string;
  soTien: number;
  hinhThucDong: string;
  trangThai: string;
  ngayDong: string | null;
  ghiChu: string | null;
  student: Student;
}

interface ExpenseRecord {
  id: number;
  danhSachChi: string;
  hangMucChi: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  ngayChi: string;
  ghiChu: string | null;
}

interface FeeSummary {
  tongThu: number;
  tongChi: number;
  conLai: number;
  soHSDaDong: number;
  tongHS: number;
  chiTheoHangMuc?: { hangMucChi: string; total: number }[];
}

const HANG_MUC_CHI = [
  "Văn phòng phẩm",
  "Hoạt động trường",
  "Quà tặng",
  "Vệ sinh - Trang trí",
  "Học tập - Thi cử",
  "Đồng phục - Thể thao",
  "Khác",
];

export default function AdminQuyPage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const { data: session } = useSession();

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;
  const assignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";

  const [activeTab, setActiveTab] = useState<"thu" | "chi">("thu");
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [classList, setClassList] = useState<string[]>(["12T2", "11AT3"]);

  // Quick Amount Setup Input
  const [quickAmount, setQuickAmount] = useState("");
  const [quickKyThu, setQuickKyThu] = useState("HK1");

  // Filters for Receipts
  const [search, setSearch] = useState("");
  const [feeSortOrder, setFeeSortOrder] = useState<"default" | "asc" | "desc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("admin_fee_sort_order") as "default" | "asc" | "desc") || "default";
    }
    return "default";
  });

  const handleSetFeeSortOrder = (newOrder: "default" | "asc" | "desc") => {
    setFeeSortOrder(newOrder);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_fee_sort_order", newOrder);
    }
  };

  const [filterKyThu, setFilterKyThu] = useState("HK1");
  const [filterTrangThai, setFilterTrangThai] = useState("ALL");
  const [filterLop, setFilterLop] = useState(() => {
    if (!isSuperAdmin && assignedLop) return assignedLop;
    return urlLop || "ALL";
  });

  // Filters for Expenses
  const [expenseSearch, setExpenseSearch] = useState("");
  const [filterHangMuc, setFilterHangMuc] = useState("ALL");

  // Single Student Fee Edit Modal
  const [editingSingleFee, setEditingSingleFee] = useState<FeeRecord | null>(null);
  const [singleAmount, setSingleAmount] = useState("");
  const [singleNote, setSingleNote] = useState("");

  // Batch Fee Setup Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({
    lop: isSuperAdmin ? (urlLop || "12T2") : assignedLop,
    kyThu: "HK1",
    soTien: "50000",
    ghiChu: "Thu quỹ học kỳ 1",
  });

  // Modal State for Expense
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [expForm, setExpForm] = useState({
    danhSachChi: "",
    hangMucChi: "Văn phòng phẩm",
    soLuong: "1",
    donGia: "",
    ngayChi: new Date().toISOString().split("T")[0],
    ghiChu: "",
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Sync with URL query parameter or assignedLop
  useEffect(() => {
    if (!isSuperAdmin && assignedLop) {
      setFilterLop(assignedLop);
      setBatchForm((f) => ({ ...f, lop: assignedLop }));
      return;
    }
    if (urlLop) {
      setFilterLop(urlLop);
      setBatchForm((f) => ({ ...f, lop: urlLop === "ALL" ? "11AT3" : urlLop }));
    }
  }, [urlLop, isSuperAdmin, assignedLop]);

  const currentDisplayClass = isSuperAdmin
    ? (filterLop !== "ALL" ? filterLop : "11AT3")
    : assignedLop;

  // Load ALL data in parallel (classes + summary + students + fees + expenses)
  const loadData = async () => {
    setLoading(true);
    try {
      const activeClassForQuery = isSuperAdmin ? filterLop : assignedLop;
      const summaryParams = activeClassForQuery !== "ALL" ? `?lop=${activeClassForQuery}` : "";
      const feeParams = new URLSearchParams();
      if (filterKyThu) feeParams.set("kyThu", filterKyThu);
      if (activeClassForQuery && activeClassForQuery !== "ALL") feeParams.set("lop", activeClassForQuery);

      const [sumRes, stdRes, feeRes, expRes, classRes] = await Promise.all([
        fetch(`/api/fees/summary${summaryParams}`),
        fetch(`/api/students${activeClassForQuery !== "ALL" ? `?lop=${activeClassForQuery}` : ""}`),
        fetch(`/api/fees?${feeParams.toString()}`),
        fetch("/api/expenses"),
        fetch("/api/classes"),
      ]);

      const [sumData, stdData, feeData, expData, classData] = await Promise.all([
        sumRes.json(), stdRes.json(), feeRes.json(), expRes.json(), classRes.json(),
      ]);

      setSummary(sumData);
      setStudents(stdData.data || []);
      setFees(feeData.data || []);
      setExpenses(expData.data || []);
      if (classData.data && classData.data.length > 0) {
        setClassList(classData.data);
        if (isSuperAdmin && !urlLop) {
          setBatchForm((f) => ({ ...f, lop: classData.data[0] }));
        }
      }
    } catch {
      showToast("Lỗi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKyThu, filterLop]);

  // Quick Apply Amount from Dedicated Input Bar
  async function handleQuickApplyAmount() {
    const targetLop = isSuperAdmin ? (filterLop !== "ALL" ? filterLop : "11AT3") : assignedLop;
    if (!quickAmount.trim()) {
      showToast("Vui lòng nhập số tiền cần thu (ví dụ: 50k, 50000, 300.000đ)", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/fees/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lop: targetLop,
          kyThu: quickKyThu || filterKyThu,
          soTien: quickAmount.trim(),
          ghiChu: `Thu quỹ ${quickKyThu || filterKyThu}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Đã thiết lập mức thu ${formatVND(data.soTien)} cho toàn bộ ${data.count} học sinh Lớp ${targetLop}!`);
        setQuickAmount("");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Lỗi thiết lập mức thu", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra", "error");
    } finally {
      setSaving(false);
    }
  }

  // Quick toggle status for fee
  async function handleToggleFeeStatus(fee: FeeRecord) {
    const isCurrentlyPaid = fee.trangThai === "Đã Đóng";
    const nextStatus = isCurrentlyPaid ? "Chưa Đóng" : "Đã Đóng";
    const nextDate = isCurrentlyPaid ? null : new Date().toISOString();

    const res = await fetch("/api/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: fee.studentId,
        kyThu: fee.kyThu,
        soTien: fee.soTien,
        hinhThucDong: fee.hinhThucDong,
        trangThai: nextStatus,
        ngayDong: nextDate,
      }),
    });

    if (res.ok) {
      showToast(`Đã chuyển sang: ${nextStatus}`);
      loadData();
    } else {
      showToast("Cập nhật thất bại", "error");
    }
  }

  // Handle Save Single Student Fee
  async function handleSaveSingleFee() {
    if (!editingSingleFee) return;
    setSaving(true);
    const res = await fetch("/api/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: editingSingleFee.studentId,
        kyThu: editingSingleFee.kyThu,
        soTien: singleAmount.trim(),
        hinhThucDong: editingSingleFee.hinhThucDong,
        trangThai: editingSingleFee.trangThai,
        ghiChu: singleNote.trim(),
      }),
    });
    if (res.ok) {
      showToast(`Đã cập nhật mức thu cho ${editingSingleFee.student.hoTen}`);
      setEditingSingleFee(null);
      loadData();
    } else {
      showToast("Lỗi cập nhật", "error");
    }
    setSaving(false);
  }

  // Handle Batch Fee Setup for Class from Modal
  async function handleSaveBatchFee() {
    if (!batchForm.lop || !batchForm.kyThu || !batchForm.soTien) {
      showToast("Vui lòng nhập đầy đủ thông tin hợp lệ", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/fees/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lop: batchForm.lop,
          kyThu: batchForm.kyThu,
          soTien: batchForm.soTien,
          ghiChu: batchForm.ghiChu.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Đã tạo đợt thu ${formatVND(data.soTien)} cho ${data.count} học sinh Lớp ${batchForm.lop}!`);
        setBatchModalOpen(false);
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Lỗi tạo đợt thu", "error");
      }
    } catch {
      showToast("Có lỗi xảy ra", "error");
    } finally {
      setSaving(false);
    }
  }

  // Save Expense
  async function handleSaveExpense() {
    if (!expForm.danhSachChi.trim() || !expForm.donGia) {
      showToast("Vui lòng điền đủ thông tin bắt buộc", "error");
      return;
    }
    setSaving(true);
    const body = {
      danhSachChi: expForm.danhSachChi.trim(),
      hangMucChi: expForm.hangMucChi,
      soLuong: Number(expForm.soLuong) || 1,
      donGia: Number(expForm.donGia),
      ngayChi: expForm.ngayChi,
      ghiChu: expForm.ghiChu.trim(),
    };

    const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
    const method = editingExpense ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showToast(editingExpense ? "Đã cập nhật khoản chi" : "Đã thêm khoản chi");
      setExpenseModalOpen(false);
      setEditingExpense(null);
      loadData();
    } else {
      showToast("Có lỗi xảy ra", "error");
    }
    setSaving(false);
  }

  // Delete Expense
  async function handleDeleteExpense(id: number) {
    if (!confirm("Bạn có chắc muốn xóa khoản chi này?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Đã xóa khoản chi");
      loadData();
    } else {
      showToast("Xóa thất bại", "error");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/fees/import", { method: "POST", body: formData });
    if (res.ok) {
      const d = await res.json();
      showToast(`Đã import ${d.feeCount} khoản thu, ${d.expenseCount} khoản chi`);
      loadData();
    } else {
      showToast("Import thất bại", "error");
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const filteredFees = React.useMemo(() => {
    let list = fees.filter(f => {
      const matchSearch = !search || f.student.hoTen.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterTrangThai === "ALL" || f.trangThai === filterTrangThai;
      const matchLop = isSuperAdmin
        ? (filterLop === "ALL" || f.student.lop === filterLop)
        : f.student.lop === assignedLop;
      return matchSearch && matchStatus && matchLop;
    });

    if (feeSortOrder !== "default") {
      list = [...list].sort((a, b) => compareVietnameseNames(a.student.hoTen, b.student.hoTen, feeSortOrder));
    }
    return list;
  }, [fees, search, filterTrangThai, filterLop, isSuperAdmin, assignedLop, feeSortOrder]);

  const filteredExpenses = expenses.filter(e => {
    const matchSearch = !expenseSearch || e.danhSachChi.toLowerCase().includes(expenseSearch.toLowerCase());
    const matchHangMuc = filterHangMuc === "ALL" || e.hangMucChi === filterHangMuc;
    return matchSearch && matchHangMuc;
  });

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
            Quản lý thu chi quỹ — Lớp {currentDisplayClass}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Thiết lập mức thu theo từng lớp, theo dõi đóng tiền và quản lý chi tiêu
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setBatchModalOpen(true)}
            style={{ background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(260,80%,58%) 100%)" }}
          >
            <Settings2 size={14} /> Thiết lập đợt thu quỹ theo lớp
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: "none" }} />
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload size={14} />
            {importing ? "Đang import..." : "Import Excel"}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.open("/api/fees/export", "_blank")}>
            <Download size={14} /> Export Báo cáo quỹ
          </button>
          {activeTab === "chi" && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingExpense(null);
                setExpForm({
                  danhSachChi: "",
                  hangMucChi: "Văn phòng phẩm",
                  soLuong: "1",
                  donGia: "",
                  ngayChi: new Date().toISOString().split("T")[0],
                  ghiChu: "",
                });
                setExpenseModalOpen(true);
              }}
            >
              <Plus size={14} /> Thêm khoản chi
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="kpi-number" style={{ color: "var(--success)" }}>
                  {formatVND(summary.tongThu)}
                </div>
                <div className="kpi-label">Tổng quỹ đã thu ({currentDisplayClass})</div>
              </div>
              <ArrowDownRight size={26} color="var(--success)" opacity={0.7} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 }}>
              {summary.soHSDaDong} / {summary.tongHS} học sinh đã đóng
            </div>
          </div>

          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="kpi-number" style={{ color: "var(--danger)" }}>
                  {formatVND(summary.tongChi)}
                </div>
                <div className="kpi-label">Tổng đã chi tiêu</div>
              </div>
              <ArrowUpRight size={26} color="var(--danger)" opacity={0.7} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 }}>
              {summary.chiTheoHangMuc?.length || 0} hạng mục chi
            </div>
          </div>

          <div className="card" style={{ padding: "18px 20px", background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(213,80%,58%) 100%)", border: "none" }}>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
              Số dư quỹ hiện tại ({currentDisplayClass})
            </div>
            <div style={{ color: "white", fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>
              {formatVND(summary.conLai)}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: "2px solid var(--border)", marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab("thu")}
          style={{
            padding: "10px 18px", border: "none", background: "none", cursor: "pointer",
            fontWeight: 700, fontSize: "0.9rem",
            color: activeTab === "thu" ? "var(--primary)" : "var(--text-secondary)",
            borderBottom: activeTab === "thu" ? "2px solid var(--primary)" : "2px solid transparent",
            marginBottom: -2,
          }}
        >
          Danh sách thu quỹ ({filteredFees.length})
        </button>
        <button
          onClick={() => setActiveTab("chi")}
          style={{
            padding: "10px 18px", border: "none", background: "none", cursor: "pointer",
            fontWeight: 700, fontSize: "0.9rem",
            color: activeTab === "chi" ? "var(--primary)" : "var(--text-secondary)",
            borderBottom: activeTab === "chi" ? "2px solid var(--primary)" : "2px solid transparent",
            marginBottom: -2,
          }}
        >
          Danh sách chi tiêu ({expenses.length})
        </button>
      </div>

      {/* TAB 1: THU QUỸ */}
      {activeTab === "thu" && (
        <div>
          {/* PERMANENT PROMINENT QUICK FEE SETTER PANEL */}
          <div
            className="card"
            style={{
              padding: "16px 20px",
              marginBottom: 18,
              background: "linear-gradient(135deg, hsl(213,94%,97%) 0%, hsl(260,80%,98%) 100%)",
              border: "1.5px solid hsl(213,85%,80%)",
              boxShadow: "0 2px 10px rgba(16,90,188,0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "var(--primary)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(16,90,188,0.3)",
                  }}
                >
                  <DollarSign size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.98rem", color: "var(--text-primary)" }}>
                    Thiết lập số tiền cần thu cho Lớp {currentDisplayClass}:
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Nhập số tiền (VD: <strong style={{ color: "var(--primary)" }}>50k</strong>, <strong style={{ color: "var(--primary)" }}>50.000</strong> hoặc <strong style={{ color: "var(--primary)" }}>350.000đ</strong>) rồi bấm lưu để áp dụng đồng loạt
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>Kỳ:</span>
                  <select
                    className="select"
                    style={{ minHeight: 38, width: 110, fontWeight: 700 }}
                    value={quickKyThu}
                    onChange={(e) => setQuickKyThu(e.target.value)}
                  >
                    <option value="HK1">Học kỳ 1</option>
                    <option value="HK2">Học kỳ 2</option>
                    <option value="Cả Năm">Cả Năm</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>Số tiền:</span>
                  <input
                    className="input"
                    style={{
                      width: 150,
                      minHeight: 38,
                      fontWeight: 800,
                      color: "var(--primary)",
                      fontSize: "0.95rem",
                      background: "white",
                      borderColor: "var(--primary)",
                    }}
                    placeholder="VD: 50k hoặc 50000"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickApplyAmount();
                    }}
                  />
                </div>

                <button
                  className="btn btn-primary"
                  style={{ minHeight: 38, padding: "0 18px", fontWeight: 700 }}
                  onClick={handleQuickApplyAmount}
                  disabled={saving || !quickAmount.trim()}
                >
                  <Sparkles size={14} />
                  {saving ? "Đang lưu..." : `Lưu mức thu (${quickAmount || "0đ"}) cho cả lớp`}
                </button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 200px" }}>
              <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                className="input"
                style={{ paddingLeft: 34 }}
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
            {isSuperAdmin && (
              <select
                className="select"
                style={{ width: 150, fontWeight: 700, color: "var(--primary)" }}
                value={filterLop}
                onChange={(e) => setFilterLop(e.target.value)}
              >
                <option value="ALL">🏫 Tất cả các lớp</option>
                {classList.map(c => (
                  <option key={c} value={c}>Lớp {c}</option>
                ))}
              </select>
            )}
            <select
              className="select"
              style={{ width: 130 }}
              value={filterKyThu}
              onChange={(e) => setFilterKyThu(e.target.value)}
            >
              <option value="HK1">Học kỳ 1</option>
              <option value="HK2">Học kỳ 2</option>
              <option value="Cả Năm">Cả Năm</option>
            </select>
            <select
              className="select"
              style={{ width: 140 }}
              value={filterTrangThai}
              onChange={(e) => setFilterTrangThai(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Đã Đóng">Đã Đóng</option>
              <option value="Chưa Đóng">Chưa Đóng</option>
            </select>

            {/* Nút Sort Tên A-Z / Z-A */}
            <button
              type="button"
              className={`btn btn-sm ${feeSortOrder !== "default" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                if (feeSortOrder === "default") handleSetFeeSortOrder("asc");
                else if (feeSortOrder === "asc") handleSetFeeSortOrder("desc");
                else handleSetFeeSortOrder("default");
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
              title="Bấm để đổi sắp xếp tên: A-Z -> Z-A -> Mặc định"
            >
              {feeSortOrder === "asc" ? (
                <>
                  <ArrowUpAZ size={15} /> Tên: A → Z
                </>
              ) : feeSortOrder === "desc" ? (
                <>
                  <ArrowDownAZ size={15} /> Tên: Z → A
                </>
              ) : (
                <>
                  <ArrowUpDown size={14} /> Sắp xếp tên
                </>
              )}
            </button>

            {(search || filterTrangThai !== "ALL" || (isSuperAdmin && filterLop !== "ALL") || feeSortOrder !== "default") && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setSearch(""); setFilterTrangThai("ALL"); if (isSuperAdmin) setFilterLop("ALL"); handleSetFeeSortOrder("default"); }}
              >
                <X size={13} /> Bỏ lọc
              </button>
            )}
          </div>

          {/* Table */}
          <div className="card" style={{ overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 32 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 42, marginBottom: 6, borderRadius: 6 }} />
                ))}
              </div>
            ) : filteredFees.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                <Wallet size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                <p>Chưa có dữ liệu thu quỹ cho lớp này</p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setBatchModalOpen(true)}
                  style={{ marginTop: 8 }}
                >
                  <Plus size={14} /> Thiết lập đợt thu quỹ ngay
                </button>
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
                          if (feeSortOrder === "default") handleSetFeeSortOrder("asc");
                          else if (feeSortOrder === "asc") handleSetFeeSortOrder("desc");
                          else handleSetFeeSortOrder("default");
                        }}
                        title="Bấm để đổi chiều sắp xếp tên: A-Z -> Z-A -> Mặc định"
                      >
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span>Họ và tên</span>
                          {feeSortOrder === "asc" ? (
                            <span className="badge badge-primary" style={{ padding: "1px 6px", fontSize: "0.7rem" }}>
                              <ArrowUpAZ size={12} /> A-Z
                            </span>
                          ) : feeSortOrder === "desc" ? (
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
                      <th>Kỳ thu</th>
                      <th>Số tiền</th>
                      <th>Hình thức</th>
                      <th>Ngày đóng</th>
                      <th style={{ textAlign: "center", width: 140 }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFees.map((f, idx) => {
                      const isPaid = f.trangThai === "Đã Đóng";
                      return (
                        <tr key={f.id}>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{f.student.hoTen}</td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                              {f.student.lop}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>Tổ {f.student.to}</span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{f.kyThu}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "0.95rem" }}>
                                {formatVND(f.soTien)}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingSingleFee(f);
                                  setSingleAmount(String(f.soTien));
                                  setSingleNote(f.ghiChu || "");
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "2px",
                                  color: "var(--text-muted)",
                                }}
                                title="Chỉnh sửa số tiền cho riêng học sinh này"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          </td>
                          <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{f.hinhThucDong}</td>
                          <td style={{ fontSize: "0.82rem" }}>{formatDate(f.ngayDong)}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => handleToggleFeeStatus(f)}
                              className={`badge ${isPaid ? "badge-success" : "badge-danger"}`}
                              style={{
                                cursor: "pointer", border: "none", padding: "5px 12px",
                                display: "inline-flex", alignItems: "center", gap: 4,
                              }}
                            >
                              {isPaid ? <CheckCircle size={12} /> : <XCircle size={12} />}
                              {f.trangThai}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CHI TIÊU */}
      {activeTab === "chi" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 220px" }}>
              <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                className="input"
                style={{ paddingLeft: 34 }}
                placeholder="Tìm khoản chi..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
              />
            </div>
            <select
              className="select"
              style={{ width: 180 }}
              value={filterHangMuc}
              onChange={(e) => setFilterHangMuc(e.target.value)}
            >
              <option value="ALL">Tất cả hạng mục</option>
              {HANG_MUC_CHI.map(hm => (
                <option key={hm} value={hm}>{hm}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="card" style={{ overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 32 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 42, marginBottom: 6, borderRadius: 6 }} />
                ))}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                <Wallet size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                <p>Chưa có khoản chi nào</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Danh sách chi</th>
                      <th>Hạng mục</th>
                      <th>Số lượng</th>
                      <th>Đơn giá</th>
                      <th>Thành tiền</th>
                      <th>Ngày chi</th>
                      <th style={{ width: 90 }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp, idx) => (
                      <tr key={exp.id}>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{exp.danhSachChi}</td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>{exp.hangMucChi}</span>
                        </td>
                        <td>{exp.soLuong}</td>
                        <td>{formatVND(exp.donGia)}</td>
                        <td style={{ fontWeight: 700, color: "var(--danger)" }}>{formatVND(exp.thanhTien)}</td>
                        <td style={{ fontSize: "0.85rem" }}>{formatDate(exp.ngayChi)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              onClick={() => {
                                setEditingExpense(exp);
                                setExpForm({
                                  danhSachChi: exp.danhSachChi,
                                  hangMucChi: exp.hangMucChi,
                                  soLuong: String(exp.soLuong),
                                  donGia: String(exp.donGia),
                                  ngayChi: new Date(exp.ngayChi).toISOString().split("T")[0],
                                  ghiChu: exp.ghiChu || "",
                                });
                                setExpenseModalOpen(true);
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: 4 }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== MODAL THIẾT LẬP ĐỢT THU QUỸ THEO LỚP ====== */}
      {batchModalOpen && typeof document !== "undefined" && createPortal(
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
          onClick={() => setBatchModalOpen(false)}
        >
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
              padding: "24px 26px",
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                  <Settings2 size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>Thiết lập mức thu quỹ lớp</h3>
              </div>
              <button onClick={() => setBatchModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4, display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                Nhập số tiền cần thu (VD: <strong>50k</strong>, <strong>50.000</strong>). Hệ thống sẽ tự động cập nhật danh sách cho tất cả học sinh trong lớp.
              </p>

              <div>
                <label className="label">Chọn Lớp cần áp dụng mức thu *</label>
                {isSuperAdmin ? (
                  <select
                    className="select"
                    value={batchForm.lop}
                    onChange={(e) => setBatchForm(f => ({ ...f, lop: e.target.value }))}
                  >
                    {classList.map(c => (
                      <option key={c} value={c}>Lớp {c}</option>
                    ))}
                  </select>
                ) : (
                  <input className="input" value={`Lớp ${assignedLop}`} disabled style={{ background: "var(--bg-muted)", fontWeight: 700 }} />
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Kỳ thu / Đợt thu *</label>
                  <input
                    className="input"
                    value={batchForm.kyThu}
                    onChange={(e) => setBatchForm(f => ({ ...f, kyThu: e.target.value }))}
                    placeholder="HK1, HK2, Quỹ Tết..."
                  />
                </div>
                <div>
                  <label className="label">Số tiền mỗi HS *</label>
                  <input
                    className="input"
                    value={batchForm.soTien}
                    onChange={(e) => setBatchForm(f => ({ ...f, soTien: e.target.value }))}
                    placeholder="VD: 50k hoặc 50000"
                  />
                </div>
              </div>

              <div>
                <label className="label">Ghi chú</label>
                <input
                  className="input"
                  value={batchForm.ghiChu}
                  onChange={(e) => setBatchForm(f => ({ ...f, ghiChu: e.target.value }))}
                  placeholder="Ví dụ: Thu quỹ học kỳ 1 năm học 2025-2026..."
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setBatchModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1.6 }} onClick={handleSaveBatchFee} disabled={saving}>
                {saving ? "Đang áp dụng..." : <><Save size={15} /> Áp dụng cho cả lớp</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ====== MODAL SỬA SỐ TIỀN CÁ NHÂN ====== */}
      {editingSingleFee && typeof document !== "undefined" && createPortal(
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
          onClick={() => setEditingSingleFee(null)}
        >
          <div
            style={{
              position: "relative",
              background: "white",
              borderRadius: 18,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
              padding: "24px 26px",
              width: "100%",
              maxWidth: 440,
              margin: "auto",
              border: "1px solid var(--border)",
              animation: "slideUp 0.18s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                Chỉnh sửa mức thu: {editingSingleFee.student.hoTen}
              </h3>
              <button onClick={() => setEditingSingleFee(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label">Số tiền cần thu (VNĐ) *</label>
                <input
                  className="input"
                  value={singleAmount}
                  onChange={(e) => setSingleAmount(e.target.value)}
                  placeholder="VD: 50k hoặc 50000"
                />
              </div>
              <div>
                <label className="label">Ghi chú (Lý do miễn giảm, ghi chú thêm...)</label>
                <input
                  className="input"
                  value={singleNote}
                  onChange={(e) => setSingleNote(e.target.value)}
                  placeholder="Ví dụ: Giảm 50% quỹ..."
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingSingleFee(null)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={handleSaveSingleFee} disabled={saving}>
                {saving ? "Đang lưu..." : <><Save size={15} /> Lưu thay đổi</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ====== MODAL CHI TIÊU ====== */}
      {expenseModalOpen && typeof document !== "undefined" && createPortal(
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
          onClick={() => setExpenseModalOpen(false)}
        >
          <div
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
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
                {editingExpense ? "Sửa khoản chi tiêu" : "Thêm khoản chi tiêu mới"}
              </h3>
              <button onClick={() => setExpenseModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Nội dung chi *</label>
                <input
                  className="input"
                  value={expForm.danhSachChi}
                  onChange={(e) => setExpForm(f => ({ ...f, danhSachChi: e.target.value }))}
                  placeholder="Ví dụ: Mua bút dạ viết bảng"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Hạng mục *</label>
                  <select
                    className="select"
                    value={expForm.hangMucChi}
                    onChange={(e) => setExpForm(f => ({ ...f, hangMucChi: e.target.value }))}
                  >
                    {HANG_MUC_CHI.map(hm => <option key={hm} value={hm}>{hm}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Ngày chi *</label>
                  <input
                    type="date"
                    className="input"
                    value={expForm.ngayChi}
                    onChange={(e) => setExpForm(f => ({ ...f, ngayChi: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div>
                  <label className="label">Số lượng</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={expForm.soLuong}
                    onChange={(e) => setExpForm(f => ({ ...f, soLuong: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Đơn giá (VNĐ) *</label>
                  <input
                    type="number"
                    className="input"
                    value={expForm.donGia}
                    onChange={(e) => setExpForm(f => ({ ...f, donGia: e.target.value }))}
                    placeholder="150000"
                  />
                </div>
              </div>
              <div>
                <label className="label">Ghi chú</label>
                <input
                  className="input"
                  value={expForm.ghiChu}
                  onChange={(e) => setExpForm(f => ({ ...f, ghiChu: e.target.value }))}
                  placeholder="Tùy chọn..."
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setExpenseModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={handleSaveExpense} disabled={saving}>
                {saving ? "Đang lưu..." : <><Save size={15} /> Lưu khoản chi</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
