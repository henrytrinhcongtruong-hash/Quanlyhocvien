// scripts/test_dashboard_lop.js — Test suite for Dashboard lop parameter & class data isolation
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Simulated dashboard data fetcher mirroring src/app/admin/(dashboard)/page.tsx logic
async function getDashboardData({ isSuperAdmin, userAssignedLop, requestedLop }) {
  // Security & Data Isolation Rule
  const activeLop = isSuperAdmin ? requestedLop || "12T2" : userAssignedLop || "12T2";
  const isAll = isSuperAdmin && activeLop === "ALL";

  const [allStudents, allSeatingCharts, allFees, allExpenses, attCount] = await Promise.all([
    prisma.student.findMany({
      select: { id: true, hoTen: true, gioiTinh: true, to: true, lop: true, ghiChu: true },
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
  ]);

  const classSet = new Set();
  allStudents.forEach((s) => s.lop && classSet.add(s.lop));
  allSeatingCharts.forEach((sc) => sc.lop && classSet.add(sc.lop));
  const classList = Array.from(classSet).sort();

  const classSummaries = [];
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

    classSummaries.push({
      lop: c,
      totalStudents: cStudents.length,
      maleCount: cMale,
      femaleCount: cFemale,
      gvcn: cGvcn,
      lopTruong: cLt,
      lopPho: cLp,
      feeSummary: { tongThu: cFees, tongChi: 0, conLai: cFees },
    });
  }

  let totalStudents = 0;
  let maleCount = 0;
  let femaleCount = 0;
  let groupCounts = { to1: 0, to2: 0, to3: 0, to4: 0 };
  let leaders = {};
  let feeSummary = {};

  if (isAll) {
    totalStudents = allStudents.length;
    maleCount = allStudents.filter((s) => s.gioiTinh === "Nam").length;
    femaleCount = allStudents.filter((s) => s.gioiTinh === "Nữ").length;
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
    const tongThuAll = allFees.filter((f) => f.trangThai === "Đã Đóng").reduce((s, f) => s + f.soTien, 0);
    const tongChiAll = allExpenses.reduce((s, e) => s + e.thanhTien, 0);
    feeSummary = { tongThu: tongThuAll, tongChi: tongChiAll, conLai: tongThuAll - tongChiAll };
  } else {
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
    leaders = {
      gvcn: targetSeating?.gvcn || (activeLop === "12T2" ? "CHỀNH KIM LIÊN" : "Chưa cập nhật"),
      lopTruong: targetStudents.find((s) => s.ghiChu?.toLowerCase().includes("lớp trưởng"))?.hoTen || "Chưa phân công",
      lopPho: targetStudents.find((s) => s.ghiChu?.toLowerCase().includes("lớp phó"))?.hoTen || "Chưa phân công",
      t1Leader: targetStudents.find((s) => s.to === 1 && s.ghiChu?.toLowerCase().includes("tổ trưởng"))?.hoTen || "Chưa phân công",
      t2Leader: targetStudents.find((s) => s.to === 2 && s.ghiChu?.toLowerCase().includes("tổ trưởng"))?.hoTen || "Chưa phân công",
      t3Leader: targetStudents.find((s) => s.to === 3 && s.ghiChu?.toLowerCase().includes("tổ trưởng"))?.hoTen || "Chưa phân công",
      t4Leader: targetStudents.find((s) => s.to === 4 && s.ghiChu?.toLowerCase().includes("tổ trưởng"))?.hoTen || "Chưa phân công",
    };
    const tongThuLop = allFees.filter((f) => f.student?.lop === activeLop && f.trangThai === "Đã Đóng").reduce((s, f) => s + f.soTien, 0);
    feeSummary = { tongThu: tongThuLop, tongChi: 0, conLai: tongThuLop };
  }

  return {
    isAll,
    activeLop,
    totalStudents,
    maleCount,
    femaleCount,
    classList,
    classSummaries,
    groupCounts,
    leaders,
    feeSummary,
  };
}

async function runTests() {
  console.log("=================================================================");
  console.log("🧪 BẮT ĐẦU CHẠY BỘ KIỂM THỬ: DASHBOARD LỌC LỚP & BẢO VỆ PHÂN QUYỀN");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST CASE A: Admin chọn "ALL" (lop=ALL)
  // -------------------------------------------------------------------------
  console.log("📌 Test Case A: Admin chọn Tất Cả Các Lớp (lop=ALL)");
  const resA = await getDashboardData({
    isSuperAdmin: true,
    userAssignedLop: "12T2",
    requestedLop: "ALL",
  });

  assert(resA.isAll === true, "isAll phải là true");
  assert(resA.activeLop === "ALL", "activeLop phải là ALL");
  assert(resA.totalStudents === 97, `Tổng sĩ số toàn trường phải là 97 (nhận được: ${resA.totalStudents})`);
  assert(resA.classList.length >= 2, `Danh sách lớp phải có ít nhất 2 lớp (nhận được: ${resA.classList.join(", ")})`);
  assert(resA.classSummaries.length >= 2, "classSummaries phải có đủ danh sách các lớp riêng biệt");

  const summary12T2 = resA.classSummaries.find((c) => c.lop === "12T2");
  const summary12A2 = resA.classSummaries.find((c) => c.lop === "12A2");
  assert(!!summary12T2 && summary12T2.totalStudents === 55, "Lớp 12T2 trong classSummaries phải có đúng 55 học sinh");
  assert(!!summary12A2 && summary12A2.totalStudents === 42, "Lớp 12A2 trong classSummaries phải có đúng 42 học sinh");
  assert(summary12T2.gvcn.includes("KIM LIÊN"), "Lớp 12T2 phải có đúng GVCN Kim Liên");
  assert(summary12A2.gvcn.includes("CHÍ LINH"), "Lớp 12A2 phải có đúng GVCN Chí Linh");
  assert(resA.leaders.gvcn === "Ban Giám Hiệu", "Ở view ALL, leaders.gvcn không được là GVCN của riêng 1 lớp");
  assert(resA.leaders.lopTruong === "Toàn trường", "Ở view ALL, leaders.lopTruong không được là Lớp trưởng của riêng 1 lớp");
  assert(resA.groupCounts.to1 === 0, "Ở view ALL, không gộp tổ của các lớp làm 1");

  console.log("");

  // -------------------------------------------------------------------------
  // TEST CASE B: Admin chọn 1 lớp cụ thể (lop=12A2)
  // -------------------------------------------------------------------------
  console.log("📌 Test Case B: Admin chọn Lớp Cụ Thể (lop=12A2)");
  const resB = await getDashboardData({
    isSuperAdmin: true,
    userAssignedLop: "12T2",
    requestedLop: "12A2",
  });

  assert(resB.isAll === false, "isAll phải là false");
  assert(resB.activeLop === "12A2", "activeLop phải là 12A2");
  assert(resB.totalStudents === 42, `Sĩ số lớp 12A2 phải là 42 (nhận được: ${resB.totalStudents})`);
  assert(resB.leaders.gvcn.includes("CHÍ LINH"), `GVCN lớp 12A2 phải là Chí Linh (nhận được: ${resB.leaders.gvcn})`);
  assert(resB.leaders.lopTruong === "Lý Lã Nhật Tân", `Lớp trưởng 12A2 phải là Lý Lã Nhật Tân (nhận được: ${resB.leaders.lopTruong})`);
  assert(resB.leaders.lopPho === "Nguyễn Thị Cát Tuyên", `Lớp phó 12A2 phải là Nguyễn Thị Cát Tuyên (nhận được: ${resB.leaders.lopPho})`);
  assert(resB.leaders.t1Leader === "Vũ Đức Huy", `Tổ trưởng T1 12A2 phải là Vũ Đức Huy (nhận được: ${resB.leaders.t1Leader})`);
  assert(resB.leaders.t2Leader === "Tô Vỹ", `Tổ trưởng T2 12A2 phải là Tô Vỹ (nhận được: ${resB.leaders.t2Leader})`);
  assert(resB.groupCounts.to1 + resB.groupCounts.to2 + resB.groupCounts.to3 + resB.groupCounts.to4 === 42, "Tổng 4 tổ lớp 12A2 phải bằng 42 học sinh");

  console.log("");

  // -------------------------------------------------------------------------
  // TEST CASE C: User phân quyền theo lớp (Non-SuperAdmin gán lớp 12T2)
  // -------------------------------------------------------------------------
  console.log("📌 Test Case C: User phân quyền lớp 12T2 (Cố tình request lop=ALL hoặc lop=12A2)");
  // 1. Cố tình request ALL
  const resC1 = await getDashboardData({
    isSuperAdmin: false,
    userAssignedLop: "12T2",
    requestedLop: "ALL",
  });
  assert(resC1.isAll === false, "User thường KHÔNG ĐƯỢC PHÉP xem isAll = true dù có truyền lop=ALL");
  assert(resC1.activeLop === "12T2", "User thường phải bị khóa cứng vào lớp 12T2");
  assert(resC1.totalStudents === 55, `User lớp 12T2 chỉ được thấy 55 học sinh của lớp mình (nhận được: ${resC1.totalStudents})`);
  assert(resC1.leaders.lopTruong === "Nguyễn Thị Hồng Anh", "Lớp trưởng phải là của 12T2 (Nguyễn Thị Hồng Anh)");

  // 2. Cố tình request xem trộm 12A2
  const resC2 = await getDashboardData({
    isSuperAdmin: false,
    userAssignedLop: "12T2",
    requestedLop: "12A2",
  });
  assert(resC2.activeLop === "12T2", "User thường truyền lop=12A2 vẫn BẮT BUỘC bị ép về 12T2");
  assert(resC2.totalStudents === 55, "Không được rò rỉ sĩ số của lớp 12A2");
  assert(!resC2.leaders.gvcn.includes("CHÍ LINH"), "Không được lộ GVCN lớp 12A2 cho user lớp 12T2");

  console.log("\n=================================================================");
  console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
