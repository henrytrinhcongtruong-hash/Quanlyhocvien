const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { lop: "12T2" },
    orderBy: [{ to: "asc" }, { id: "asc" }],
  });

  console.log(`TỔNG SỐ HỌC SINH 12T2: ${students.length}\n`);

  for (let to = 1; to <= 4; to++) {
    const toStudents = students.filter((s) => s.to === to);
    console.log(`=== TỔ ${to} (${toStudents.length} học sinh) ===`);
    toStudents.forEach((s, idx) => {
      console.log(
        `${idx + 1}. [ID: ${s.id}] ${s.hoTen} | ${s.gioiTinh} | ${s.ghiChu ? `(${s.ghiChu})` : ""}`
      );
    });
    console.log("");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
