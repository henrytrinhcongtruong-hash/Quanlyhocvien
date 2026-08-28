// scratch/check_db.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.student.groupBy({
    by: ["lop"],
    _count: true,
  });
  console.log("Students by class:", classes);

  const fees12 = await prisma.feeCollection.findMany({
    where: { student: { lop: "12T2" } },
    select: { soTien: true, trangThai: true, kyThu: true },
  });
  console.log("12T2 Fees count:", fees12.length);

  const fees11 = await prisma.feeCollection.findMany({
    where: { student: { lop: "11AT3" } },
    select: { soTien: true, trangThai: true, kyThu: true },
  });
  console.log("11AT3 Fees count:", fees11.length);

  const expenses = await prisma.expense.findMany();
  console.log("Total expenses:", expenses.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
