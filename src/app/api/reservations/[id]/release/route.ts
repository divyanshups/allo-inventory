import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const r = await prisma.reservation.findUnique({ where: { id } });

    if (!r) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (r.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot release a reservation that is already ${r.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.reservation.update({ where: { id }, data: { status: "RELEASED" } }),
      prisma.inventory.update({
        where: { productId_warehouseId: { productId: r.productId, warehouseId: r.warehouseId } },
        data:  { reservedUnits: { decrement: r.quantity } },
      }),
    ]);

    return NextResponse.json({ message: "Reservation released. Units are back in stock.", id });

  } catch (err) {
    console.error("[POST /api/reservations/:id/release]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}