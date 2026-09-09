const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { lop: '12T2' },
    orderBy: [{ to: 'asc' }, { hoTen: 'asc' }]
  });
  console.log('Lớp 12T2 (Tổng: ' + students.length + ' HS):');
  for (let t = 1; t <= 4; t++) {
    const inTo = students.filter(s => s.to === t);
    console.log(`\n=== TỔ ${t} (${inTo.length} HS) ===`);
    inTo.forEach(s => {
      console.log(`  [${s.id}] ${s.hoTen} | Ghi chú: ${s.ghiChu || 'none'}`);
    });
  }
}

main().finally(() => prisma.$disconnect());
