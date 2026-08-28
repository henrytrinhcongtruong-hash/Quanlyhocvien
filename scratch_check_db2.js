const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const fees12 = await prisma.feeCollection.findMany({
    where: { student: { lop: "12T2" } },
    select: { soTien: true, trangThai: true, kyThu: true },
  });
  console.log("12T2 Fees detail:", fees12.slice(0, 5));
  const tongThu12 = fees12.filter(f => f.trangThai === "Đã Đóng").reduce((s, f) => s + f.soTien, 0);
  console.log("12T2 tongThu:", tongThu12);

  const fees11 = await prisma.feeCollection.findMany({
    where: { student: { lop: "11AT3" } },
    select: { soTien: true, trangThai: true, kyThu: true },
  });
  console.log("11AT3 Fees detail:", fees11.slice(0, 5));
  const tongThu11 = fees11.filter(f => f.trangThai === "Đã Đóng").reduce((s, f) => s + f.soTien, 0);
  console.log("11AT3 tongThu:", tongThu11);
}

main().catch(console.error).finally(() => prisma.$disconnect());
