const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    select: { id: true, hoTen: true, to: true, lop: true, ghiChu: true }
  });
  console.log('Total students:', students.length);
  
  const truong = students.filter(s => s.hoTen.toLowerCase().includes('trường'));
  console.log('Tìm học sinh Tên Trường:', truong);

  const canSu = students.filter(s => s.ghiChu && (s.ghiChu.toLowerCase().includes('trưởng') || s.ghiChu.toLowerCase().includes('phó')));
  console.log('Học sinh có chức vụ (ghiChu):', canSu);

  // Check users as well
  const users = await prisma.user.findMany({
    select: { id: true, username: true, hoTen: true, roleLabel: true }
  });
  console.log('Users có chức vụ:', users.filter(u => u.roleLabel));
}

main().finally(() => prisma.$disconnect());
