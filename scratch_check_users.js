const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, hoTen: true, roleLabel: true, assignedLop: true, isSuperAdmin: true, isActive: true },
  });
  console.log("Users in DB:", users);

  const perms = await prisma.userPermission.findMany({
    include: { user: { select: { username: true } } },
  });
  console.log("Permissions in DB:", perms);
}

main().catch(console.error).finally(() => prisma.$disconnect());
