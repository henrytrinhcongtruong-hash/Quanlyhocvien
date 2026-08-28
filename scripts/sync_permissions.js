const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncPermissions() {
  console.log("Starting permission synchronization...");

  // 1. Sync Tổ trưởng accounts
  const groupLeaders = [
    { username: "hoanghai", toNum: 1 },
    { username: "myhang", toNum: 2 },
    { username: "vantuan", toNum: 3 },
    { username: "trucle", toNum: 4 },
  ];

  for (const gl of groupLeaders) {
    const user = await prisma.user.findUnique({ where: { username: gl.username } });
    if (!user) {
      console.log(`User ${gl.username} not found, skipping.`);
      continue;
    }

    const perms = [
      { module: "hoc_sinh", level: "chi_xem", scope: "toan_lop", scopeToIds: "[]" },
      { module: "so_do_lop", level: "chi_xem", scope: "toan_lop", scopeToIds: "[]" },
      { module: "thoi_khoa_bieu", level: "chi_xem", scope: "toan_lop", scopeToIds: "[]" },
      { module: "lich_thi", level: "chi_xem", scope: "toan_lop", scopeToIds: "[]" },
      { module: "diem_danh", level: "toan_quyen", scope: "theo_to", scopeToIds: JSON.stringify([gl.toNum]) },
      { module: "quy", level: "khong_co_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "lich_truc", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "su_kien", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "bao_cao", level: "chi_xem", scope: "theo_to", scopeToIds: JSON.stringify([gl.toNum]) },
    ];

    for (const p of perms) {
      await prisma.userPermission.upsert({
        where: {
          userId_module: {
            userId: user.id,
            module: p.module,
          },
        },
        update: {
          level: p.level,
          scope: p.scope,
          scopeToIds: p.scopeToIds,
        },
        create: {
          userId: user.id,
          module: p.module,
          level: p.level,
          scope: p.scope,
          scopeToIds: p.scopeToIds,
        },
      });
    }

    console.log(`Updated permissions for Tổ Trưởng: ${user.hoTen} (${user.username}) - Tổ ${gl.toNum}`);
  }

  // 2. Sync Lớp Phó / Lớp Trưởng (maquocduy)
  const loptruong = await prisma.user.findUnique({ where: { username: "maquocduy" } });
  if (loptruong) {
    const lpPerms = [
      { module: "hoc_sinh", level: "chi_xem", scope: "toan_lop", scopeToIds: "[]" },
      { module: "so_do_lop", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "thoi_khoa_bieu", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "lich_thi", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "diem_danh", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "quy", level: "chi_xem", scope: "toan_lop", scopeToIds: "[]" },
      { module: "lich_truc", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "su_kien", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "bao_cao", level: "chi_xem", scope: "toan_lop", scopeToIds: "[]" },
    ];
    for (const p of lpPerms) {
      await prisma.userPermission.upsert({
        where: { userId_module: { userId: loptruong.id, module: p.module } },
        update: { level: p.level, scope: p.scope, scopeToIds: p.scopeToIds },
        create: { userId: loptruong.id, module: p.module, level: p.level, scope: p.scope, scopeToIds: p.scopeToIds },
      });
    }
    console.log(`Updated permissions for Ban cán sự: ${loptruong.hoTen} (${loptruong.username})`);
  }

  // 3. Sync GVCN (kimlien)
  const gvcn = await prisma.user.findUnique({ where: { username: "kimlien" } });
  if (gvcn) {
    const gvcnPerms = [
      { module: "hoc_sinh", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "so_do_lop", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "thoi_khoa_bieu", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "lich_thi", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "diem_danh", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "quy", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "lich_truc", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "su_kien", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
      { module: "bao_cao", level: "toan_quyen", scope: "toan_lop", scopeToIds: "[]" },
    ];
    for (const p of gvcnPerms) {
      await prisma.userPermission.upsert({
        where: { userId_module: { userId: gvcn.id, module: p.module } },
        update: { level: p.level, scope: p.scope, scopeToIds: p.scopeToIds },
        create: { userId: gvcn.id, module: p.module, level: p.level, scope: p.scope, scopeToIds: p.scopeToIds },
      });
    }
    console.log(`Updated permissions for GVCN: ${gvcn.hoTen} (${gvcn.username})`);
  }

  console.log("Permission synchronization completed successfully!");
}

syncPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
