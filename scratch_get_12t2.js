const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { lop: "12T2" },
    orderBy: [{ to: "asc" }, { id: "asc" }],
  });
  console.log(JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
