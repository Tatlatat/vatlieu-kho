import { PrismaClient, Material, MovementType, MovementReason } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  // 1. Delete old data. Keep this aligned with schema relations so reseeding works on non-empty DBs.
  await prisma.cashEntry.deleteMany({});
  await prisma.stocktakeItem.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.equipmentLog.deleteMany({});
  await prisma.documentEquipmentLine.deleteMany({});
  await prisma.documentLine.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.stocktake.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.equipment.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.fund.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create demo users
  const passwordHash = await bcrypt.hash("123456", 10);

  await prisma.user.create({
    data: {
      email: "owner@vatlieu.vn",
      name: "Anh Chu",
      role: "ADMIN",
      passwordHash,
    },
  });

  await prisma.user.create({
    data: {
      email: "manager@vatlieu.vn",
      name: "Chị Lan",
      role: "MANAGER",
      passwordHash,
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff@vatlieu.vn",
      name: "Anh Tam",
      role: "KEEPER",
      passwordHash,
    },
  });

  // 3. Create fixed units
  const units = await Promise.all([
    prisma.unit.create({ data: { code: "KG", name: "kg" } }),
    prisma.unit.create({ data: { code: "BAO", name: "bao" } }),
    prisma.unit.create({ data: { code: "CAY", name: "cây" } }),
    prisma.unit.create({ data: { code: "M3", name: "m³" } }),
    prisma.unit.create({ data: { code: "MD", name: "md" } }),
    prisma.unit.create({ data: { code: "VIEN", name: "viên" } }),
    prisma.unit.create({ data: { code: "THUNG", name: "thùng" } }),
  ]);
  const unitByName = Object.fromEntries(units.map((u) => [u.name, u]));

  // 4. Create 2 suppliers
  await prisma.supplier.createMany({
    data: [
      { code: "NCC001", name: "Công ty TNHH Xi măng ABC", taxCode: "0101234567" },
      { code: "NCC002", name: "Công ty CP Thép Đông Á", taxCode: "0207654321" },
    ],
  });

  // 5. Create demo materials
  const materialData = [
    { name: "Xi măng PCB40", code: "XM-PCB40", unit: "bao", unitName: "bao", minStock: 20 },
    { name: "Thép D10", code: "THEP-D10", unit: "cây", unitName: "cây", minStock: 50 },
    { name: "Thép phi 16", code: "TH-D16", unit: "cây", unitName: "cây", minStock: 50 },
    { name: "Thép phi 18", code: "TH-D18", unit: "cây", unitName: "cây", minStock: 50 },
    { name: "Cát vàng", code: "CAT-VANG", unit: "m³", unitName: "m³", minStock: 5 },
    { name: "Đá 1x2", code: "DA-1X2", unit: "m³", unitName: "m³", minStock: 5 },
    { name: "Gạch ống", code: "GACH-ONG", unit: "viên", unitName: "viên", minStock: 500 },
    { name: "Gạch thẻ", code: "GACH-THE", unit: "viên", unitName: "viên", minStock: 500 },
    { name: "Sơn nước", code: "SON-NUOC", unit: "thùng", unitName: "thùng", minStock: 10 },
  ];

  const materials: { [code: string]: Material } = {};
  for (const item of materialData) {
    const created = await prisma.material.create({
      data: {
        name: item.name,
        code: item.code,
        unit: item.unit,
        unitId: unitByName[item.unitName].id,
        minStock: item.minStock,
      },
    });
    materials[item.code] = created;
  }

  // Helper to calculate date relative to now
  const getPastDate = (daysAgo: number) => {
    return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  };

  // 6. Create 2 warehouses
  const khoChinh = await prisma.warehouse.upsert({
    where: { code: "KHO-CHINH" },
    update: {},
    create: { name: "Kho chính", code: "KHO-CHINH", isDefault: true },
  });
  const khoCongTrinh = await prisma.warehouse.upsert({
    where: { code: "KHO-CT-A" },
    update: {},
    create: { name: "Kho công trình A", code: "KHO-CT-A", isDefault: false },
  });

  // 7. Create ~30 StockMovements spread across last 3 months
  const movementDefinitions = [
    // XM-PCB40 (Xi măng PCB40) - 5 movements
    { code: "XM-PCB40", type: "IN", quantity: 100, reason: "PURCHASE", daysAgo: 85, note: "Nhập hàng đợt 1" },
    { code: "XM-PCB40", type: "IN", quantity: 50, reason: "PURCHASE", daysAgo: 45, note: "Nhập hàng đợt 2" },
    { code: "XM-PCB40", type: "OUT", quantity: 60, reason: "PROJECT", daysAgo: 25, note: "Xuất cho công trình A" },
    { code: "XM-PCB40", type: "OUT", quantity: 5, reason: "PROJECT", daysAgo: 12, note: "Xuất cho công trình B" },
    { code: "XM-PCB40", type: "OUT", quantity: 10, reason: "NATURAL_LOSS", daysAgo: 5, note: "Hao hụt do ẩm ướt" },

    // TH-D16 (Thép phi 16) - 4 movements
    { code: "TH-D16", type: "IN", quantity: 200, reason: "PURCHASE", daysAgo: 80, note: "Nhập kho thép phi 16" },
    { code: "TH-D16", type: "IN", quantity: 100, reason: "PURCHASE", daysAgo: 60, note: "Nhập bổ sung" },
    { code: "TH-D16", type: "OUT", quantity: 80, reason: "PROJECT", daysAgo: 40, note: "Xuất làm móng" },
    { code: "TH-D16", type: "OUT", quantity: 5, reason: "DAMAGED", daysAgo: 15, note: "Cong vênh không dùng được" },

    // TH-D18 (Thép phi 18) - 3 movements
    { code: "TH-D18", type: "IN", quantity: 150, reason: "PURCHASE", daysAgo: 75, note: "Nhập kho thép phi 18" },
    { code: "TH-D18", type: "IN", quantity: 50, reason: "PURCHASE", daysAgo: 35, note: "Nhập bổ sung" },
    { code: "TH-D18", type: "OUT", quantity: 90, reason: "PROJECT", daysAgo: 12, note: "Xuất làm cột" },

    // CAT-VANG (Cát vàng) - 3 movements
    { code: "CAT-VANG", type: "IN", quantity: 30, reason: "PURCHASE", daysAgo: 80, note: "Nhập cát vàng sạn" },
    { code: "CAT-VANG", type: "OUT", quantity: 10, reason: "PROJECT", daysAgo: 50, note: "Xoay trộn bê tông" },
    { code: "CAT-VANG", type: "OUT", quantity: 2, reason: "NATURAL_LOSS", daysAgo: 20, note: "Bay mất do gió thổi" },

    // DA-1X2 (Đá 1x2) - 4 movements
    { code: "DA-1X2", type: "IN", quantity: 40, reason: "PURCHASE", daysAgo: 70, note: "Nhập đá" },
    { code: "DA-1X2", type: "OUT", quantity: 15, reason: "PROJECT", daysAgo: 40, note: "Đổ bê tông sàn" },
    { code: "DA-1X2", type: "OUT", quantity: 1, reason: "DAMAGED", daysAgo: 10, note: "Đá lẫn lộn tạp chất" },
    { code: "DA-1X2", type: "OUT", quantity: 5, reason: "PROJECT", daysAgo: 5, note: "Đổ sàn phụ" },

    // GACH-ONG (Gạch ống) - 4 movements
    { code: "GACH-ONG", type: "IN", quantity: 5000, reason: "PURCHASE", daysAgo: 85, note: "Nhập gạch đợt 1" },
    { code: "GACH-ONG", type: "IN", quantity: 2000, reason: "PURCHASE", daysAgo: 45, note: "Nhập gạch đợt 2" },
    { code: "GACH-ONG", type: "OUT", quantity: 3000, reason: "PROJECT", daysAgo: 30, note: "Xây tường bao" },
    { code: "GACH-ONG", type: "OUT", quantity: 200, reason: "EXPIRED", daysAgo: 15, note: "Vỡ nát do vận chuyển" },

    // GACH-THE (Gạch thẻ) - 3 movements
    { code: "GACH-THE", type: "IN", quantity: 4000, reason: "PURCHASE", daysAgo: 60, note: "Nhập gạch thẻ" },
    { code: "GACH-THE", type: "OUT", quantity: 1500, reason: "PROJECT", daysAgo: 25, note: "Xây trang trí" },
    { code: "GACH-THE", type: "OUT", quantity: 100, reason: "NATURAL_LOSS", daysAgo: 8, note: "Vỡ hao hụt thi công" },

    // SON-NUOC (Sơn nước) - 4 movements
    { code: "SON-NUOC", type: "IN", quantity: 50, reason: "PURCHASE", daysAgo: 55, note: "Nhập sơn" },
    { code: "SON-NUOC", type: "IN", quantity: 20, reason: "PURCHASE", daysAgo: 30, note: "Nhập bổ sung sơn ngoại thất" },
    { code: "SON-NUOC", type: "OUT", quantity: 20, reason: "PROJECT", daysAgo: 15, note: "Sơn phủ tầng 1" },
    { code: "SON-NUOC", type: "OUT", quantity: 2, reason: "EXPIRED", daysAgo: 5, note: "Hỏng thùng sơn do nắp không kỹ" },
  ];

  for (const m of movementDefinitions) {
    const material = materials[m.code];
    await prisma.stockMovement.create({
      data: {
        materialId: material.id,
        warehouseId: khoChinh.id,
        type: m.type as MovementType,
        quantity: m.quantity,
        reason: m.reason as MovementReason,
        note: m.note,
        createdById: staff.id,
        createdAt: getPastDate(m.daysAgo),
      },
    });
  }

  // Demo transfer: 20 GACH-ONG from Kho chính → Kho công trình A
  const transferId = randomUUID();
  const gachOng = materials["GACH-ONG"];
  await prisma.stockMovement.create({
    data: {
      materialId: gachOng.id,
      warehouseId: khoChinh.id,
      type: "OUT",
      quantity: 20,
      reason: "TRANSFER_OUT",
      note: "Chuyển ra công trình A",
      transferId,
      createdById: staff.id,
      createdAt: getPastDate(3),
    },
  });
  await prisma.stockMovement.create({
    data: {
      materialId: gachOng.id,
      warehouseId: khoCongTrinh.id,
      type: "IN",
      quantity: 20,
      reason: "TRANSFER_IN",
      note: "Chuyển ra công trình A",
      transferId,
      createdById: staff.id,
      createdAt: getPastDate(3),
    },
  });

  // 8. Create 1 Stocktake in DRAFT state
  // Calculated stocks for the first 3 materials:
  // - XM-PCB40: IN(100+50) - OUT(60+5+10) = 150 - 75 = 75
  // - TH-D16: IN(200+100) - OUT(80+5) = 300 - 85 = 215
  // - TH-D18: IN(150+50) - OUT(90) = 200 - 90 = 110

  await prisma.stocktake.create({
    data: {
      code: "KK-2026-01",
      status: "DRAFT",
      warehouseId: khoChinh.id,
      createdById: staff.id,
      items: {
        create: [
          {
            materialId: materials["XM-PCB40"].id,
            systemQty: 75,
            countedQty: 73,
            diff: -2,
          },
          {
            materialId: materials["TH-D16"].id,
            systemQty: 215,
            countedQty: 212,
            diff: -3,
          },
          {
            materialId: materials["TH-D18"].id,
            systemQty: 110,
            countedQty: 108,
            diff: -2,
          },
        ],
      },
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
