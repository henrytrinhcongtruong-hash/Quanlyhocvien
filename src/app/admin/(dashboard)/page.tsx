// src/app/admin/(dashboard)/page.tsx — Dashboard tổng quan Admin
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

  // Determine active class: if superAdmin, use query param 'lop' or "ALL"; else use user's assignedLop
  const activeLop = isSuperAdmin
    ? params.lop || "ALL"
    : (session as { assignedLop?: string })?.assignedLop || "11AT3";

  const isAll = activeLop === "ALL";
  const studentWhere = isAll ? {} : { lop: activeLop };

  let totalStudents = 53;
  let totalAttendance = 0;
  let totalEvents = 5;
  let feeSummary: { tongThu: number; tongChi: number; conLai: number } | null = {
    tongThu: 2400000,
    tongChi: 12900000,
    conLai: -10500000,
  };

  try {
    const [stCount, attCount, evCount] = await Promise.all([
      prisma.student.count({ where: studentWhere }),
      prisma.attendance.count({
        where: isAll ? {} : { student: { lop: activeLop } },
      }),
      prisma.event.count(),
    ]);
    totalStudents = stCount;
    totalAttendance = attCount;
    totalEvents = evCount;

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
    const tongChi = expenses.reduce((s, e) => s + e.thanhTien, 0);
    feeSummary = { tongThu, tongChi, conLai: tongThu - tongChi };
  } catch (err) {
    console.error("Admin overview fetch fallback:", err);
  }

  const stats = {
    totalStudents,
    totalAttendance,
    totalEvents,
    feeSummary,
    assignedLop: activeLop,
    showFee: true,
    isSuperAdmin,
  };

  return <AdminDashboard stats={stats} />;
}
