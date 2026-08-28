const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const charts = await prisma.seatingChart.findMany({
    select: { id: true, lop: true, month: true, title: true, gvcn: true, slogan: true, updatedAt: true },
  });
  console.log("Seating Charts in DB:", charts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
