// scripts/recover_activity_history.js
// Kịch bản khôi phục và tái tạo Lịch sử hoạt động (ActivityLog) từ dữ liệu gốc trong Database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recover() {
  console.log('🔄 Bắt đầu tiến trình khôi phục Lịch sử hoạt động...');

  // 1. Lấy danh sách log hiện tại để đảm bảo KHÔNG tạo trùng lặp
  const existingLogs = await prisma.activityLog.findMany({
    select: { target: true, targetId: true, action: true, details: true },
  });
  const existingKeys = new Set(
    existingLogs.map((l) => `${l.target}:${l.targetId || ''}:${l.action}`)
  );
  console.log(`ℹ️ Hiện tại trong DB đã có ${existingLogs.length} bản ghi log.`);

  const newLogs = [];

  // 2. KHÔI PHỤC TÀI KHOẢN NGƯỜI DÙNG (Users)
  const users = await prisma.user.findMany();
  const userMap = new Map(users.map((u) => [u.id, u]));

  for (const u of users) {
    const key = `User:${u.id}:CREATE`;
    const regKey = `User:${u.id}:REGISTER`;
    if (!existingKeys.has(key) && !existingKeys.has(regKey)) {
      newLogs.push({
        userId: 1,
        userName: 'Admin Hệ Thống',
        userRole: 'Admin Tổng',
        userLop: u.assignedLop || '12T2',
        action: 'CREATE',
        target: 'User',
        targetId: String(u.id),
        details: `Khởi tạo tài khoản "${u.hoTen}" (Username: ${u.username}, Vai trò: ${u.roleLabel || 'Thành viên'}, Lớp: ${u.assignedLop || '12T2'})`,
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
        userAgent: 'System Backfill Recovery',
        createdAt: u.createdAt || new Date('2026-08-26T00:00:00.000Z'),
      });
      existingKeys.add(key);
    }
  }

  // 3. KHÔI PHỤC ĐIỂM DANH (Attendance)
  const attendances = await prisma.attendance.findMany({
    include: {
      student: { select: { hoTen: true, lop: true, to: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const a of attendances) {
    const key = `Attendance:${a.id}:CREATE`;
    if (!existingKeys.has(key)) {
      const submitter = a.submittedBy ? userMap.get(a.submittedBy) : null;
      const userName = submitter ? submitter.hoTen : (a.toId ? `Tổ Trưởng Tổ ${a.toId}` : 'Ban cán sự Lớp');
      const userRole = submitter ? (submitter.roleLabel || 'Tổ Trưởng') : 'Tổ Trưởng';
      const userLop = a.student?.lop || submitter?.assignedLop || '12T2';

      newLogs.push({
        userId: a.submittedBy || null,
        userName,
        userRole,
        userLop,
        action: 'CREATE',
        target: 'Attendance',
        targetId: String(a.id),
        details: `Ghi nhận điểm danh: ${a.student?.hoTen || 'Học sinh'} (Tổ ${a.student?.to || a.toId}, Lớp ${userLop}) - Trạng thái: ${a.loai}${a.ghiChu ? ` (Ghi chú: ${a.ghiChu})` : ''}`,
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
        userAgent: 'System Backfill Recovery',
        createdAt: a.createdAt || a.ngay || new Date(),
      });
      existingKeys.add(key);
    }
  }

  // 4. KHÔI PHỤC SỔ QUỸ & THU QUỸ (FeeCollection)
  const fees = await prisma.feeCollection.findMany({
    where: { trangThai: 'Đã Đóng' },
    include: {
      student: { select: { hoTen: true, lop: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const f of fees) {
    const key = `FeeCollection:${f.id}:UPDATE`;
    if (!existingKeys.has(key)) {
      const userLop = f.student?.lop || '12T2';
      newLogs.push({
        userId: null,
        userName: 'Thủ Quỹ Lớp',
        userRole: 'Thủ Quỹ',
        userLop,
        action: 'UPDATE',
        target: 'FeeCollection',
        targetId: String(f.id),
        details: `Ghi nhận đóng quỹ: ${f.student?.hoTen || 'Học sinh'} (${userLop}) - Đã nộp ${Number(f.soTien).toLocaleString('vi-VN')}đ (Kỳ: ${f.kyThu}, Hình thức: ${f.hinhThucDong})`,
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
        userAgent: 'System Backfill Recovery',
        createdAt: f.ngayDong || f.updatedAt || f.createdAt || new Date(),
      });
      existingKeys.add(key);
    }
  }

  // 5. KHÔI PHỤC PHIẾU CHI QUỸ (Expense)
  const expenses = await prisma.expense.findMany({
    orderBy: { createdAt: 'asc' },
  });

  for (const e of expenses) {
    const key = `Expense:${e.id}:CREATE`;
    if (!existingKeys.has(key)) {
      newLogs.push({
        userId: null,
        userName: 'Thủ Quỹ Lớp',
        userRole: 'Thủ Quỹ',
        userLop: '12T2',
        action: 'CREATE',
        target: 'Expense',
        targetId: String(e.id),
        details: `Tạo phiếu chi quỹ: "${e.danhSachChi}" (${e.hangMucChi}) - Số tiền: ${Number(e.thanhTien).toLocaleString('vi-VN')}đ (SL: ${e.soLuong} x ${Number(e.donGia).toLocaleString('vi-VN')}đ)${e.ghiChu ? ` [Ghi chú: ${e.ghiChu}]` : ''}`,
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
        userAgent: 'System Backfill Recovery',
        createdAt: e.createdAt || e.ngayChi || new Date(),
      });
      existingKeys.add(key);
    }
  }

  // 6. KHÔI PHỤC PHÂN CÔNG TRỰC NHẬT (DutyRoster theo tuần)
  const duties = await prisma.dutyRoster.findMany({
    include: {
      student: { select: { hoTen: true, lop: true, to: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Gom theo Tuần và Lớp để tạo log tự nhiên theo đợt phân công
  const dutyWeekMap = new Map();
  for (const d of duties) {
    const lop = d.student?.lop || '12T2';
    const weekKey = `${d.tuan}_${lop}`;
    if (!dutyWeekMap.has(weekKey)) {
      dutyWeekMap.set(weekKey, {
        tuan: d.tuan,
        lop,
        students: new Set(),
        earliestDate: d.createdAt,
      });
    }
    const group = dutyWeekMap.get(weekKey);
    if (d.student?.hoTen) group.students.add(d.student.hoTen);
    if (d.createdAt < group.earliestDate) group.earliestDate = d.createdAt;
  }

  for (const [weekKey, group] of dutyWeekMap.entries()) {
    const key = `DutyRoster:${weekKey}:CREATE`;
    if (!existingKeys.has(key)) {
      const studentNames = Array.from(group.students).slice(0, 10).join(', ');
      const moreText = group.students.size > 10 ? ` và ${group.students.size - 10} bạn khác` : '';
      newLogs.push({
        userId: null,
        userName: 'Lớp Phó Lao Động',
        userRole: 'Lớp Phó',
        userLop: group.lop,
        action: 'CREATE',
        target: 'DutyRoster',
        targetId: group.tuan,
        details: `Phân công lịch trực nhật ${group.tuan} (Lớp ${group.lop}): ${group.students.size} học sinh (${studentNames}${moreText})`,
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
        userAgent: 'System Backfill Recovery',
        createdAt: group.earliestDate || new Date(),
      });
      existingKeys.add(key);
    }
  }

  // 7. KHÔI PHỤC LỊCH THI (ExamSchedule)
  const exams = await prisma.examSchedule.findMany({
    orderBy: { createdAt: 'asc' },
  });

  for (const ex of exams) {
    const key = `ExamSchedule:${ex.id}:CREATE`;
    if (!existingKeys.has(key)) {
      newLogs.push({
        userId: 1,
        userName: 'Admin Hệ Thống',
        userRole: 'Admin Tổng',
        userLop: ex.lop || '12T2',
        action: 'CREATE',
        target: 'ExamSchedule',
        targetId: String(ex.id),
        details: `Lên lịch thi môn "${ex.monHoc}" (${ex.tenKyThi}) - Lớp ${ex.lop || '12T2'} (Thời lượng: ${ex.thoiLuong}p, Hình thức: ${ex.hinhThuc})`,
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
        userAgent: 'System Backfill Recovery',
        createdAt: ex.createdAt || new Date('2026-08-27T00:00:00.000Z'),
      });
      existingKeys.add(key);
    }
  }

  // 8. KHÔI PHỤC SƠ ĐỒ LỚP (SeatingChart)
  const seatingCharts = await prisma.seatingChart.findMany({
    orderBy: { createdAt: 'asc' },
  });

  for (const sc of seatingCharts) {
    const key = `SeatingChart:${sc.id}:CREATE`;
    if (!existingKeys.has(key)) {
      newLogs.push({
        userId: 1,
        userName: 'Chềnh Kim Liên',
        userRole: 'Giáo Viên Chủ Nhiệm',
        userLop: sc.lop || '12T2',
        action: 'CREATE',
        target: 'SeatingChart',
        targetId: String(sc.id),
        details: `Thiết lập sơ đồ chỗ ngồi lớp ${sc.lop} (${sc.month}) - GVCN: ${sc.gvcn || 'Chềnh Kim Liên'}`,
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
        userAgent: 'System Backfill Recovery',
        createdAt: sc.updatedAt || sc.createdAt || new Date('2026-08-27T00:00:00.000Z'),
      });
      existingKeys.add(key);
    }
  }

  // 9. KHÔI PHỤC SỰ KIỆN (Event)
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'asc' },
  });

  for (const ev of events) {
    const key = `Event:${ev.id}:CREATE`;
    if (!existingKeys.has(key)) {
      newLogs.push({
        userId: 1,
        userName: 'Admin Hệ Thống',
        userRole: 'Admin Tổng',
        userLop: '12T2',
        action: 'CREATE',
        target: 'Event',
        targetId: String(ev.id),
        details: `Khởi tạo kế hoạch sự kiện "${ev.tenSuKien}" (Hạng mục: ${ev.hangMuc || 'Chung'}, Trạng thái: ${ev.trangThai})`,
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
        userAgent: 'System Backfill Recovery',
        createdAt: ev.createdAt || new Date('2026-08-27T00:00:00.000Z'),
      });
      existingKeys.add(key);
    }
  }

  console.log(`✨ Đã quét và tổng hợp được ${newLogs.length} bản ghi lịch sử cần khôi phục!`);

  if (newLogs.length === 0) {
    console.log('✅ Toàn bộ lịch sử đã đầy đủ, không có bản ghi nào bị thiếu.');
    return;
  }

  // Ghi hàng loạt vào bảng ActivityLog
  let inserted = 0;
  for (const logItem of newLogs) {
    await prisma.activityLog.create({
      data: logItem,
    });
    inserted++;
  }

  const finalTotal = await prisma.activityLog.count();
  console.log(`\n🎉 HOÀN THÀNH XUẤT SẮC!`);
  console.log(`- Số bản ghi lịch sử vừa được khôi phục: ${inserted}`);
  console.log(`- Tổng số bản ghi Lịch sử hoạt động hiện tại: ${finalTotal}`);
}

recover()
  .catch((err) => {
    console.error('❌ Lỗi khi khôi phục lịch sử:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
