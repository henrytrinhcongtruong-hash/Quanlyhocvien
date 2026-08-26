// prisma/seed_12t2.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const STUDENTS_12T2 = [
  { stt: 1, hoTen: "Lê Nguyễn Hoàng Anh", tenGoi: "Anh", lopCu: "11AT3", gioiTinh: "Nam", to: 1 },
  { stt: 2, hoTen: "Phạm Nguyễn Quỳnh Anh", tenGoi: "Anh", lopCu: "11AT3", gioiTinh: "Nữ", to: 1 },
  { stt: 3, hoTen: "Nguyễn Thị Hồng Anh", tenGoi: "Anh", lopCu: "11AT3", gioiTinh: "Nữ", to: 1 },
  { stt: 4, hoTen: "Nguyễn Tuấn Anh", tenGoi: "Anh", lopCu: "11AT3", gioiTinh: "Nam", to: 1 },
  { stt: 5, hoTen: "Đặng Vân Anh", tenGoi: "Anh", lopCu: "11AT4", gioiTinh: "Nữ", to: 1 },
  { stt: 6, hoTen: "Phan Gia Bảo", tenGoi: "Bảo", lopCu: "11AT3", gioiTinh: "Nam", to: 1 },
  { stt: 7, hoTen: "Nguyễn Hoài Bảo", tenGoi: "Bảo", lopCu: "11AT4", gioiTinh: "Nam", to: 1 },
  { stt: 8, hoTen: "Hoàng Việt Danh", tenGoi: "Danh", lopCu: "11AT3", gioiTinh: "Nam", to: 1 },
  { stt: 9, hoTen: "Mã Quốc Duy", tenGoi: "Duy", lopCu: "11AT3", gioiTinh: "Nam", to: 1 },
  { stt: 10, hoTen: "Nguyễn Minh Đức", tenGoi: "Đức", lopCu: "11AT3", gioiTinh: "Nam", to: 1 },
  { stt: 11, hoTen: "Nguyễn Hoàng Tấn Hào", tenGoi: "Hào", lopCu: "11AT3", gioiTinh: "Nam", to: 1 },
  { stt: 12, hoTen: "Thân Lê Hoàng Hải", tenGoi: "Hải", lopCu: "11AT4", gioiTinh: "Nam", to: 1 },
  { stt: 13, hoTen: "Nguyễn Trương Mỹ Hằng", tenGoi: "Hằng", lopCu: "11AT4", gioiTinh: "Nữ", to: 1 },
  { stt: 14, hoTen: "Lê Nhã Hân", tenGoi: "Hân", lopCu: "CT-AT", gioiTinh: "Nữ", to: 1 },
  { stt: 15, hoTen: "Đỗ Huỳnh Thanh Hiếu", tenGoi: "Hiếu", lopCu: "11AT4", gioiTinh: "Nam", to: 2 },
  { stt: 16, hoTen: "Phạm Minh Hiển", tenGoi: "Hiển", lopCu: "11AT3", gioiTinh: "Nam", to: 2 },
  { stt: 17, hoTen: "Lưu Ngọc Quỳnh Hoa", tenGoi: "Hoa", lopCu: "11AT3", gioiTinh: "Nữ", to: 2 },
  { stt: 18, hoTen: "Đặng Thị Mỹ Hòa", tenGoi: "Hòa", lopCu: "11AT3", gioiTinh: "Nữ", to: 2 },
  { stt: 19, hoTen: "Nguyễn Xuân Hợp", tenGoi: "Hợp", lopCu: "11AT3", gioiTinh: "Nam", to: 2 },
  { stt: 20, hoTen: "Phan Gia Khang", tenGoi: "Khang", lopCu: "11AT3", gioiTinh: "Nam", to: 2 },
  { stt: 21, hoTen: "Phan Hoàng Kiên", tenGoi: "Kiên", lopCu: "11AT4", gioiTinh: "Nam", to: 2 },
  { stt: 22, hoTen: "Tăng Văn Lâm", tenGoi: "Lâm", lopCu: "11AT4", gioiTinh: "Nam", to: 2 },
  { stt: 23, hoTen: "Võ Thị Trúc Lệ", tenGoi: "Lệ", lopCu: "11AT4", gioiTinh: "Nữ", to: 2 },
  { stt: 24, hoTen: "Phạm Bùi Phương Linh", tenGoi: "Linh", lopCu: "11AT4", gioiTinh: "Nữ", to: 2 },
  { stt: 25, hoTen: "Hà Thị Diễm My", tenGoi: "My", lopCu: "11AT3", gioiTinh: "Nữ", to: 2 },
  { stt: 26, hoTen: "Hoàng Bảo Nam", tenGoi: "Nam", lopCu: "11AT3", gioiTinh: "Nam", to: 2 },
  { stt: 27, hoTen: "Đào Ngọc Nam", tenGoi: "Nam", lopCu: "11AT4", gioiTinh: "Nam", to: 2 },
  { stt: 28, hoTen: "Nguyễn Thị Khánh Ngọc", tenGoi: "Ngọc", lopCu: "11AT3", gioiTinh: "Nữ", to: 3 },
  { stt: 29, hoTen: "Huỳnh Thị Mỹ Ngọc", tenGoi: "Ngọc", lopCu: "11AT4", gioiTinh: "Nữ", to: 3 },
  { stt: 30, hoTen: "Lê Trần Bảo Ngọc", tenGoi: "Ngọc", lopCu: "11AT3", gioiTinh: "Nữ", to: 3 },
  { stt: 31, hoTen: "Trần Ngọc Nhiên", tenGoi: "Nhiên", lopCu: "11AT3", gioiTinh: "Nữ", to: 3 },
  { stt: 32, hoTen: "Trần Phong", tenGoi: "Phong", lopCu: "11AT3", gioiTinh: "Nam", to: 3 },
  { stt: 33, hoTen: "Nguyễn Vĩnh Thiên Phúc", tenGoi: "Phúc", lopCu: "11AT3", gioiTinh: "Nam", to: 3 },
  { stt: 34, hoTen: "Nguyễn Mai Phương", tenGoi: "Phương", lopCu: "11AT4", gioiTinh: "Nữ", to: 3 },
  { stt: 35, hoTen: "Nguyễn Ngọc Anh Phương", tenGoi: "Phương", lopCu: "11AT3", gioiTinh: "Nữ", to: 3 },
  { stt: 36, hoTen: "Nguyễn Phúc Xuyên Phương", tenGoi: "Phương", lopCu: "11AT3", gioiTinh: "Nữ", to: 3 },
  { stt: 37, hoTen: "Huỳnh Thanh Quang", tenGoi: "Quang", lopCu: "11AT3", gioiTinh: "Nam", to: 3 },
  { stt: 38, hoTen: "Trần Hoàng Quân", tenGoi: "Quân", lopCu: "11AT3", gioiTinh: "Nam", to: 3 },
  { stt: 39, hoTen: "Phạm Đinh Ngọc Nhã Quỳnh", tenGoi: "Quỳnh", lopCu: "11AT4", gioiTinh: "Nữ", to: 3 },
  { stt: 40, hoTen: "Thạch Phan Minh Sang", tenGoi: "Sang", lopCu: "11AT4", gioiTinh: "Nam", to: 3 },
  { stt: 41, hoTen: "Nguyễn Tấn Sang", tenGoi: "Sang", lopCu: "11AT3", gioiTinh: "Nam", to: 4 },
  { stt: 42, hoTen: "Lê Cao Chánh Thông", tenGoi: "Thông", lopCu: "11AT3", gioiTinh: "Nam", to: 4 },
  { stt: 43, hoTen: "Lê Thị Thủy", tenGoi: "Thủy", lopCu: "11AT4", gioiTinh: "Nữ", to: 4 },
  { stt: 44, hoTen: "Nguyễn Ngọc Anh Thư", tenGoi: "Thư", lopCu: "11AT3", gioiTinh: "Nữ", to: 4 },
  { stt: 45, hoTen: "Huỳnh Văn Tiền", tenGoi: "Tiền", lopCu: "11AT4", gioiTinh: "Nam", to: 4 },
  { stt: 46, hoTen: "Lê Đức Trọng", tenGoi: "Trọng", lopCu: "11AT3", gioiTinh: "Nam", to: 4 },
  { stt: 47, hoTen: "Trịnh Công Trường", tenGoi: "Trường", lopCu: "11AT3", gioiTinh: "Nam", to: 4 },
  { stt: 48, hoTen: "Lâm Văn Tuấn", tenGoi: "Tuấn", lopCu: "11AT3", gioiTinh: "Nam", to: 4 },
  { stt: 49, hoTen: "Vũ Ngọc Minh Tuyết", tenGoi: "Tuyết", lopCu: "11AT3", gioiTinh: "Nữ", to: 4 },
  { stt: 50, hoTen: "Nguyễn Thanh Tú", tenGoi: "Tú", lopCu: "11AT3", gioiTinh: "Nam", to: 4 },
  { stt: 51, hoTen: "Phạm Phương Uyên", tenGoi: "Uyên", lopCu: "11AT3", gioiTinh: "Nữ", to: 4 },
  { stt: 52, hoTen: "Nguyễn Thị Kim Yến", tenGoi: "Yến", lopCu: "11AT4", gioiTinh: "Nữ", to: 4 },
  { stt: 53, hoTen: "Đoàn Thị Hòa", tenGoi: "Hòa", lopCu: "CT-AT", gioiTinh: "Nữ", to: 4 },
];

async function main() {
  console.log("🌱 Bắt đầu thêm danh sách học sinh Lớp 12T2...\n");

  // Xóa danh sách cũ của 12T2 nếu có để tránh trùng
  await prisma.student.deleteMany({ where: { lop: "12T2" } });

  const createdStudents = [];
  for (const s of STUDENTS_12T2) {
    const student = await prisma.student.create({
      data: {
        hoTen: s.hoTen,
        tenGoi: s.tenGoi,
        gioiTinh: s.gioiTinh,
        to: s.to,
        lop: "12T2",
        ghiChu: `Lớp cũ: ${s.lopCu}`,
      },
    });
    createdStudents.push(student);
  }
  console.log(`   ✓ Đã thêm thành công ${createdStudents.length} học sinh vào Lớp 12T2`);

  // Tạo quỹ mẫu cho 12T2
  console.log("💰 Đang tạo quỹ mẫu cho Lớp 12T2...");
  for (const s of createdStudents) {
    const isPaid = Math.random() > 0.15;
    await prisma.feeCollection.create({
      data: {
        studentId: s.id,
        kyThu: "HK1",
        soTien: 350000,
        hinhThucDong: Math.random() > 0.5 ? "Chuyển Khoản" : "Tiền Mặt",
        trangThai: isPaid ? "Đã Đóng" : "Chưa Đóng",
        ngayDong: isPaid ? new Date(2025, 8, Math.floor(Math.random() * 20) + 1) : null,
      },
    });
  }
  console.log("   ✓ Đã tạo dữ liệu thu quỹ HK1 cho Lớp 12T2");

  // Tạo tài khoản GVCN cho 12T2
  console.log("👤 Đang tạo tài khoản GVCN Lớp 12T2...");
  const gvcnPass = await bcrypt.hash("gvcn123", 12);
  const user12T2 = await prisma.user.upsert({
    where: { username: "gvcn_12t2" },
    update: { assignedLop: "12T2" },
    create: {
      username: "gvcn_12t2",
      passwordHash: gvcnPass,
      hoTen: "Nguyễn Văn Tuấn",
      roleLabel: "GVCN 12T2",
      assignedLop: "12T2",
      isSuperAdmin: false,
      isActive: true,
    },
  });

  const modules = ["hoc_sinh", "diem_danh", "su_kien", "bao_cao", "quy", "lich_truc"];
  for (const mod of modules) {
    await prisma.userPermission.upsert({
      where: { userId_module: { userId: user12T2.id, module: mod } },
      update: { level: "toan_quyen", scope: "toan_lop" },
      create: { userId: user12T2.id, module: mod, level: "toan_quyen", scope: "toan_lop" },
    });
  }
  console.log("   ✓ Đã tạo tài khoản: gvcn_12t2 / gvcn123 (GVCN Lớp 12T2)");

  console.log("\n✅ Hoàn tất thêm Lớp 12T2!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
