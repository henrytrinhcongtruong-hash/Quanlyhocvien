// src/app/admin/(dashboard)/page.tsx — Dashboard tổng quan Admin
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ lop?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = Number(session!.user!.id);
  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean }).isSuperAdmin;

  // Determine active class: if superAdmin, use query param 'lop' or "ALL"; else use user's assignedLop
  const activeLop = isSuperAdmin
    ? params.lop || "ALL"
    : (session as { assignedLop?: string })?.assignedLop || "11AT3";

  const [quyPerm, baoCaoPerm] = await Promise.all([
    checkPermission(userId, "quy", "chi_xem"),
    checkPermission(userId, "bao_cao", "chi_xem"),
  ]);

  // Query filter
  const isAll = activeLop === "ALL";
  const studentWhere = isAll ? {} : { lop: activeLop };

  // Fetch quick stats
  const [totalStudents, totalAttendance, totalEvents] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    prisma.attendance.count({
      where: isAll ? {} : { student: { lop: activeLop } },
    }),
    prisma.event.count(),
  ]);

  let feeSummary = null;
  if (quyPerm.allowed || baoCaoPerm.allowed) {
    const [fees, expenses] = await Promise.all([
      prisma.feeCollection.findMany({
        where: isAll ? {} : { student: { lop: activeLop } },
        select: { soTien: true, trangThai: true },
      }),
      prisma.expense.findMany({ select: { thanhTien: true } }),
    ]);
    const tongThu = fees.filter(f => f.trangThai === "Đã Đóng").reduce((s, f) => s + f.soTien, 0);
    const tongChi = expenses.reduce((s, e) => s + e.thanhTien, 0);
    feeSummary = { tongThu, tongChi, conLai: tongThu - tongChi };
  }

  const stats = {
    totalStudents,
    totalAttendance,
    totalEvents,
    feeSummary,
    assignedLop: activeLop,
    showFee: quyPerm.allowed || baoCaoPerm.allowed,
    isSuperAdmin,
  };

  return <AdminDashboard stats={stats} />;
}
