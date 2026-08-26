// prisma/seed.ts
// Seed script: tạo data mẫu cho lớp 11AT3
// Khi có file Excel thực, chạy lại: npm run seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// =========================================
// DỮ LIỆU MẪU - 46 HỌC SINH / 4 TỔ
// =========================================
const STUDENTS_SEED = [
  // TỔ 1 (12 HS)
  { hoTen: "Trần Thị Anh", tenGoi: "Anh", ngaySinh: "15/09/2010", gioiTinh: "Nữ", to: 1 },
  { hoTen: "Nguyễn Văn Bảo", tenGoi: "Bảo", ngaySinh: "22/03/2010", gioiTinh: "Nam", to: 1 },
  { hoTen: "Lê Thị Cẩm", tenGoi: "Cẩm", ngaySinh: "07/11/2010", gioiTinh: "Nữ", to: 1 },
  { hoTen: "Phạm Văn Dũng", tenGoi: "Dũng", ngaySinh: "18/06/2010", gioiTinh: "Nam", to: 1 },
  { hoTen: "Hoàng Thị Duyên", tenGoi: "Duyên", ngaySinh: "29/01/2010", gioiTinh: "Nữ", to: 1 },
  { hoTen: "Vũ Văn Đức", tenGoi: "Đức", ngaySinh: "03/08/2010", gioiTinh: "Nam", to: 1 },
  { hoTen: "Đặng Thị Giang", tenGoi: "Giang", ngaySinh: "14/04/2010", gioiTinh: "Nữ", to: 1 },
  { hoTen: "Bùi Văn Hải", tenGoi: "Hải", ngaySinh: "25/12/2010", gioiTinh: "Nam", to: 1 },
  { hoTen: "Trịnh Thị Hiền", tenGoi: "Hiền", ngaySinh: "09/07/2010", gioiTinh: "Nữ", to: 1 },
  { hoTen: "Phan Văn Hùng", tenGoi: "Hùng", ngaySinh: "31/05/2010", gioiTinh: "Nam", to: 1 },
  { hoTen: "Ngô Thị Hương", tenGoi: "Hương", ngaySinh: "16/02/2010", gioiTinh: "Nữ", to: 1 },
  { hoTen: "Đinh Văn Khoa", tenGoi: "Khoa", ngaySinh: "28/10/2010", gioiTinh: "Nam", to: 1 },
  // TỔ 2 (12 HS)
  { hoTen: "Lý Thị Lan", tenGoi: "Lan", ngaySinh: "11/03/2010", gioiTinh: "Nữ", to: 2 },
  { hoTen: "Dương Văn Lâm", tenGoi: "Lâm", ngaySinh: "20/09/2010", gioiTinh: "Nam", to: 2 },
  { hoTen: "Cao Thị Linh", tenGoi: "Linh", ngaySinh: "05/06/2010", gioiTinh: "Nữ", to: 2 },
  { hoTen: "Hồ Văn Long", tenGoi: "Long", ngaySinh: "17/12/2010", gioiTinh: "Nam", to: 2 },
  { hoTen: "Tô Thị Mai", tenGoi: "Mai", ngaySinh: "08/04/2010", gioiTinh: "Nữ", to: 2 },
  { hoTen: "Châu Văn Minh", tenGoi: "Minh", ngaySinh: "23/01/2010", gioiTinh: "Nam", to: 2 },
  { hoTen: "Lưu Thị Nam", tenGoi: "Nam", ngaySinh: "12/08/2010", gioiTinh: "Nữ", to: 2 },
  { hoTen: "Võ Văn Nghĩa", tenGoi: "Nghĩa", ngaySinh: "27/05/2010", gioiTinh: "Nam", to: 2 },
  { hoTen: "Trương Thị Ngọc", tenGoi: "Ngọc", ngaySinh: "04/11/2010", gioiTinh: "Nữ", to: 2 },
  { hoTen: "Huỳnh Văn Phát", tenGoi: "Phát", ngaySinh: "19/07/2010", gioiTinh: "Nam", to: 2 },
  { hoTen: "Mạc Thị Phương", tenGoi: "Phương", ngaySinh: "30/03/2010", gioiTinh: "Nữ", to: 2 },
  { hoTen: "Đỗ Văn Quân", tenGoi: "Quân", ngaySinh: "13/02/2010", gioiTinh: "Nam", to: 2 },
  // TỔ 3 (11 HS)
  { hoTen: "Kiều Thị Quỳnh", tenGoi: "Quỳnh", ngaySinh: "24/10/2010", gioiTinh: "Nữ", to: 3 },
  { hoTen: "Mai Văn Sơn", tenGoi: "Sơn", ngaySinh: "06/06/2010", gioiTinh: "Nam", to: 3 },
  { hoTen: "Tăng Thị Thảo", tenGoi: "Thảo", ngaySinh: "15/01/2010", gioiTinh: "Nữ", to: 3 },
  { hoTen: "Đoàn Văn Thịnh", tenGoi: "Thịnh", ngaySinh: "26/09/2010", gioiTinh: "Nam", to: 3 },
  { hoTen: "Quách Thị Thu", tenGoi: "Thu", ngaySinh: "10/04/2010", gioiTinh: "Nữ", to: 3 },
  { hoTen: "Lương Văn Toàn", tenGoi: "Toàn", ngaySinh: "21/12/2010", gioiTinh: "Nam", to: 3 },
  { hoTen: "Nghiêm Thị Trang", tenGoi: "Trang", ngaySinh: "02/08/2010", gioiTinh: "Nữ", to: 3 },
  { hoTen: "Cù Văn Trọng", tenGoi: "Trọng", ngaySinh: "14/05/2010", gioiTinh: "Nam", to: 3 },
  { hoTen: "Đào Thị Tuyền", tenGoi: "Tuyền", ngaySinh: "28/02/2010", gioiTinh: "Nữ", to: 3 },
  { hoTen: "Thiều Văn Tùng", tenGoi: "Tùng", ngaySinh: "09/11/2010", gioiTinh: "Nam", to: 3 },
  { hoTen: "Giang Thị Uyên", tenGoi: "Uyên", ngaySinh: "18/07/2010", gioiTinh: "Nữ", to: 3 },
  // TỔ 4 (11 HS)
  { hoTen: "Nguyễn Thị Vân", tenGoi: "Vân", ngaySinh: "01/03/2010", gioiTinh: "Nữ", to: 4 },
  { hoTen: "Trần Văn Vinh", tenGoi: "Vinh", ngaySinh: "22/10/2010", gioiTinh: "Nam", to: 4 },
  { hoTen: "Lê Thị Xuân", tenGoi: "Xuân", ngaySinh: "13/06/2010", gioiTinh: "Nữ", to: 4 },
  { hoTen: "Phạm Văn Yên", tenGoi: "Yên", ngaySinh: "07/01/2010", gioiTinh: "Nam", to: 4 },
  { hoTen: "Hoàng Thị Yến", tenGoi: "Yến", ngaySinh: "29/08/2010", gioiTinh: "Nữ", to: 4 },
  { hoTen: "Vũ Văn An", tenGoi: "An", ngaySinh: "16/04/2010", gioiTinh: "Nam", to: 4 },
  { hoTen: "Đặng Thị Bích", tenGoi: "Bích", ngaySinh: "03/12/2010", gioiTinh: "Nữ", to: 4 },
  { hoTen: "Bùi Văn Châu", tenGoi: "Châu", ngaySinh: "25/07/2010", gioiTinh: "Nam", to: 4 },
  { hoTen: "Trịnh Thị Diễm", tenGoi: "Diễm", ngaySinh: "11/05/2010", gioiTinh: "Nữ", to: 4 },
  { hoTen: "Phan Văn Em", tenGoi: "Em", ngaySinh: "30/01/2010", gioiTinh: "Nam", to: 4 },
  { hoTen: "Ngô Thị Hoa", tenGoi: "Hoa", ngaySinh: "08/09/2010", gioiTinh: "Nữ", to: 4 },
];

function parseDate(str: string): Date {
  const [d, m, y] = str.split("/");
  return new Date(Number(y), Number(m) - 1, Number(d));
}

async function main() {
  console.log("🌱 Bắt đầu seed dữ liệu lớp 11AT3...\n");

  // =========================================
  // 1. TẠO HỌC SINH
  // =========================================
  console.log("📚 Đang tạo danh sách học sinh...");
  const createdStudents: { id: number; hoTen: string; to: number }[] = [];

  for (const s of STUDENTS_SEED) {
    const student = await prisma.student.upsert({
      where: {
        // Fake unique key bằng composite - SQLite không native support
        // Dùng hoTen + ngaySinh làm điều kiện tìm
        id: 0, // sẽ không tìm thấy → create
      },
      update: {},
      create: {
        hoTen: s.hoTen,
        tenGoi: s.tenGoi,
        ngaySinh: parseDate(s.ngaySinh),
        gioiTinh: s.gioiTinh,
        to: s.to,
        lop: "11AT3",
      },
    }).catch(async () => {
      // Nếu đã tồn tại, skip
      const existing = await prisma.student.findFirst({
        where: { hoTen: s.hoTen },
      });
      return existing!;
    });

    if (student) {
      createdStudents.push({ id: student.id, hoTen: student.hoTen, to: student.to });
    }
  }

  // Recreate students properly
  await prisma.student.deleteMany({});
  const students: { id: number; hoTen: string; to: number }[] = [];
  for (const s of STUDENTS_SEED) {
    const student = await prisma.student.create({
      data: {
        hoTen: s.hoTen,
        tenGoi: s.tenGoi,
        ngaySinh: parseDate(s.ngaySinh),
        gioiTinh: s.gioiTinh,
        to: s.to,
        lop: "11AT3",
      },
    });
    students.push({ id: student.id, hoTen: student.hoTen, to: student.to });
  }
  console.log(`   ✓ Đã tạo ${students.length} học sinh`);

  // =========================================
  // 2. TẠO THU QUỸ
  // =========================================
  console.log("💰 Đang tạo dữ liệu thu quỹ...");
  let feeCount = 0;
  const kyThus = ["HK1", "HK2"];

  for (const student of students) {
    for (const kyThu of kyThus) {
      const rand = Math.random();
      const trangThai = rand > 0.15 ? "Đã Đóng" : "Chưa Đóng";
      const ngayDong = trangThai === "Đã Đóng"
        ? new Date(2025, kyThu === "HK1" ? 7 : 12, Math.floor(Math.random() * 20) + 1)
        : null;

      await prisma.feeCollection.create({
        data: {
          studentId: student.id,
          kyThu,
          soTien: 300000,
          hinhThucDong: Math.random() > 0.4 ? "Chuyển Khoản" : "Tiền Mặt",
          trangThai,
          ngayDong,
        },
      });
      feeCount++;
    }
  }
  console.log(`   ✓ Đã tạo ${feeCount} bản ghi thu quỹ`);

  // =========================================
  // 3. TẠO CHI QUỸ
  // =========================================
  console.log("📊 Đang tạo dữ liệu chi quỹ...");
  const expenses = [
    { danhSachChi: "Mua bảng phụ và phấn", hangMucChi: "Văn phòng phẩm", soLuong: 1, donGia: 150000, ngayChi: new Date(2025, 8, 15) },
    { danhSachChi: "In tài liệu học tập HK1", hangMucChi: "Văn phòng phẩm", soLuong: 46, donGia: 5000, ngayChi: new Date(2025, 8, 20) },
    { danhSachChi: "Tổ chức ngày Nhà giáo VN 20/11", hangMucChi: "Hoạt động trường", soLuong: 1, donGia: 800000, ngayChi: new Date(2025, 10, 18) },
    { danhSachChi: "Quà sinh nhật học sinh tháng 9", hangMucChi: "Quà tặng", soLuong: 3, donGia: 80000, ngayChi: new Date(2025, 8, 30) },
    { danhSachChi: "Vệ sinh lớp học đầu năm", hangMucChi: "Vệ sinh - Trang trí", soLuong: 1, donGia: 200000, ngayChi: new Date(2025, 8, 5) },
    { danhSachChi: "Trang trí lớp Tết Trung Thu", hangMucChi: "Vệ sinh - Trang trí", soLuong: 1, donGia: 350000, ngayChi: new Date(2025, 9, 5) },
    { danhSachChi: "Đăng ký thi học sinh giỏi", hangMucChi: "Học tập - Thi cử", soLuong: 5, donGia: 30000, ngayChi: new Date(2025, 9, 20) },
    { danhSachChi: "Áo đồng phục thể thao lớp", hangMucChi: "Đồng phục - Thể thao", soLuong: 46, donGia: 180000, ngayChi: new Date(2025, 10, 1) },
    { danhSachChi: "Tổ chức bữa ăn liên hoan cuối HK1", hangMucChi: "Hoạt động trường", soLuong: 46, donGia: 50000, ngayChi: new Date(2026, 0, 15) },
    { danhSachChi: "Mua hoa tặng cô ngày 8/3", hangMucChi: "Quà tặng", soLuong: 1, donGia: 200000, ngayChi: new Date(2026, 2, 8) },
  ];

  for (const exp of expenses) {
    await prisma.expense.create({
      data: {
        ...exp,
        thanhTien: exp.soLuong * exp.donGia,
      },
    });
  }
  console.log(`   ✓ Đã tạo ${expenses.length} khoản chi quỹ`);

  // =========================================
  // 4. TẠO ĐIỂM DANH MẪU
  // =========================================
  console.log("📅 Đang tạo dữ liệu điểm danh mẫu...");
  const absenceTypes = ["Vắng có phép", "Vắng không phép", "Đi trễ"];
  let attendanceCount = 0;

  // Tạo một số buổi vắng ngẫu nhiên trong khoảng tháng 9-11/2025
  for (let i = 0; i < 30; i++) {
    const student = students[Math.floor(Math.random() * students.length)];
    const month = 8 + Math.floor(Math.random() * 3); // 8,9,10 (tháng 9-11)
    const day = 1 + Math.floor(Math.random() * 25);
    const ngay = new Date(2025, month, day);
    const loai = absenceTypes[Math.floor(Math.random() * absenceTypes.length)];

    try {
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          ngay,
          loai,
          toId: student.to,
          ghiChu: loai === "Vắng có phép" ? "Có giấy phép" : "",
        },
      });
      attendanceCount++;
    } catch {
      // Bỏ qua nếu trùng unique constraint
    }
  }
  console.log(`   ✓ Đã tạo ${attendanceCount} bản ghi điểm danh`);

  // =========================================
  // 5. TẠO LỊCH TRỰC NHẬT
  // =========================================
  console.log("🗓️ Đang tạo lịch trực nhật...");
  const thuNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
  const week1 = "2025-W38"; // Tuần đầu tháng 9
  const week2 = "2025-W39";

  for (let w = 0; w < 2; w++) {
    const week = w === 0 ? week1 : week2;
    for (let t = 0; t < 5; t++) {
      const startIdx = (w * 5 + t) * 2;
      const studentsForDay = students.slice(startIdx, startIdx + 3);
      const thu = thuNames[t];

      for (const s of studentsForDay) {
        try {
          await prisma.dutyRoster.create({
            data: {
              tuan: week,
              thu,
              thuOrder: t + 2,
              studentId: s.id,
            },
          });
        } catch {
          // bỏ qua trùng
        }
      }
    }
  }
  console.log(`   ✓ Đã tạo lịch trực nhật cho 2 tuần`);

  // =========================================
  // 6. TẠO SỰ KIỆN
  // =========================================
  console.log("🎉 Đang tạo sự kiện...");
  const events = [
    {
      tenSuKien: "Lễ khai giảng năm học 2025-2026",
      hangMuc: "Hoạt động trường",
      chiTiet: "Tham dự lễ khai giảng toàn trường",
      deadline: new Date(2025, 8, 5),
      trangThai: "Đã xong",
    },
    {
      tenSuKien: "Hội thi văn nghệ chào mừng 20/10",
      hangMuc: "Văn nghệ",
      chiTiet: "Chuẩn bị tiết mục hát tập thể và múa",
      deadline: new Date(2025, 9, 18),
      trangThai: "Đã xong",
    },
    {
      tenSuKien: "Thi học sinh giỏi cấp trường",
      hangMuc: "Học tập - Thi cử",
      chiTiet: "Đăng ký và ôn luyện học sinh tham dự",
      deadline: new Date(2025, 10, 10),
      trangThai: "Đã xong",
    },
    {
      tenSuKien: "Gặp mặt phụ huynh học sinh HK1",
      hangMuc: "Họp phụ huynh",
      chiTiet: "Tổ chức họp phụ huynh cuối học kỳ 1",
      deadline: new Date(2026, 0, 20),
      trangThai: "Sắp diễn ra",
    },
    {
      tenSuKien: "Tham quan học tập tại Bảo tàng Lịch sử",
      hangMuc: "Tham quan - Dã ngoại",
      chiTiet: "Tổ chức tham quan học tập ngoại khóa",
      deadline: new Date(2026, 2, 15),
      trangThai: "Sắp diễn ra",
    },
  ];

  for (const evt of events) {
    const created = await prisma.event.create({ data: evt });

    // Gán thành viên ngẫu nhiên
    const leads = students.slice(0, 2);
    const supports = students.slice(2, 6);

    for (const l of leads) {
      await prisma.eventMember.create({
        data: { eventId: created.id, studentId: l.id, vaiTro: "Lead" },
      });
    }
    for (const s of supports) {
      await prisma.eventMember.create({
        data: { eventId: created.id, studentId: s.id, vaiTro: "Support" },
      });
    }
  }
  console.log(`   ✓ Đã tạo ${events.length} sự kiện`);

  // =========================================
  // 7. TẠO USERS
  // =========================================
  console.log("👤 Đang tạo tài khoản...");

  const adminHash = await bcrypt.hash("admin123", 12);
  const gvcnHash = await bcrypt.hash("gvcn123", 12);
  const ltHash = await bcrypt.hash("lt123", 12);
  const ttHash = await bcrypt.hash("tt2_123", 12);

  // Xóa users cũ
  await prisma.userPermission.deleteMany({});
  await prisma.user.deleteMany({});

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: adminHash,
      hoTen: "Admin Hệ Thống",
      roleLabel: "Admin Tổng",
      isSuperAdmin: true,
      isActive: true,
    },
  });

  const gvcn = await prisma.user.create({
    data: {
      username: "gvcn",
      passwordHash: gvcnHash,
      hoTen: "Nguyễn Thị Lan",
      roleLabel: "GVCN",
      isSuperAdmin: false,
      isActive: true,
    },
  });

  // GVCN - toàn quyền mọi module
  const modules = ["hoc_sinh", "diem_danh", "su_kien", "bao_cao", "quy", "lich_truc"];
  for (const mod of modules) {
    await prisma.userPermission.create({
      data: { userId: gvcn.id, module: mod, level: "toan_quyen", scope: "toan_lop" },
    });
  }

  const lopTruong = await prisma.user.create({
    data: {
      username: "loptruong",
      passwordHash: ltHash,
      hoTen: "Trần Văn Minh",
      roleLabel: "Lớp trưởng",
      isSuperAdmin: false,
      isActive: true,
    },
  });

  // Lớp trưởng permissions
  await prisma.userPermission.createMany({
    data: [
      { userId: lopTruong.id, module: "hoc_sinh", level: "chi_xem", scope: "toan_lop" },
      { userId: lopTruong.id, module: "diem_danh", level: "toan_quyen", scope: "toan_lop" },
      { userId: lopTruong.id, module: "su_kien", level: "toan_quyen", scope: "toan_lop" },
      { userId: lopTruong.id, module: "bao_cao", level: "chi_xem", scope: "toan_lop" },
      { userId: lopTruong.id, module: "quy", level: "khong_co_quyen", scope: "toan_lop" },
      { userId: lopTruong.id, module: "lich_truc", level: "toan_quyen", scope: "toan_lop" },
    ],
  });

  const toTruong2 = await prisma.user.create({
    data: {
      username: "totruong2",
      passwordHash: ttHash,
      hoTen: "Lê Thị Cẩm",
      roleLabel: "Tổ trưởng Tổ 2",
      isSuperAdmin: false,
      isActive: true,
    },
  });

  // Tổ trưởng Tổ 2 permissions
  await prisma.userPermission.createMany({
    data: [
      { userId: toTruong2.id, module: "hoc_sinh", level: "khong_co_quyen", scope: "toan_lop" },
      { userId: toTruong2.id, module: "diem_danh", level: "toan_quyen", scope: "theo_to", scopeToIds: JSON.stringify([2]) },
      { userId: toTruong2.id, module: "su_kien", level: "toan_quyen", scope: "theo_to", scopeToIds: JSON.stringify([2]) },
      { userId: toTruong2.id, module: "bao_cao", level: "chi_xem", scope: "theo_to", scopeToIds: JSON.stringify([2]) },
      { userId: toTruong2.id, module: "quy", level: "khong_co_quyen", scope: "toan_lop" },
      { userId: toTruong2.id, module: "lich_truc", level: "khong_co_quyen", scope: "toan_lop" },
    ],
  });

  console.log(`   ✓ Đã tạo ${4} tài khoản:`);
  console.log(`     - admin / admin123 (Admin Tổng)`);
  console.log(`     - gvcn / gvcn123 (GVCN - toàn quyền)`);
  console.log(`     - loptruong / lt123 (Lớp trưởng)`);
  console.log(`     - totruong2 / tt2_123 (Tổ trưởng Tổ 2)`);

  console.log("\n✅ Seed hoàn tất! Chạy 'npm run dev' để bắt đầu.");
}

main()
  .catch((e) => {
    console.error("❌ Seed thất bại:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
