const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const students11 = await prisma.student.findMany({
    where: { lop: "11AT3" },
    select: { id: true, hoTen: true, to: true, ghiChu: true },
  });
  console.log("11AT3 Students count:", students11.length);
  console.log("11AT3 Students with notes:", students11.filter(s => s.ghiChu));
}

main().catch(console.error).finally(() => prisma.$disconnect());
