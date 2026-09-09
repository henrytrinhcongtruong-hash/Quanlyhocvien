"use client";
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Shield,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  LogIn,
  PlusCircle,
  Edit3,
  Trash,
  Lock,
  Unlock,
  Key,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  X,
  ArrowRight,
  Code2,
  Copy,
  Check,
  Maximize2,
} from "lucide-react";

interface ActivityLogItem {
  id: number;
  userId: number | null;
  userName: string | null;
  userRole: string | null;
  userLop: string | null;
  action: string;
  target: string;
  targetId: string | null;
  details: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  createdAt: string;
}

interface SummaryData {
  totalAllTime: number;
  today: {
    total: number;
    logins: number;
    creates: number;
    updates: number;
    deletes: number;
    success: number;
    failed: number;
    successRate: number;
    uniqueUsersCount: number;
  };
  topUsers: { name: string; count: number }[];
  topTargets: { target: string; count: number }[];
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  LOGIN: { label: "Đăng nhập", color: "#0284c7", bg: "#e0f2fe", icon: LogIn },
  LOGOUT: { label: "Đăng xuất", color: "#64748b", bg: "#f1f5f9", icon: LogIn },
  CREATE: { label: "Tạo mới", color: "#16a34a", bg: "#dcfce7", icon: PlusCircle },
  REGISTER: { label: "Đăng ký mới", color: "#059669", bg: "#d1fae5", icon: PlusCircle },
  UPDATE: { label: "Chỉnh sửa", color: "#d97706", bg: "#fef3c7", icon: Edit3 },
  DELETE: { label: "Xóa dữ liệu", color: "#dc2626", bg: "#fee2e2", icon: Trash },
  LOCK_PAGE: { label: "Khóa trang", color: "#9333ea", bg: "#f3e8ff", icon: Lock },
  UNLOCK_PAGE: { label: "Mở khóa trang", color: "#16a34a", bg: "#dcfce7", icon: Unlock },
  CHANGE_PASSWORD: { label: "Đổi mật khẩu", color: "#4f46e5", bg: "#e0e7ff", icon: Key },
  UPDATE_PERMS: { label: "Phân quyền", color: "#7c3aed", bg: "#ede9fe", icon: ShieldCheck },
  EXPORT: { label: "Xuất Excel", color: "#0891b2", bg: "#cffafe", icon: Download },
  IMPORT: { label: "Nhập dữ liệu", color: "#0d9488", bg: "#ccfbf1", icon: PlusCircle },
};

const TARGET_LABELS: Record<string, string> = {
  Student: "Học sinh",
  Attendance: "Điểm danh",
  FeeCollection: "Quỹ thu",
  Expense: "Chi quỹ",
  SeatingChart: "Sơ đồ lớp",
  Timetable: "Thời khóa biểu",
  Event: "Sự kiện",
  ExamSchedule: "Lịch thi",
  DutyRoster: "Lịch trực",
  User: "Tài khoản",
  PageLock: "Khóa trang",
  Auth: "Xác thực",
};

const TO_COLORS: Record<number, { label: string; bg: string; text: string; border: string }> = {
  1: { label: "Tổ 1", bg: "#e0f2fe", text: "#0369a1", border: "#38bdf8" },
  2: { label: "Tổ 2", bg: "#dcfce7", text: "#15803d", border: "#4ade80" },
  3: { label: "Tổ 3", bg: "#fef3c7", text: "#b45309", border: "#fcd34d" },
  4: { label: "Tổ 4", bg: "#f3e8ff", text: "#7e22ce", border: "#c084fc" },
};

const FIELD_LABELS: Record<string, string> = {
  hoTen: "Họ và tên",
  tenGoi: "Tên gọi / Biệt danh",
  ngaySinh: "Ngày sinh",
  gioiTinh: "Giới tính",
  to: "Tổ",
  lop: "Lớp",
  avatar: "Ảnh đại diện (Avatar)",
  ghiChu: "Ghi chú",
  kyThu: "Kỳ thu quỹ",
  soTien: "Số tiền",
  hinhThucDong: "Hình thức đóng",
  trangThai: "Trạng thái",
  ngayDong: "Ngày đóng quỹ",
  danhSachChi: "Nội dung chi",
  hangMucChi: "Hạng mục chi",
  soLuong: "Số lượng",
  donGia: "Đơn giá",
  thanhTien: "Thành tiền",
  ngayChi: "Ngày chi",
  ngay: "Ngày điểm danh",
  loai: "Loại điểm danh / Vi phạm",
  toId: "Tổ",
  tuan: "Tuần trực nhật",
  thu: "Thứ",
  thuOrder: "Thứ tự thứ",
  tenSuKien: "Tên sự kiện",
  hangMuc: "Hạng mục sự kiện",
  chiTiet: "Chi tiết sự kiện",
  deadline: "Hạn chót (Deadline)",
  ketHoachTrienKhai: "Kế hoạch triển khai",
  vaiTro: "Vai trò tham gia",
  monHoc: "Môn học",
  tenKyThi: "Tên kỳ thi",
  loaiKyThi: "Loại kỳ thi",
  ngayThi: "Ngày thi",
  gioThi: "Giờ thi",
  thoiLuong: "Thời lượng (phút)",
  hinhThuc: "Hình thức thi",
  phongThi: "Phòng thi",
  giamThi: "Giám thị",
  phamViOnTap: "Phạm vi ôn tập",
  tiet: "Tiết học",
  buoi: "Buổi học",
  thoiGian: "Khung thời gian",
  giaoVien: "Giáo viên",
  phongHoc: "Phòng học",
  hocKy: "Học kỳ",
  title: "Tiêu đề sơ đồ",
  gvcn: "Giáo viên chủ nhiệm",
  slogan: "Khẩu hiệu lớp",
  month: "Tháng áp dụng",
  slotsData: "Bố trí chỗ ngồi",
  username: "Tên đăng nhập",
  plainPassword: "Mật khẩu",
  passwordHash: "Mã bảo mật mật khẩu",
  roleLabel: "Vai trò / Chức danh",
  assignedLop: "Lớp phụ trách",
  isSuperAdmin: "Quản trị viên tối cao",
  isActive: "Trạng thái tài khoản",
  permissions: "Phân quyền chi tiết",
  path: "Đường dẫn trang",
  description: "Mô tả trang",
  isLocked: "Trạng thái khóa trang",
  lockReason: "Lý do khóa bảo trì",
  lockUntil: "Thời gian mở khóa dự kiến",
  lockedBy: "Người thực hiện khóa",
  submittedBy: "Người nộp",
  ipAddress: "Địa chỉ IP",
  userAgent: "Thiết bị",
  status: "Trạng thái xử lý",
};

interface ParsedDiffItem {
  key: string;
  label: string;
  oldVal: any;
  newVal: any;
  type: "avatar" | "password" | "money" | "date" | "boolean" | "to" | "gender" | "slots" | "text";
}

function parseJsonSafe(val: any) {
  if (val === null || val === undefined) return null;
  if (typeof val === "object") return val;
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return val;
    }
  }
  return val;
}

function detectDiffFieldType(key: string, val: any): ParsedDiffItem["type"] {
  const k = key.toLowerCase();
  if (
    k === "avatar" ||
    k === "photo" ||
    k === "image" ||
    k === "anh" ||
    (typeof val === "string" &&
      (val.startsWith("data:image") || val.startsWith("http://") || val.startsWith("https://")) &&
      (val.includes("image") || /\.(png|jpe?g|webp|gif|svg)/i.test(val)))
  ) {
    return "avatar";
  }
  if (k.includes("password") || k.includes("pass")) {
    return "password";
  }
  if (k === "to" || k === "toid") {
    return "to";
  }
  if (k === "gioitinh") {
    return "gender";
  }
  if (k === "sotien" || k === "dongia" || k === "thanhtien" || k === "chiphi") {
    return "money";
  }
  if (k === "slotsdata") {
    return "slots";
  }
  if (typeof val === "boolean" || k.startsWith("is") || k.startsWith("has")) {
    return "boolean";
  }
  if (
    k.includes("ngay") ||
    k.includes("date") ||
    k.includes("deadline") ||
    k.includes("time") ||
    (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val))
  ) {
    return "date";
  }
  return "text";
}

function computeItemDiffs(action: string, rawOld: any, rawNew: any): ParsedDiffItem[] {
  const oldObj = parseJsonSafe(rawOld);
  const newObj = parseJsonSafe(rawNew);

  const isOldObj = oldObj && typeof oldObj === "object" && !Array.isArray(oldObj);
  const isNewObj = newObj && typeof newObj === "object" && !Array.isArray(newObj);

  // Trường hợp UPDATE (so sánh key giữa 2 object)
  if (isOldObj && isNewObj) {
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
    const result: ParsedDiffItem[] = [];

    for (const key of allKeys) {
      // Bỏ qua các trường kỹ thuật không mang ý nghĩa nghiệp vụ
      if (key === "updatedAt" || key === "createdAt" || key === "id") continue;

      const vOld = oldObj[key];
      const vNew = newObj[key];

      const sOld = vOld === undefined || vOld === null ? "" : typeof vOld === "string" ? vOld.trim() : JSON.stringify(vOld);
      const sNew = vNew === undefined || vNew === null ? "" : typeof vNew === "string" ? vNew.trim() : JSON.stringify(vNew);

      if (sOld !== sNew) {
        result.push({
          key,
          label: FIELD_LABELS[key] || key,
          oldVal: vOld,
          newVal: vNew,
          type: detectDiffFieldType(key, vNew ?? vOld),
        });
      }
    }
    return result;
  }

  // Trường hợp CREATE / REGISTER (oldVal = null, liệt kê các thông tin mới)
  if (!isOldObj && isNewObj) {
    const result: ParsedDiffItem[] = [];
    for (const key of Object.keys(newObj)) {
      if (key === "updatedAt" || key === "createdAt" || key === "id") continue;
      const vNew = newObj[key];
      if (vNew !== null && vNew !== undefined && vNew !== "") {
        result.push({
          key,
          label: FIELD_LABELS[key] || key,
          oldVal: null,
          newVal: vNew,
          type: detectDiffFieldType(key, vNew),
        });
      }
    }
    return result;
  }

  // Trường hợp DELETE (newVal = null, liệt kê thông tin vừa bị xóa)
  if (isOldObj && !isNewObj) {
    const result: ParsedDiffItem[] = [];
    for (const key of Object.keys(oldObj)) {
      if (key === "updatedAt" || key === "createdAt" || key === "id") continue;
      const vOld = oldObj[key];
      if (vOld !== null && vOld !== undefined && vOld !== "") {
        result.push({
          key,
          label: FIELD_LABELS[key] || key,
          oldVal: vOld,
          newVal: null,
          type: detectDiffFieldType(key, vOld),
        });
      }
    }
    return result;
  }

  // Giá trị nguyên thủy khác
  if (rawOld || rawNew) {
    return [
      {
        key: "value",
        label: "Dữ liệu",
        oldVal: rawOld,
        newVal: rawNew,
        type: "text",
      },
    ];
  }

  return [];
}

function renderFormattedDiffValue(
  key: string,
  val: any,
  type: ParsedDiffItem["type"],
  onPreviewImage: (url: string) => void
) {
  if (val === null || val === undefined || val === "") {
    return (
      <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.8rem" }}>
        (Trống / Chưa đặt)
      </span>
    );
  }

  if (type === "avatar") {
    if (typeof val === "string" && (val.startsWith("data:image") || val.startsWith("http") || val.startsWith("/"))) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            onClick={() => onPreviewImage(val)}
            title="Nhấp để xem ảnh lớn"
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              overflow: "hidden",
              border: "2px solid #cbd5e1",
              background: "#ffffff",
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={val} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#0f172a" }}>Ảnh đại diện</div>
            <button
              type="button"
              onClick={() => onPreviewImage(val)}
              style={{
                border: "none",
                background: "transparent",
                color: "#0284c7",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Maximize2 size={11} /> Xem ảnh lớn
            </button>
          </div>
        </div>
      );
    }
    return <span style={{ fontSize: "0.8rem" }}>{String(val)}</span>;
  }

  if (type === "password") {
    return (
      <span style={{ fontFamily: "monospace", letterSpacing: 2, color: "#64748b", fontWeight: 800, fontSize: "0.85rem" }}>
        •••••••• <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700, fontFamily: "sans-serif" }}>(Đã mã hóa an toàn)</span>
      </span>
    );
  }

  if (type === "to") {
    const toNum = Number(val);
    const toConfig = TO_COLORS[toNum] || { label: `Tổ ${val}`, bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: 8,
          fontWeight: 800,
          fontSize: "0.78rem",
          background: toConfig.bg,
          color: toConfig.text,
          border: `1.5px solid ${toConfig.border}`,
        }}
      >
        {toConfig.label}
      </span>
    );
  }

  if (type === "gender") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: 8,
          fontWeight: 800,
          fontSize: "0.78rem",
          background: val === "Nam" ? "#e0f2fe" : "#fce7f3",
          color: val === "Nam" ? "#0369a1" : "#be185d",
          border: `1px solid ${val === "Nam" ? "#bae6fd" : "#fbcfe8"}`,
        }}
      >
        {val}
      </span>
    );
  }

  if (type === "money") {
    const num = Number(val);
    if (!isNaN(num)) {
      return (
        <span style={{ fontWeight: 800, color: "#0284c7", fontSize: "0.85rem" }}>
          {num.toLocaleString("vi-VN")} đ
        </span>
      );
    }
  }

  if (type === "boolean") {
    const bool = Boolean(val);
    let label = bool ? "Có / Bật" : "Không / Tắt";
    if (key === "isActive") label = bool ? "Đang hoạt động" : "Đã khóa";
    if (key === "isLocked") label = bool ? "Đã khóa trang" : "Mở bình thường";
    if (key === "isSuperAdmin") label = bool ? "Quản trị viên tối cao" : "Thành viên thường";

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 9px",
          borderRadius: 7,
          fontWeight: 800,
          fontSize: "0.76rem",
          background: bool ? "#dcfce7" : "#fee2e2",
          color: bool ? "#15803d" : "#b91c1c",
          border: `1px solid ${bool ? "#bbf7d0" : "#fecaca"}`,
        }}
      >
        {label}
      </span>
    );
  }

  if (type === "date") {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const hasTime = typeof val === "string" && (val.includes("T") || val.includes(":"));
        return (
          <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.82rem" }}>
            {hasTime
              ? d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })
              : d.toLocaleDateString("vi-VN")}
          </span>
        );
      }
    } catch {}
  }

  if (type === "slots") {
    try {
      const slots = typeof val === "string" ? JSON.parse(val) : val;
      if (Array.isArray(slots)) {
        const occupied = slots.filter((s: any) => s && (s.studentName || s.studentId));
        return (
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0284c7" }}>
            Sơ đồ chỗ ngồi ({occupied.length}/{slots.length} vị trí có học sinh)
          </span>
        );
      }
    } catch {}
  }

  // Generic object or array
  if (typeof val === "object") {
    try {
      return (
        <code style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, color: "#334155" }}>
          {JSON.stringify(val)}
        </code>
      );
    } catch {}
  }

  return (
    <span style={{ fontSize: "0.82rem", color: "#1e293b", fontWeight: 600, wordBreak: "break-word" }}>
      {String(val)}
    </span>
  );
}

export default function LichSuHoatDongPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [cronLoading, setCronLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [targetFilter, setTargetFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("ALL"); // "ALL" | "TODAY" | "7DAYS" | "30DAYS" | "CUSTOM"
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");

  // Sort State
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Diff Modal State
  const [diffModalItem, setDiffModalItem] = useState<ActivityLogItem | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<"visual" | "json">("visual");
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState<"old" | "new" | null>(null);

  // Cleanup Modal State
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(90);
  const [cleaning, setCleaning] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Compute fromDate / toDate based on preset
  const getDateRangeParams = useCallback(() => {
    const now = new Date();
    if (dateRange === "TODAY") {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      return { fromDate: from.toISOString() };
    }
    if (dateRange === "7DAYS") {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { fromDate: from.toISOString() };
    }
    if (dateRange === "30DAYS") {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { fromDate: from.toISOString() };
    }
    if (dateRange === "CUSTOM") {
      return {
        fromDate: customFromDate ? new Date(customFromDate).toISOString() : undefined,
        toDate: customToDate ? new Date(customToDate).toISOString() : undefined,
      };
    }
    return {};
  }, [dateRange, customFromDate, customToDate]);

  // Load Logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });

      if (search.trim()) params.set("search", search.trim());
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      if (targetFilter !== "ALL") params.set("target", targetFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (roleFilter !== "ALL") params.set("userRole", roleFilter);

      const dates = getDateRangeParams();
      if (dates.fromDate) params.set("fromDate", dates.fromDate);
      if (dates.toDate) params.set("toDate", dates.toDate);

      const res = await fetch(`/api/activity-logs?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        showToast(data.error || "Lỗi tải lịch sử hoạt động", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ khi tải logs", "error");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, actionFilter, targetFilter, statusFilter, roleFilter, sortBy, sortOrder, getDateRangeParams]);

  // Load Summary Stats
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/activity-logs/summary");
      const data = await res.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch {
      console.error("Failed to load summary stats");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Handle Sort Click
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Run Manual Cron Aggregation
  const handleRunCron = async () => {
    setCronLoading(true);
    try {
      const res = await fetch("/api/cron/activity-summary");
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Đã tổng hợp số liệu hoạt động thành công!");
        await loadSummary();
      } else {
        showToast(data.error || "Lỗi chạy tổng hợp", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi chạy tổng hợp", "error");
    } finally {
      setCronLoading(false);
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      showToast("Đang chuẩn bị file Excel...");
      const params = new URLSearchParams({
        exportAll: "true",
        sortBy,
        sortOrder,
      });

      if (search.trim()) params.set("search", search.trim());
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      if (targetFilter !== "ALL") params.set("target", targetFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (roleFilter !== "ALL") params.set("userRole", roleFilter);

      const dates = getDateRangeParams();
      if (dates.fromDate) params.set("fromDate", dates.fromDate);
      if (dates.toDate) params.set("toDate", dates.toDate);

      const res = await fetch(`/api/activity-logs?${params.toString()}`);
      const data = await res.json();

      if (!data.success || !data.data || data.data.length === 0) {
        showToast("Không có dữ liệu log để xuất Excel", "error");
        return;
      }

      const rows = data.data.map((item: ActivityLogItem, idx: number) => ({
        "STT": idx + 1,
        "ID Log": item.id,
        "Thời Gian": new Date(item.createdAt).toLocaleString("vi-VN"),
        "Người Thực Hiện": item.userName || "Khách",
        "Vai Trò": item.userRole || "Guest",
        "Lớp": item.userLop || "—",
        "Thao Tác": ACTION_CONFIG[item.action]?.label || item.action,
        "Phân Hệ / Đối Tượng": TARGET_LABELS[item.target] || item.target,
        "Mã Bản Ghi (ID)": item.targetId || "—",
        "Chi Tiết Thao Tác": item.details || "—",
        "Trạng Thái": item.status === "SUCCESS" ? "Thành công" : item.status === "FAILED" ? "Thất bại" : "Cảnh báo",
        "Địa Chỉ IP": item.ipAddress || "—",
        "Thiết Bị / Trình Duyệt": item.userAgent || "—",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      // Auto col width
      ws["!cols"] = [
        { wch: 6 },
        { wch: 8 },
        { wch: 20 },
        { wch: 22 },
        { wch: 14 },
        { wch: 8 },
        { wch: 16 },
        { wch: 18 },
        { wch: 14 },
        { wch: 38 },
        { wch: 12 },
        { wch: 16 },
        { wch: 30 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Lich_Su_Hoat_Dong");

      const fileName = `Lich_Su_Hoat_Dong_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast(`Đã xuất ${rows.length} dòng ra file Excel thành công!`);
    } catch {
      showToast("Lỗi xuất file Excel", "error");
    }
  };

  // Cleanup Old Logs
  const handleCleanupLogs = async () => {
    setCleaning(true);
    try {
      const res = await fetch(`/api/activity-logs?olderThanDays=${cleanupDays}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
        setCleanupModalOpen(false);
        await Promise.all([loadLogs(), loadSummary()]);
      } else {
        showToast(data.error || "Lỗi dọn dẹp log", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi dọn dẹp log", "error");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Toast Notification */}
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
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Top Header Card */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "white",
          borderRadius: 20,
          padding: "24px 22px",
          marginBottom: 18,
          boxShadow: "0 8px 24px rgba(15,23,42,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(8px)",
                flexShrink: 0,
                color: "#38bdf8",
              }}
            >
              <History size={28} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ fontSize: "1.35rem", fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
                  Lịch Sử Hoạt Động &amp; Nhật Ký Hệ Thống
                </h1>
                <span
                  style={{
                    background: "rgba(56,189,248,0.2)",
                    color: "#38bdf8",
                    padding: "3px 9px",
                    borderRadius: 12,
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  Audit Log
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "#94a3b8" }}>
                Ghi nhận mọi thao tác đăng nhập, tạo, sửa, xóa, phân quyền của học sinh &amp; quản trị viên theo thời gian thực.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRunCron}
              disabled={cronLoading}
              title="Chạy tổng hợp dữ liệu 1 giờ vừa qua ngay lập tức"
              style={{ background: "rgba(255,255,255,0.12)", color: "white", borderColor: "rgba(255,255,255,0.25)", fontSize: "0.82rem" }}
            >
              <Zap size={14} color="#facc15" /> {cronLoading ? "Đang tổng hợp..." : "Tổng hợp 1h"}
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExportExcel}
              style={{ background: "#0284c7", color: "white", borderColor: "#0369a1", fontSize: "0.82rem", fontWeight: 800 }}
            >
              <Download size={14} /> Xuất Excel (.xlsx)
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCleanupModalOpen(true)}
              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", borderColor: "rgba(239,68,68,0.3)", fontSize: "0.82rem" }}
            >
              <Trash2 size={14} /> Dọn dẹp
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
          {/* Card 1: Tổng thao tác hôm nay */}
          <div className="card" style={{ padding: "14px 16px", borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Thao tác hôm nay</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#0f172a" }}>{summary.today.total}</div>
            </div>
          </div>

          {/* Card 2: Lượt đăng nhập */}
          <div className="card" style={{ padding: "14px 16px", borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0369a1" }}>
              <LogIn size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Đăng nhập hôm nay</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#0369a1" }}>{summary.today.logins}</div>
            </div>
          </div>

          {/* Card 3: Tạo / Sửa / Xóa */}
          <div className="card" style={{ padding: "14px 16px", borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
              <Edit3 size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Tạo / Sửa / Xóa</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#16a34a" }}>
                +{summary.today.creates} / ~{summary.today.updates} / -{summary.today.deletes}
              </div>
            </div>
          </div>

          {/* Card 4: Tỷ lệ thành công & Tổng lịch sử */}
          <div className="card" style={{ padding: "14px 16px", borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706" }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Tỷ lệ thành công</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#d97706" }}>
                {summary.today.successRate}% <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>({summary.totalAllTime} logs)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel-like Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: "16px 18px",
          borderRadius: 16,
          marginBottom: 16,
          background: "#ffffff",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          {/* Left search & filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", flex: 1 }}>
            {/* Search input */}
            <div style={{ position: "relative", minWidth: 260, flex: "1 1 260px" }}>
              <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input
                type="text"
                className="input"
                placeholder="🔍 Tìm theo tên người dùng, vai trò, IP, chi tiết..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{ paddingLeft: 34, paddingRight: search ? 32 : 12, fontSize: "0.85rem", height: 38, width: "100%", borderRadius: 10, background: "var(--bg-muted)", boxSizing: "border-box" }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Action Filter */}
            <select
              className="select"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.82rem", height: 36, fontWeight: 700, minWidth: 140 }}
            >
              <option value="ALL">⚡ Mọi thao tác</option>
              <option value="LOGIN">Đăng nhập</option>
              <option value="REGISTER">Đăng ký mới</option>
              <option value="CREATE">Tạo dữ liệu</option>
              <option value="UPDATE">Chỉnh sửa</option>
              <option value="DELETE">Xóa dữ liệu</option>
              <option value="LOCK_PAGE">Khóa trang</option>
              <option value="UNLOCK_PAGE">Mở khóa trang</option>
              <option value="CHANGE_PASSWORD">Đổi mật khẩu</option>
              <option value="UPDATE_PERMS">Phân quyền</option>
            </select>

            {/* Target Filter */}
            <select
              className="select"
              value={targetFilter}
              onChange={(e) => {
                setTargetFilter(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.82rem", height: 36, fontWeight: 700, minWidth: 140 }}
            >
              <option value="ALL">📁 Mọi phân hệ</option>
              <option value="Student">Học sinh</option>
              <option value="Attendance">Điểm danh</option>
              <option value="FeeCollection">Quỹ thu</option>
              <option value="Expense">Chi quỹ</option>
              <option value="SeatingChart">Sơ đồ lớp</option>
              <option value="Timetable">Thời khóa biểu</option>
              <option value="Event">Sự kiện</option>
              <option value="ExamSchedule">Lịch thi</option>
              <option value="DutyRoster">Lịch trực</option>
              <option value="User">Tài khoản</option>
              <option value="PageLock">Khóa trang</option>
              <option value="Auth">Xác thực</option>
            </select>

            {/* Status Filter */}
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.82rem", height: 36, fontWeight: 700, minWidth: 120 }}
            >
              <option value="ALL">Tất cả kết quả</option>
              <option value="SUCCESS">🟢 Thành công</option>
              <option value="FAILED">🔴 Thất bại</option>
            </select>

            {/* Date Preset */}
            <select
              className="select"
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.82rem", height: 36, fontWeight: 700, minWidth: 130 }}
            >
              <option value="ALL">📅 Mọi thời gian</option>
              <option value="TODAY">Hôm nay</option>
              <option value="7DAYS">7 ngày qua</option>
              <option value="30DAYS">30 ngày qua</option>
              <option value="CUSTOM">Tùy chọn ngày...</option>
            </select>

            {/* Custom Date Pickers */}
            {dateRange === "CUSTOM" && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="date"
                  className="input"
                  value={customFromDate}
                  onChange={(e) => {
                    setCustomFromDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ fontSize: "0.8rem", height: 36, padding: "4px 8px" }}
                />
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>-</span>
                <input
                  type="date"
                  className="input"
                  value={customToDate}
                  onChange={(e) => {
                    setCustomToDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ fontSize: "0.8rem", height: 36, padding: "4px 8px" }}
                />
              </div>
            )}
          </div>

          {/* Right Refresh */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadLogs}
            disabled={loading}
            style={{ fontSize: "0.82rem", height: 36, display: "flex", alignItems: "center", gap: 5 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {/* Main Excel-like Table Card */}
      <div
        className="card"
        style={{
          borderRadius: 16,
          padding: 0,
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "#ffffff",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.84rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid var(--border)", color: "#475569" }}>
                <th style={{ padding: "12px 14px", width: 60, fontWeight: 800, textAlign: "center" }}>#</th>
                <th
                  onClick={() => handleSort("createdAt")}
                  style={{ padding: "12px 14px", fontWeight: 800, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span>Thời Gian</span>
                    {sortBy === "createdAt" ? (
                      sortOrder === "asc" ? <ArrowUp size={13} color="#0284c7" /> : <ArrowDown size={13} color="#0284c7" />
                    ) : (
                      <ArrowUpDown size={13} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("userName")}
                  style={{ padding: "12px 14px", fontWeight: 800, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span>Người Thực Hiện</span>
                    {sortBy === "userName" ? (
                      sortOrder === "asc" ? <ArrowUp size={13} color="#0284c7" /> : <ArrowDown size={13} color="#0284c7" />
                    ) : (
                      <ArrowUpDown size={13} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("action")}
                  style={{ padding: "12px 14px", fontWeight: 800, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span>Thao Tác</span>
                    {sortBy === "action" ? (
                      sortOrder === "asc" ? <ArrowUp size={13} color="#0284c7" /> : <ArrowDown size={13} color="#0284c7" />
                    ) : (
                      <ArrowUpDown size={13} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("target")}
                  style={{ padding: "12px 14px", fontWeight: 800, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span>Phân Hệ / Đối Tượng</span>
                    {sortBy === "target" ? (
                      sortOrder === "asc" ? <ArrowUp size={13} color="#0284c7" /> : <ArrowDown size={13} color="#0284c7" />
                    ) : (
                      <ArrowUpDown size={13} color="#94a3b8" />
                    )}
                  </div>
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 800 }}>Chi Tiết Thao Tác</th>
                <th style={{ padding: "12px 14px", fontWeight: 800, textAlign: "center", whiteSpace: "nowrap" }}>Chi Tiết Thay Đổi</th>
                <th style={{ padding: "12px 14px", fontWeight: 800, whiteSpace: "nowrap" }}>IP &amp; Thiết Bị</th>
                <th style={{ padding: "12px 14px", fontWeight: 800, textAlign: "center", whiteSpace: "nowrap" }}>Kết Quả</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                    <div className="skeleton" style={{ height: 32, borderRadius: 8, marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 32, borderRadius: 8, marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 32, borderRadius: 8 }} />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                    <History size={36} color="#cbd5e1" style={{ margin: "0 auto 10px" }} />
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Không tìm thấy nhật ký hoạt động nào</div>
                    <div style={{ fontSize: "0.8rem", marginTop: 4 }}>Thử thay đổi từ khóa hoặc điều kiện lọc phía trên</div>
                  </td>
                </tr>
              ) : (
                logs.map((item, idx) => {
                  const actConfig = ACTION_CONFIG[item.action] || {
                    label: item.action,
                    color: "#475569",
                    bg: "#f1f5f9",
                    icon: Edit3,
                  };
                  const ActIcon = actConfig.icon;
                  const hasDiff = !!(item.oldValue || item.newValue);

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.12s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* # STT */}
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.78rem" }}>
                        {(page - 1) * limit + idx + 1}
                      </td>

                      {/* Thời gian */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.82rem" }}>
                          {new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                      </td>

                      {/* Người thực hiện */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              background: item.userRole === "Admin Tổng" ? "#fee2e2" : "#f0f9ff",
                              color: item.userRole === "Admin Tổng" ? "#dc2626" : "#0284c7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.78rem",
                              fontWeight: 900,
                              flexShrink: 0,
                            }}
                          >
                            {item.userName ? item.userName.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.85rem" }}>
                              {item.userName || "Khách"}
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  padding: "1px 6px",
                                  borderRadius: 6,
                                  background: "#f1f5f9",
                                  color: "#475569",
                                }}
                              >
                                {item.userRole || "Guest"}
                              </span>
                              {item.userLop && (
                                <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#0284c7" }}>
                                  Lớp {item.userLop}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Loại Thao Tác */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 8px",
                            borderRadius: 8,
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            color: actConfig.color,
                            background: actConfig.bg,
                          }}
                        >
                          <ActIcon size={12} />
                          {actConfig.label}
                        </span>
                      </td>

                      {/* Phân hệ / Đối tượng */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 700, color: "#334155" }}>
                          {TARGET_LABELS[item.target] || item.target}
                        </div>
                        {item.targetId && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            ID: {item.targetId}
                          </div>
                        )}
                      </td>

                      {/* Chi tiết nội dung */}
                      <td style={{ padding: "12px 14px", maxWidth: 300 }}>
                        <div
                          title={item.details || ""}
                          style={{
                            color: "#1e293b",
                            lineHeight: 1.45,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {item.details || "—"}
                        </div>
                      </td>

                      {/* Diff Dữ liệu */}
                      <td style={{ padding: "12px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                        {hasDiff ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDiffModalItem(item);
                              setDiffViewMode("visual");
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: "0.75rem", padding: "4px 9px", borderRadius: 6, fontWeight: 700 }}
                          >
                            <Eye size={12} /> Xem Thay Đổi
                          </button>
                        ) : (
                          <span style={{ color: "#cbd5e1", fontSize: "0.75rem" }}>—</span>
                        )}
                      </td>

                      {/* IP & Thiết bị */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>
                          {item.ipAddress || "127.0.0.1"}
                        </div>
                        <div
                          title={item.userAgent || ""}
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                            maxWidth: 140,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.userAgent ? item.userAgent.split(" ")[0] : "Browser"}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: "12px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: 8,
                            background: item.status === "SUCCESS" ? "#dcfce7" : "#fee2e2",
                            color: item.status === "SUCCESS" ? "#15803d" : "#dc2626",
                            border: item.status === "SUCCESS" ? "1px solid #bbf7d0" : "1px solid #fecaca",
                          }}
                        >
                          {item.status === "SUCCESS" ? "Thành công" : "Thất bại"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Excel-like Table Footer & Pagination */}
        <div
          style={{
            padding: "12px 18px",
            background: "#f8fafc",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>
              Hiển thị <strong>{logs.length > 0 ? (page - 1) * limit + 1 : 0}</strong> – <strong>{Math.min(page * limit, total)}</strong> trên tổng số <strong>{total}</strong> dòng
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.78rem" }}>Số dòng:</span>
              <select
                className="select"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{ fontSize: "0.78rem", padding: "2px 6px", height: 28 }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Page navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              style={{ padding: "4px 8px", height: 30 }}
            >
              <ChevronLeft size={14} /> Trước
            </button>

            <span style={{ fontWeight: 800, color: "#0f172a", padding: "0 6px" }}>
              Trang {page} / {totalPages || 1}
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              style={{ padding: "4px 8px", height: 30 }}
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Xem Chi Tiết Diff Thay Đổi */}
      {diffModalItem && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            overflowY: "auto",
          }}
        >
          {(() => {
            const diffs = computeItemDiffs(diffModalItem.action, diffModalItem.oldValue, diffModalItem.newValue);
            const actConfig = ACTION_CONFIG[diffModalItem.action] || {
              label: diffModalItem.action,
              color: "#475569",
              bg: "#f1f5f9",
              icon: Edit3,
            };
            const ActIcon = actConfig.icon;

            const copyToClipboard = (text: string, type: "old" | "new") => {
              if (!text) return;
              navigator.clipboard.writeText(text);
              setCopiedJson(type);
              setTimeout(() => setCopiedJson(null), 2000);
            };

            const formattedOldJson = diffModalItem.oldValue
              ? (() => {
                  try {
                    return JSON.stringify(JSON.parse(diffModalItem.oldValue), null, 2);
                  } catch {
                    return diffModalItem.oldValue;
                  }
                })()
              : "";

            const formattedNewJson = diffModalItem.newValue
              ? (() => {
                  try {
                    return JSON.stringify(JSON.parse(diffModalItem.newValue), null, 2);
                  } catch {
                    return diffModalItem.newValue;
                  }
                })()
              : "";

            return (
              <div
                className="card"
                style={{
                  width: "100%",
                  maxWidth: 740,
                  background: "#ffffff",
                  borderRadius: 20,
                  padding: "24px 22px",
                  boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
                  animation: "slideUp 0.2s ease-out",
                  maxHeight: "90vh",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: actConfig.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: actConfig.color,
                        flexShrink: 0,
                      }}
                    >
                      <ActIcon size={22} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 900, margin: 0, color: "#0f172a" }}>
                          Chi Tiết Thay Đổi (Log #{diffModalItem.id})
                        </h3>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: actConfig.bg,
                            color: actConfig.color,
                          }}
                        >
                          {actConfig.label}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: 2 }}>
                        {TARGET_LABELS[diffModalItem.target] || diffModalItem.target} (ID: {diffModalItem.targetId || "—"}) • Thực hiện bởi: <strong>{diffModalItem.userName || "Khách"}</strong> ({new Date(diffModalItem.createdAt).toLocaleString("vi-VN")})
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDiffModalItem(null)}
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    ✕
                  </button>
                </div>

                {/* Mô tả thao tác */}
                <div style={{ fontSize: "0.84rem", color: "#334155", marginBottom: 12, background: "#f8fafc", padding: "9px 13px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0f172a" }}>Mô tả:</strong> {diffModalItem.details || "—"}
                </div>

                {/* View Mode Switcher */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
                  <div>
                    {diffViewMode === "visual" && (
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0369a1", display: "flex", alignItems: "center", gap: 5 }}>
                        <Sparkles size={15} color="#0284c7" />
                        {diffModalItem.action === "CREATE" || diffModalItem.action === "REGISTER"
                          ? `Thông tin khởi tạo (${diffs.length} trường)`
                          : diffModalItem.action === "DELETE"
                          ? `Thông tin bản ghi đã xóa (${diffs.length} trường)`
                          : diffs.length > 0
                          ? `Phát hiện chính xác ${diffs.length} thông tin đã được sửa đổi:`
                          : "Dữ liệu được giữ nguyên"}
                      </div>
                    )}
                    {diffViewMode === "json" && (
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
                        Mã JSON kỹ thuật thô (Trước &amp; Sau)
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", background: "#f1f5f9", padding: 3, borderRadius: 8, gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => setDiffViewMode("visual")}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "none",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        background: diffViewMode === "visual" ? "#0284c7" : "transparent",
                        color: diffViewMode === "visual" ? "#ffffff" : "#64748b",
                        transition: "all 0.15s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Sparkles size={12} /> Trực quan
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiffViewMode("json")}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "none",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        background: diffViewMode === "json" ? "#0284c7" : "transparent",
                        color: diffViewMode === "json" ? "#ffffff" : "#64748b",
                        transition: "all 0.15s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Code2 size={12} /> Mã JSON
                    </button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
                  {diffViewMode === "visual" ? (
                    diffs.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "36px 20px",
                          background: "#f8fafc",
                          borderRadius: 14,
                          border: "1.5px dashed #cbd5e1",
                        }}
                      >
                        <CheckCircle2 size={36} color="#10b981" style={{ margin: "0 auto 8px" }} />
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem", marginBottom: 4 }}>
                          Dữ liệu nghiệp vụ không có thay đổi nội dung
                        </div>
                        <div style={{ color: "#64748b", fontSize: "0.8rem", maxWidth: 440, margin: "0 auto" }}>
                          Bản ghi được lưu lại thành công nhưng toàn bộ các trường thông tin vẫn giữ nguyên giá trị ban đầu.
                        </div>
                      </div>
                    ) : diffModalItem.action === "CREATE" || diffModalItem.action === "REGISTER" ? (
                      // Hiển thị dạng thẻ cho CREATE
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                        {diffs.map((d) => (
                          <div
                            key={d.key}
                            style={{
                              background: "#f0fdf4",
                              border: "1px solid #bbf7d0",
                              borderRadius: 12,
                              padding: "10px 12px",
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#166534", textTransform: "uppercase", marginBottom: 3 }}>
                              {d.label}
                            </div>
                            <div>{renderFormattedDiffValue(d.key, d.newVal, d.type, (url) => setPreviewImgUrl(url))}</div>
                          </div>
                        ))}
                      </div>
                    ) : diffModalItem.action === "DELETE" ? (
                      // Hiển thị dạng thẻ cho DELETE
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                        {diffs.map((d) => (
                          <div
                            key={d.key}
                            style={{
                              background: "#fef2f2",
                              border: "1px solid #fecaca",
                              borderRadius: 12,
                              padding: "10px 12px",
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#991b1b", textTransform: "uppercase", marginBottom: 3 }}>
                              {d.label}
                            </div>
                            <div>{renderFormattedDiffValue(d.key, d.oldVal, d.type, (url) => setPreviewImgUrl(url))}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Hiển thị dạng so sánh Trước ➔ Sau cho UPDATE
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {diffs.map((d) => (
                          <div
                            key={d.key}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: 14,
                              padding: "12px 14px",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0284c7" }} />
                                <strong style={{ fontSize: "0.86rem", color: "#0f172a" }}>{d.label}</strong>
                                <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontFamily: "monospace" }}>({d.key})</span>
                              </div>
                              <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: 6, background: "#fef3c7", color: "#b45309" }}>
                                Đã thay đổi
                              </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 28px 1fr", gap: 10, alignItems: "center" }}>
                              {/* Cũ */}
                              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px", minHeight: 48, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#dc2626", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626" }} />
                                  TRƯỚC THAY ĐỔI
                                </div>
                                <div>{renderFormattedDiffValue(d.key, d.oldVal, d.type, (url) => setPreviewImgUrl(url))}</div>
                              </div>

                              {/* Mũi tên */}
                              <div style={{ display: "flex", justifyContent: "center", color: "#94a3b8" }}>
                                <ArrowRight size={18} />
                              </div>

                              {/* Mới */}
                              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 12px", minHeight: 48, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#16a34a", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
                                  SAU THAY ĐỔI (MỚI)
                                </div>
                                <div>{renderFormattedDiffValue(d.key, d.newVal, d.type, (url) => setPreviewImgUrl(url))}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    // Chế độ xem JSON kỹ thuật
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {/* Old Value */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#dc2626", display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626" }} />
                            Giá Trị Trước Thay Đổi (Old Value)
                          </div>
                          {formattedOldJson && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(formattedOldJson, "old")}
                              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 3 }}
                            >
                              {copiedJson === "old" ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                              {copiedJson === "old" ? "Đã chép" : "Sao chép"}
                            </button>
                          )}
                        </div>
                        <pre
                          style={{
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: 10,
                            padding: "10px 12px",
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            maxHeight: 280,
                            overflowY: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            margin: 0,
                            color: "#991b1b",
                          }}
                        >
                          {formattedOldJson || "(Không có giá trị cũ / Bản ghi tạo mới)"}
                        </pre>
                      </div>

                      {/* New Value */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#16a34a", display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
                            Giá Trị Sau Thay Đổi (New Value)
                          </div>
                          {formattedNewJson && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(formattedNewJson, "new")}
                              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 3 }}
                            >
                              {copiedJson === "new" ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                              {copiedJson === "new" ? "Đã chép" : "Sao chép"}
                            </button>
                          )}
                        </div>
                        <pre
                          style={{
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: 10,
                            padding: "10px 12px",
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            maxHeight: 280,
                            overflowY: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            margin: 0,
                            color: "#166534",
                          }}
                        >
                          {formattedNewJson || "(Không có giá trị mới / Bản ghi bị xóa)"}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setDiffModalItem(null)}
                    style={{ padding: "8px 22px", borderRadius: 8, fontWeight: 800 }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            );
          })()}
        </div>,
        document.body
      )}

      {/* Modal Xem Phóng To Hình Ảnh */}
      {previewImgUrl && typeof document !== "undefined" && createPortal(
        <div
          onClick={() => setPreviewImgUrl(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 1000000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: 420,
              width: "100%",
              background: "#ffffff",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              animation: "slideUp 0.18s ease-out",
            }}
          >
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a" }}>Xem Ảnh Đầy Đủ</span>
              <button
                type="button"
                onClick={() => setPreviewImgUrl(null)}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "1rem", color: "#64748b" }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 16, display: "flex", justifyContent: "center", background: "#0f172a" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImgUrl}
                alt="Preview"
                style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 8 }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Dọn Dẹp Log Cũ */}
      {cleanupModalOpen && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#ffffff",
              borderRadius: 20,
              padding: "24px 22px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              animation: "slideUp 0.2s ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                <Trash2 size={20} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                Dọn Dẹp Nhật Ký Hoạt Động
              </h3>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.5 }}>
              Xóa bớt các bản ghi log cũ trong quá khứ để giải phóng dung lượng database. Hành động này không thể hoàn tác.
            </p>

            <div style={{ marginBottom: 18 }}>
              <label className="label" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                Xóa tất cả log cũ hơn:
              </label>
              <select
                className="select"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(Number(e.target.value))}
                style={{ width: "100%", fontSize: "0.88rem", fontWeight: 700 }}
              >
                <option value={30}>30 ngày trước</option>
                <option value={60}>60 ngày trước</option>
                <option value={90}>90 ngày trước (Khuyên dùng)</option>
                <option value={180}>180 ngày (6 tháng) trước</option>
                <option value={365}>365 ngày (1 năm) trước</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCleanupModalOpen(false)}
                disabled={cleaning}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleCleanupLogs}
                disabled={cleaning}
                style={{ background: "#dc2626", color: "white", border: "none", fontWeight: 800, padding: "7px 16px", borderRadius: 8 }}
              >
                {cleaning ? "Đang dọn dẹp..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
