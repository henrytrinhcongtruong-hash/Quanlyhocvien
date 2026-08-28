// src/app/admin/(dashboard)/page.tsx — Dashboard tổng quan Admin với phân quyền và dữ liệu chính xác theo lớp
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ lop?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean })?.isSuperAdmin;

  // If SuperAdmin: respect query param 'lop' (12T2, 11AT3, or ALL). Defaults to 12T2.
  // If not SuperAdmin: strictly locked to user's assignedLop.
  const activeLop = isSuperAdmin
    ? params.lop || "12T2"
    : (session as { assignedLop?: string })?.assignedLop || "12T2";

  const isAll = activeLop === "ALL";
  const studentWhere = isAll ? {} : { lop: activeLop };

  let totalStudents = 0;
  let maleCount = 0;
  let femaleCount = 0;
  let groupCounts = { to1: 0, to2: 0, to3: 0, to4: 0 };
  let leaders = {
    lopTruong: activeLop === "11AT3" ? "Trần Văn Minh" : "Nguyễn Thị Hồng Anh",
    lopPho: activeLop === "11AT3" ? "Lê Thị Cẩm" : "Mã Quốc Duy",
    gvcn: activeLop === "11AT3" ? "Nguyễn Thị Lan" : "Kim Liên",
    t1Leader: activeLop === "11AT3" ? "Trần Thị Anh" : "Hoàng Hải",
    t2Leader: activeLop === "11AT3" ? "Lý Thị Lan" : "Đỗ Mỹ Hằng",
    t3Leader: activeLop === "11AT3" ? "Kiều Thị Quỳnh" : "Lâm Văn Tuấn",
    t4Leader: activeLop === "11AT3" ? "Nguyễn Thị Vân" : "Nguyễn Trúc Lệ",
  };

  let totalAttendance = 0;
  let totalEvents = 0;
  let feeSummary: { tongThu: number; tongChi: number; conLai: number } | null = {
    tongThu: 0,
    tongChi: 0,
    conLai: 0,
  };

  let upcomingEvents: Array<{ id: number; tieuDe: string; ngayBatDau: string; loaiSuKien: string; diaDiem: string | null }> = [];
  let upcomingExams: Array<{ id: number; monHoc: string; ngayThi: string; hinhThuc: string; thoiGianLamBai: number }> = [];
  let currentDuty: { tuan: string; to: number; studentName: string | null } | null = null;
  let seatingChartSlotsCount = 0;

  try {
    const [students, attCount, evCount, eventsData, examsData, dutyData, seatingChartData] = await Promise.all([
      prisma.student.findMany({
        where: studentWhere,
        select: { id: true, hoTen: true, gioiTinh: true, to: true, ghiChu: true, avatar: true },
        orderBy: [{ to: "asc" }, { hoTen: "asc" }],
      }),
      prisma.attendance.count({
        where: isAll ? {} : { student: { lop: activeLop } },
      }),
      prisma.event.count(),
      prisma.event.findMany({
        take: 3,
        orderBy: { createdAt: "desc" },
        select: { id: true, tenSuKien: true, deadline: true, hangMuc: true, chiTiet: true },
      }),
      prisma.examSchedule.findMany({
        where: isAll ? {} : { lop: activeLop },
        take: 3,
        orderBy: { ngayThi: "asc" },
        select: { id: true, monHoc: true, ngayThi: true, hinhThuc: true, thoiLuong: true },
      }),
      prisma.dutyRoster.findFirst({
        where: isAll ? {} : { student: { lop: activeLop } },
        orderBy: { id: "desc" },
        include: { student: { select: { hoTen: true, to: true } } },
      }),
      prisma.seatingChart.findFirst({
        where: { lop: isAll ? "12T2" : activeLop },
        select: { slotsData: true, gvcn: true },
      }),
    ]);

    if (students && students.length > 0) {
      totalStudents = students.length;
      maleCount = students.filter((s) => s.gioiTinh === "Nam").length;
      femaleCount = students.filter((s) => s.gioiTinh === "Nữ").length;
      groupCounts = {
        to1: students.filter((s) => s.to === 1).length,
        to2: students.filter((s) => s.to === 2).length,
        to3: students.filter((s) => s.to === 3).length,
        to4: students.filter((s) => s.to === 4).length,
      };

      const lt = students.find((s) => s.ghiChu?.toLowerCase().includes("lớp trưởng"));
      if (lt) leaders.lopTruong = lt.hoTen;
      const lp = students.find((s) => s.ghiChu?.toLowerCase().includes("lớp phó"));
      if (lp) leaders.lopPho = lp.hoTen;
      const t1 = students.find((s) => s.to === 1 && s.ghiChu?.toLowerCase().includes("tổ trưởng"));
      if (t1) leaders.t1Leader = t1.hoTen;
      const t2 = students.find((s) => s.to === 2 && s.ghiChu?.toLowerCase().includes("tổ trưởng"));
      if (t2) leaders.t2Leader = t2.hoTen;
      const t3 = students.find((s) => s.to === 3 && s.ghiChu?.toLowerCase().includes("tổ trưởng"));
      if (t3) leaders.t3Leader = t3.hoTen;
      const t4 = students.find((s) => s.to === 4 && s.ghiChu?.toLowerCase().includes("tổ trưởng"));
      if (t4) leaders.t4Leader = t4.hoTen;
    }

    if (seatingChartData) {
      if (seatingChartData.gvcn) leaders.gvcn = seatingChartData.gvcn;
      try {
        const parsed = JSON.parse(seatingChartData.slotsData);
        seatingChartSlotsCount = parsed.filter((s: { studentName?: string | null }) => !!s.studentName).length;
      } catch {
        seatingChartSlotsCount = totalStudents;
      }
    } else {
      seatingChartSlotsCount = totalStudents;
    }

    totalAttendance = attCount;
    totalEvents = evCount;

    if (eventsData) {
      upcomingEvents = eventsData.map((ev) => ({
        id: ev.id,
        tieuDe: ev.tenSuKien,
        ngayBatDau: ev.deadline ? new Date(ev.deadline).toLocaleDateString("vi-VN") : "Sắp tới",
        loaiSuKien: ev.hangMuc || "Hoạt động lớp",
        diaDiem: ev.chiTiet || "Phòng học",
      }));
    }

    if (examsData) {
      upcomingExams = examsData.map((ex) => ({
        id: ex.id,
        monHoc: ex.monHoc,
        ngayThi: new Date(ex.ngayThi).toLocaleDateString("vi-VN"),
        hinhThuc: ex.hinhThuc,
        thoiGianLamBai: ex.thoiLuong,
      }));
    }

    if (dutyData) {
      currentDuty = {
        tuan: dutyData.tuan,
        to: dutyData.student?.to || 1,
        studentName: dutyData.student?.hoTen || null,
      };
    }

    // Precise Fee & Expense calculation for current class
    const [fees, expenses] = await Promise.all([
      prisma.feeCollection.findMany({
        where: isAll ? {} : { student: { lop: activeLop } },
        select: { soTien: true, trangThai: true },
      }),
      prisma.expense.findMany({ select: { thanhTien: true } }),
    ]);

    const tongThu = fees
      .filter((f) => f.trangThai === "Đã Đóng")
      .reduce((s, f) => s + f.soTien, 0);

    // Only count expenses if viewing ALL or 11AT3 (if any)
    const tongChi = isAll ? expenses.reduce((s, e) => s + e.thanhTien, 0) : 0;

    feeSummary = {
      tongThu,
      tongChi,
      conLai: tongThu - tongChi,
    };
  } catch (err) {
    console.error("Admin overview fetch error:", err);
  }

  const stats = {
    totalStudents,
    maleCount,
    femaleCount,
    groupCounts,
    leaders,
    totalAttendance,
    totalEvents,
    feeSummary,
    assignedLop: activeLop,
    showFee: true,
    isSuperAdmin,
    upcomingEvents,
    upcomingExams,
    currentDuty,
    seatingChartSlotsCount,
  };

  return <AdminDashboard stats={stats} />;
}
