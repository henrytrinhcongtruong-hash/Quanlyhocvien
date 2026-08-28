const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.seatingChart.updateMany({
    where: { lop: "12T2" },
    data: {
      title: "SƠ ĐỒ LỚP 12T2",
      gvcn: "CHỀNH KIM LIÊN",
      slogan: "12T2 CÙNG NHAU VƯỢT VŨ MÔN, CÙNG NHAU CHIẾN THẮNG! 100% ĐẬU TỐT NGHIỆP – WE ARE WINNERS! 🏆",
    },
  });
  console.log("Updated Seating Charts:", updated);
}

main().catch(console.error).finally(() => prisma.$disconnect());
