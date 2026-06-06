/**
 * Di trú data 1 lần: tạo Project từ Kho/Quỹ hiện có và gán projectId.
 * Idempotent (upsert theo code + bỏ qua nếu đã gán) → chạy lại an toàn.
 * Quy tắc: 1 CT = 1 kho. Mỗi Warehouse -> 1 Project (code = CT-<mã kho>).
 *          Mỗi Fund -> khớp Project trùng tên kho; không có -> tạo theo quỹ.
 *
 * CHẠY: npx tsx prisma/migrate-project-data.ts
 * (Trên production: set DATABASE_URL production, KIỂM tên kho/quỹ TRƯỚC khi chạy.)
 */
import { prisma } from "../lib/prisma";

async function main() {
  const warehouses = await prisma.warehouse.findMany();
  for (const w of warehouses) {
    if (w.projectId) {
      console.log(`Warehouse ${w.name} đã có Project, bỏ qua.`);
      continue;
    }
    const code = `CT-${w.code}`;
    const proj = await prisma.project.upsert({
      where: { code },
      update: {},
      create: { code, name: w.name },
    });
    await prisma.warehouse.update({ where: { id: w.id }, data: { projectId: proj.id } });
    console.log(`Warehouse "${w.name}" -> Project "${proj.code}"`);
  }

  const funds = await prisma.fund.findMany();
  for (const f of funds) {
    if (f.projectId) {
      console.log(`Fund ${f.name} đã có Project, bỏ qua.`);
      continue;
    }
    const byName = await prisma.project.findFirst({ where: { name: f.name } });
    const proj =
      byName ??
      (await prisma.project.upsert({
        where: { code: `CT-${f.code}` },
        update: {},
        create: { code: `CT-${f.code}`, name: f.name },
      }));
    await prisma.fund.update({ where: { id: f.id }, data: { projectId: proj.id } });
    console.log(`Fund "${f.name}" -> Project "${proj.code}"`);
  }

  const [nProj, nWhNull, nFundNull] = await Promise.all([
    prisma.project.count(),
    prisma.warehouse.count({ where: { projectId: null } }),
    prisma.fund.count({ where: { projectId: null } }),
  ]);
  console.log(`\n== KẾT QUẢ == Project: ${nProj} | Kho chưa gán: ${nWhNull} | Quỹ chưa gán: ${nFundNull}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
