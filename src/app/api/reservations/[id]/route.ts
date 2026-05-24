import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const r = await prisma.reservation.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    });

    if (!r) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({
      id:        r.id,
      status:    r.status,
      quantity:  r.quantity,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      product: {
        id:          r.product.id,
        name:        r.product.name,
        sku:         r.product.sku,
        price:       r.product.price,
        description: r.product.description,
      },
      warehouse: {
        id:       r.warehouse.id,
        name:     r.warehouse.name,
        location: r.warehouse.location,
      },
    });

  } catch (err) {
    console.error("[GET /api/reservations/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}