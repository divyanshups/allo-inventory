import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const [delhi, mumbai, bangalore] = await Promise.all([
    prisma.warehouse.create({
      data: { name: "Delhi Hub", location: "New Delhi, India" },
    }),
    prisma.warehouse.create({
      data: { name: "Mumbai Hub", location: "Mumbai, India" },
    }),
    prisma.warehouse.create({
      data: { name: "Bangalore Hub", location: "Bangalore, India" },
    }),
  ]);

  const [lipstick, serum, sunscreen, foundation] = await Promise.all([
    prisma.product.create({
      data: {
        name: "Liquid Lipstick",
        sku: "LP001",
        description: "Long-lasting lipstick.",
        price: 799,
      },
    }),
    prisma.product.create({
      data: {
        name: "Face Serum",
        sku: "SM001",
        description: "Brightening serum.",
        price: 1299,
      },
    }),
    prisma.product.create({
      data: {
        name: "SPF 50 Sunscreen",
        sku: "SN001",
        description: "Lightweight sunscreen.",
        price: 599,
      },
    }),
    prisma.product.create({
      data: {
        name: "Foundation",
        sku: "FN001",
        description: "Smooth foundation.",
        price: 999,
      },
    }),
  ]);

  await prisma.inventory.createMany({
    data: [
      { productId: lipstick.id,   warehouseId: delhi.id,     totalUnits: 15 },
      { productId: lipstick.id,   warehouseId: mumbai.id,    totalUnits: 10 },
      { productId: lipstick.id,   warehouseId: bangalore.id, totalUnits: 8 },

      { productId: serum.id,      warehouseId: delhi.id,     totalUnits: 12 },
      { productId: serum.id,      warehouseId: mumbai.id,    totalUnits: 6 },
      { productId: serum.id,      warehouseId: bangalore.id, totalUnits: 4 },

      { productId: sunscreen.id,  warehouseId: delhi.id,     totalUnits: 25 },
      { productId: sunscreen.id,  warehouseId: mumbai.id,    totalUnits: 18 },
      { productId: sunscreen.id,  warehouseId: bangalore.id, totalUnits: 10 },

      { productId: foundation.id, warehouseId: delhi.id,     totalUnits: 7 },
      { productId: foundation.id, warehouseId: mumbai.id,    totalUnits: 5 },
      { productId: foundation.id, warehouseId: bangalore.id, totalUnits: 9 },
    ],
  });

  console.log("Seeded: 4 cosmetics, 3 warehouses, 12 inventory rows");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());