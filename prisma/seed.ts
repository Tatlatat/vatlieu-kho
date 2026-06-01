import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1. Delete old data
  await prisma.stocktakeItem.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.stocktake.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create 2 users
  const passwordHash = await bcrypt.hash("123456", 10);

  const owner = await prisma.user.create({
    data: {
      email: "owner@vatlieu.vn",
      name: "Anh Chu",
      role: "OWNER",
      passwordHash,
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff@vatlieu.vn",
      name: "Anh Tam",
      role: "STAFF",
      passwordHash,
    },
  });

  // 3. Create 8 materials
  const materialData = [
    { name: "Xi mang PCB40", code: "XM-PCB40", unit: "bao", minStock: 20 },
    { name: "Thep phi 16", code: "TH-D16", unit: "cay", minStock: 50 },
    { name: "Thep phi 18", code: "TH-D18", unit: "cay", minStock: 50 },
    { name: "Cat vang", code: "CAT-VANG", unit: "m3", minStock: 5 },
    { name: "Da 1x2", code: "DA-1X2", unit: "m3", minStock: 5 },
    { name: "Gach ong", code: "GACH-ONG", unit: "vien", minStock: 500 },
    { name: "Gach the", code: "GACH-THE", unit: "vien", minStock: 500 },
    { name: "Son nuoc", code: "SON-NUOC", unit: "thung", minStock: 10 },
  ];

  const materials: { [code: string]: any } = {};
  for (const item of materialData) {
    const created = await prisma.material.create({
      data: item,
    });
    materials[item.code] = created;
  }

  // Helper to calculate date relative to now
  const getPastDate = (daysAgo: number) => {
    return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  };

  // 4. Create ~30 StockMovements spread across last 3 months
  const movementDefinitions = [
    // XM-PCB40 (Xi mang PCB40) - 5 movements
    { code: "XM-PCB40", type: "IN", quantity: 100, reason: "PURCHASE", daysAgo: 85, note: "Nhap hang dot 1" },
    { code: "XM-PCB40", type: "IN", quantity: 50, reason: "PURCHASE", daysAgo: 45, note: "Nhap hang dot 2" },
    { code: "XM-PCB40", type: "OUT", quantity: 60, reason: "PROJECT", daysAgo: 25, note: "Xuat cho cong trinh A" },
    { code: "XM-PCB40", type: "OUT", quantity: 5, reason: "PROJECT", daysAgo: 12, note: "Xuat cho cong trinh B" },
    { code: "XM-PCB40", type: "OUT", quantity: 10, reason: "NATURAL_LOSS", daysAgo: 5, note: "Hao hut do am uot" },

    // TH-D16 (Thep phi 16) - 4 movements
    { code: "TH-D16", type: "IN", quantity: 200, reason: "PURCHASE", daysAgo: 80, note: "Nhap kho thep d16" },
    { code: "TH-D16", type: "IN", quantity: 100, reason: "PURCHASE", daysAgo: 60, note: "Nhap bo sung" },
    { code: "TH-D16", type: "OUT", quantity: 80, reason: "PROJECT", daysAgo: 40, note: "Xuat lam mong" },
    { code: "TH-D16", type: "OUT", quantity: 5, reason: "DAMAGED", daysAgo: 15, note: "Cong venh khong dung duoc" },

    // TH-D18 (Thep phi 18) - 3 movements
    { code: "TH-D18", type: "IN", quantity: 150, reason: "PURCHASE", daysAgo: 75, note: "Nhap kho thep d18" },
    { code: "TH-D18", type: "IN", quantity: 50, reason: "PURCHASE", daysAgo: 35, note: "Nhap bo sung" },
    { code: "TH-D18", type: "OUT", quantity: 90, reason: "PROJECT", daysAgo: 12, note: "Xuat lam cot" },

    // CAT-VANG (Cat vang) - 3 movements
    { code: "CAT-VANG", type: "IN", quantity: 30, reason: "PURCHASE", daysAgo: 80, note: "Nhap cat vang san" },
    { code: "CAT-VANG", type: "OUT", quantity: 10, reason: "PROJECT", daysAgo: 50, note: "Xoay tron be tong" },
    { code: "CAT-VANG", type: "OUT", quantity: 2, reason: "NATURAL_LOSS", daysAgo: 20, note: "Bay mai do gio thoi" },

    // DA-1X2 (Da 1x2) - 4 movements
    { code: "DA-1X2", type: "IN", quantity: 40, reason: "PURCHASE", daysAgo: 70, note: "Nhap da" },
    { code: "DA-1X2", type: "OUT", quantity: 15, reason: "PROJECT", daysAgo: 40, note: "Do be tong san" },
    { code: "DA-1X2", type: "OUT", quantity: 1, reason: "DAMAGED", daysAgo: 10, note: "Da lan lon tap chat" },
    { code: "DA-1X2", type: "OUT", quantity: 5, reason: "PROJECT", daysAgo: 5, note: "Do san phu" },

    // GACH-ONG (Gach ong) - 4 movements
    { code: "GACH-ONG", type: "IN", quantity: 5000, reason: "PURCHASE", daysAgo: 85, note: "Nhap gach dot 1" },
    { code: "GACH-ONG", type: "IN", quantity: 2000, reason: "PURCHASE", daysAgo: 45, note: "Nhap gach dot 2" },
    { code: "GACH-ONG", type: "OUT", quantity: 3000, reason: "PROJECT", daysAgo: 30, note: "Xay tuong bao" },
    { code: "GACH-ONG", type: "OUT", quantity: 200, reason: "EXPIRED", daysAgo: 15, note: "Vo nat do van chuyen" },

    // GACH-THE (Gach the) - 3 movements
    { code: "GACH-THE", type: "IN", quantity: 4000, reason: "PURCHASE", daysAgo: 60, note: "Nhap gach the" },
    { code: "GACH-THE", type: "OUT", quantity: 1500, reason: "PROJECT", daysAgo: 25, note: "Xay trang tri" },
    { code: "GACH-THE", type: "OUT", quantity: 100, reason: "NATURAL_LOSS", daysAgo: 8, note: "Vo hao hut thi cong" },

    // SON-NUOC (Son nuoc) - 4 movements
    { code: "SON-NUOC", type: "IN", quantity: 50, reason: "PURCHASE", daysAgo: 55, note: "Nhap son" },
    { code: "SON-NUOC", type: "IN", quantity: 20, reason: "PURCHASE", daysAgo: 30, note: "Nhap bo sung son ngoai that" },
    { code: "SON-NUOC", type: "OUT", quantity: 20, reason: "PROJECT", daysAgo: 15, note: "Son phu tang 1" },
    { code: "SON-NUOC", type: "OUT", quantity: 2, reason: "EXPIRED", daysAgo: 5, note: "Hong thung son do nap khong ky" },
  ];

  for (const m of movementDefinitions) {
    const material = materials[m.code];
    await prisma.stockMovement.create({
      data: {
        materialId: material.id,
        type: m.type as "IN" | "OUT",
        quantity: m.quantity,
        reason: m.reason as any,
        note: m.note,
        createdById: staff.id,
        createdAt: getPastDate(m.daysAgo),
      },
    });
  }

  // 5. Create 1 Stocktake in DRAFT state
  // Calculated stocks for the first 3 materials:
  // - XM-PCB40: IN(100+50) - OUT(60+5+10) = 150 - 75 = 75
  // - TH-D16: IN(200+100) - OUT(80+5) = 300 - 85 = 215
  // - TH-D18: IN(150+50) - OUT(90) = 200 - 90 = 110

  const stocktake = await prisma.stocktake.create({
    data: {
      code: "KK-2026-01",
      status: "DRAFT",
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
