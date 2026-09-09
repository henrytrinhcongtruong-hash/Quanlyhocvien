const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    include: { permissions: true },
    orderBy: { id: 'asc' }
  });

  console.log(`Total users: ${users.length}\n`);
  for (const u of users.filter(x => x.id <= 6)) {
    console.log(`=== User ID ${u.id}: ${u.username} (${u.hoTen}) ===`);
    console.log(`Role: ${u.roleLabel} | Class: ${u.assignedLop} | SuperAdmin: ${u.isSuperAdmin} | Active: ${u.isActive}`);
    console.log(`Permissions (${u.permissions.length}):`);
    for (const p of u.permissions) {
      console.log(`  - [${p.module}] Level: ${p.level} | Scope: ${p.scope} | ScopeToIds: ${p.scopeToIds}`);
    }
    console.log('');
  }

  const studentSummary = await prisma.student.groupBy({
    by: ['lop', 'to'],
    _count: { id: true },
    orderBy: [{ lop: 'asc' }, { to: 'asc' }]
  });
  console.log('Students by Lop and To:');
  console.log(studentSummary);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

