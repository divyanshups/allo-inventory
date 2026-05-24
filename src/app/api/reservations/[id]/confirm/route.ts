import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const idempotencyKey = req.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const cached = await prisma.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });
      if (cached) return NextResponse.json(cached.body, { status: cached.statusCode });
    }

    const r = await prisma.reservation.findUnique({ where: { id } });

    if (!r) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (r.status === "CONFIRMED") {
      return NextResponse.json({ message: "Already confirmed", id });
    }

    if (r.status === "RELEASED") {
      return NextResponse.json(
        { error: "This reservation was already released." },
        { status: 410 }
      );
    }


    if (new Date() > r.expiresAt) {
      await prisma.$transaction([
        prisma.reservation.update({ where: { id }, data: { status: "RELEASED" } }),
        prisma.inventory.update({
          where: { productId_warehouseId: { productId: r.productId, warehouseId: r.warehouseId } },
          data:  { reservedUnits: { decrement: r.quantity } },
        }),
      ]);

      const body = { error: "This reservation expired. The unit has been returned to stock." };
      if (idempotencyKey) {
        await prisma.idempotencyRecord.create({
          data: { key: idempotencyKey, statusCode: 410, body },
        });
      }
      return NextResponse.json(body, { status: 410 });
    }


    const confirmed = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id },
        data:  { status: "CONFIRMED" },
        include: { product: true, warehouse: true },
      });

      await tx.inventory.update({
        where: { productId_warehouseId: { productId: r.productId, warehouseId: r.warehouseId } },
        data:  {
          totalUnits:    { decrement: r.quantity },
          reservedUnits: { decrement: r.quantity },
        },
      });

      return updated;
    });

    const responseBody = {
      id:       confirmed.id,
      status:   confirmed.status,
      quantity: confirmed.quantity,
      product:  { name: confirmed.product.name,  price: confirmed.product.price },
      warehouse:{ name: confirmed.warehouse.name },
    };

    if (idempotencyKey) {
      await prisma.idempotencyRecord.create({
        data: { key: idempotencyKey, statusCode: 200, body: responseBody },
      });
    }

    return NextResponse.json(responseBody);

  } catch (err) {
    console.error("[POST /api/reservations/:id/confirm]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}