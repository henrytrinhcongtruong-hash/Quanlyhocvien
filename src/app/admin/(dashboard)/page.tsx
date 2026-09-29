// src/app/admin/(dashboard)/page.tsx — Dashboard tổng quan Admin phân tách rõ ràng Toàn Trường vs Lớp Cụ Thể
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminDashboard, { ClassSummary } from "@/components/admin/AdminDashboard";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ lop?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const isSuperAdmin = !!(
    (session as { isSuperAdmin?: boolean })?.isSuperAdmin ||
    session?.user?.id === "1"
  );

  // Security & Data Isolation Rule:
  // - If SuperAdmin: respect query param 'lop' (e.g. 12T2, 12A2, or ALL). Defaults to 12T2.
  // - If Non-SuperAdmin: strictly locked to user's assignedLop. Query param 'lop' is completely ignored.
  const userAssignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";
  const activeLop = isSuperAdmin ? params.lop || "12T2" : userAssignedLop;
  const isAll = isSuperAdmin && activeLop === "ALL";

  let totalStudents = 0;
  let maleCount = 0;
  let femaleCount = 0;
  let groupCounts = { to1: 0, to2: 0, to3: 0, to4: 0 };
  let leaders = {
    lopTruong: "Chưa phân công",
    lopPho: "Chưa phân công",
    gvcn: "Chưa phân công",
    t1Leader: "Chưa phân công",
    t2Leader: "Chưa phân công",
    t3Leader: "Chưa phân công",
    t4Leader: "Chưa phân công",
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
  let currentDuty: { tuan: string; to: number; studentName: string | null; lop?: string } | null = null;
  let seatingChartSlotsCount = 0;

  const classSummaries: ClassSummary[] = [];
  let classList: string[] = [];

  try {
    // 1. Fetch common data
    const [
      allStudents,
      allSeatingCharts,
      allFees,
      allExpenses,
      attCount,
      evCount,
      eventsData,
      examsData,
      dutyData,
    ] = await Promise.all([
      prisma.student.findMany({
        select: { id: true, hoTen: true, gioiTinh: true, to: true, lop: true, ghiChu: true, avatar: true },
        orderBy: [{ lop: "asc" }, { to: "asc" }, { hoTen: "asc" }],
      }),
      prisma.seatingChart.findMany({
        select: { lop: true, gvcn: true, slotsData: true },
      }),
      prisma.feeCollection.findMany({
        select: { student: { select: { lop: true } }, soTien: true, trangThai: true },
      }),
      prisma.expense.findMany({
        select: { thanhTien: true },
      }),
      prisma.attendance.count({
        where: isAll ? {} : { student: { lop: activeLop } },
      }),
      prisma.event.count(),
      prisma.event.findMany({
        take: 4,
        orderBy: { createdAt: "desc" },
        select: { id: true, tenSuKien: true, deadline: true, hangMuc: true, chiTiet: true },
      }),
      prisma.examSchedule.findMany({
        where: isAll ? {} : { lop: activeLop },
        take: 4,
        orderBy: { ngayThi: "asc" },
        select: { id: true, monHoc: true, ngayThi: true, hinhThuc: true, thoiLuong: true },
      }),
      prisma.dutyRoster.findFirst({
        where: isAll ? {} : { student: { lop: activeLop } },
        orderBy: { id: "desc" },
        include: { student: { select: { hoTen: true, to: true, lop: true } } },
      }),
    ]);

    // Discover all distinct classes across students and seating charts
    const classSet = new Set<string>();
    allStudents.forEach((s) => {
      if (s.lop) classSet.add(s.lop);
    });
    allSeatingCharts.forEach((sc) => {
      if (sc.lop) classSet.add(sc.lop);
    });
    classList = Array.from(classSet).sort();
    if (classList.length === 0) classList = ["12T2"];

    // Compute detailed breakdown per class
    for (const c of classList) {
      const cStudents = allStudents.filter((s) => s.lop === c);
      const cMale = cStudents.filter((s) => s.gioiTinh === "Nam").length;
      const cFemale = cStudents.filter((s) => s.gioiTinh === "Nữ").length;
      const cSeating = allSeatingCharts.find((sc) => sc.lop === c);
      const cGvcn = cSeating?.gvcn || "Chưa cập nhật";
      const cLt = cStudents.find((s) => s.ghiChu?.toLowerCase().includes("lớp trưởng"))?.hoTen || "Chưa bầu";
      const cLp = cStudents.find((s) => s.ghiChu?.toLowerCase().includes("lớp phó"))?.hoTen || "Chưa bầu";

      const cFees = allFees
        .filter((f) => f.student?.lop === c && f.trangThai === "Đã Đóng")
        .reduce((sum, f) => sum + f.soTien, 0);

      let cSlots = 0;
      if (cSeating?.slotsData) {
        try {
          const parsed = JSON.parse(cSeating.slotsData);
          cSlots = parsed.filter((slot: { studentName?: string | null }) => !!slot.studentName).length;
        } catch {
          cSlots = cStudents.length;
        }
      } else {
        cSlots = cStudents.length;
      }

      classSummaries.push({
        lop: c,
        totalStudents: cStudents.length,
        maleCount: cMale,
        femaleCount: cFemale,
        gvcn: cGvcn,
        lopTruong: cLt,
        lopPho: cLp,
        feeSummary: {
          tongThu: cFees,
          tongChi: 0,
          conLai: cFees,
        },
        seatingSlots: cSlots,
      });
    }

    // Process view data according to isAll vs specific class
    if (isAll) {
      // ===== CASE A: SCHOOL-WIDE OVERVIEW (lop=ALL) =====
      totalStudents = allStudents.length;
      maleCount = allStudents.filter((s) => s.gioiTinh === "Nam").length;
      femaleCount = allStudents.filter((s) => s.gioiTinh === "Nữ").length;

      // When viewing ALL, do NOT assign single-class leaders or mix group counts
      leaders = {
        lopTruong: "Toàn trường",
        lopPho: "Toàn trường",
        gvcn: "Ban Giám Hiệu",
        t1Leader: "",
        t2Leader: "",
        t3Leader: "",
        t4Leader: "",
      };
      groupCounts = { to1: 0, to2: 0, to3: 0, to4: 0 };

      // Total fee across all classes
      const tongThuAll = allFees
        .filter((f) => f.trangThai === "Đã Đóng")
        .reduce((s, f) => s + f.soTien, 0);
      const tongChiAll = allExpenses.reduce((s, e) => s + e.thanhTien, 0);

      feeSummary = {
        tongThu: tongThuAll,
        tongChi: tongChiAll,
        conLai: tongThuAll - tongChiAll,
      };

      // Sum of seated slots across all classes
      seatingChartSlotsCount = classSummaries.reduce((sum, c) => sum + c.seatingSlots, 0);
    } else {
      // ===== CASE B: SPECIFIC CLASS (e.g. lop=12T2 or 12A2) =====
      const targetStudents = allStudents.filter((s) => s.lop === activeLop);
      totalStudents = targetStudents.length;
      maleCount = targetStudents.filter((s) => s.gioiTinh === "Nam").length;
      femaleCount = targetStudents.filter((s) => s.gioiTinh === "Nữ").length;

      groupCounts = {
        to1: targetStudents.filter((s) => s.to === 1).length,
        to2: targetStudents.filter((s) => s.to === 2).length,
        to3: targetStudents.filter((s) => s.to === 3).length,
        to4: targetStudents.filter((s) => s.to === 4).length,
      };

      const targetSeating = allSeatingCharts.find((sc) => sc.lop === activeLop);
      const targetGvcn = targetSeating?.gvcn || (activeLop === "12T2" ? "CHỀNH KIM LIÊN" : "Chưa cập nhật");
      const lt = targetStudents.find((s) => s.ghiChu?.toLowerCase().includes("lớp trưởng"));
      const lp = targetStudents.find((s) => s.ghiChu?.toLowerCase().includes("lớp phó"));
      const t1 = targetStudents.find((s) => s.to === 1 && s.ghiChu?.toLowerCase().includes("tổ trưởng"));
      const t2 = targetStudents.find((s) => s.to === 2 && s.ghiChu?.toLowerCase().includes("tổ trưởng"));
      const t3 = targetStudents.find((s) => s.to === 3 && s.ghiChu?.toLowerCase().includes("tổ trưởng"));
      const t4 = targetStudents.find((s) => s.to === 4 && s.ghiChu?.toLowerCase().includes("tổ trưởng"));

      leaders = {
        gvcn: targetGvcn,
        lopTruong: lt ? lt.hoTen : "Chưa phân công",
        lopPho: lp ? lp.hoTen : "Chưa phân công",
        t1Leader: t1 ? t1.hoTen : "Chưa phân công",
        t2Leader: t2 ? t2.hoTen : "Chưa phân công",
        t3Leader: t3 ? t3.hoTen : "Chưa phân công",
        t4Leader: t4 ? t4.hoTen : "Chưa phân công",
      };

      // Seating slots of this specific class
      if (targetSeating?.slotsData) {
        try {
          const parsed = JSON.parse(targetSeating.slotsData);
          seatingChartSlotsCount = parsed.filter((s: { studentName?: string | null }) => !!s.studentName).length;
        } catch {
          seatingChartSlotsCount = totalStudents;
        }
      } else {
        seatingChartSlotsCount = totalStudents;
      }

      // Fees of this specific class
      const tongThuLop = allFees
        .filter((f) => f.student?.lop === activeLop && f.trangThai === "Đã Đóng")
        .reduce((s, f) => s + f.soTien, 0);

      feeSummary = {
        tongThu: tongThuLop,
        tongChi: 0,
        conLai: tongThuLop,
      };
    }

    totalAttendance = attCount;
    totalEvents = evCount;

    if (eventsData) {
      upcomingEvents = eventsData.map((ev) => ({
        id: ev.id,
        tieuDe: ev.tenSuKien,
        ngayBatDau: ev.deadline ? new Date(ev.deadline).toLocaleDateString("vi-VN") : "Sắp tới",
        loaiSuKien: ev.hangMuc || "Hoạt động trường",
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
        lop: dutyData.student?.lop,
      };
    }
  } catch (err) {
    console.error("Admin overview fetch error:", err);
  }

  const stats = {
    totalStudents,
    maleCount,
    femaleCount,
    totalClasses: classList.length,
    classList,
    classSummaries,
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
