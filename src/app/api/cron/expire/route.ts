import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expired = await prisma.reservation.findMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
    });

    if (expired.length === 0) {
      return NextResponse.json({ message: "Nothing to release", released: 0 });
    }

    let released = 0;

    for (const r of expired) {
      try {
        await prisma.$transaction([
          prisma.reservation.update({ where: { id: r.id }, data: { status: "RELEASED" } }),
          prisma.inventory.update({
            where: { productId_warehouseId: { productId: r.productId, warehouseId: r.warehouseId } },
            data:  { reservedUnits: { decrement: r.quantity } },
          }),
        ]);
        released++;
      } catch (err) {
        console.error(`Could not release reservation ${r.id}:`, err);
      }
    }

    console.log(`[CRON] Released ${released} expired reservation(s)`);
    return NextResponse.json({ message: "Done", released });

  } catch (err) {
    console.error("[CRON expire]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}