const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const users = await prisma.user.findMany({
    include: { permissions: true }
  });
  console.log("Total users in DB:", users.length);
  for (const u of users) {
    console.log(`\n=== USER: ${u.username} (id: ${u.id}, hoTen: ${u.hoTen}, roleLabel: ${u.roleLabel}, assignedLop: ${u.assignedLop}, isSuperAdmin: ${u.isSuperAdmin}) ===`);
    console.log("Permissions count:", u.permissions.length);
    for (const p of u.permissions) {
      console.log(`  - [${p.module}]: level=${p.level}, scope=${p.scope}, scopeToIds=${p.scopeToIds}`);
    }
  }
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
