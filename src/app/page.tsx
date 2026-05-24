"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProductWithStock } from "@/types";

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function StockBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
        Out of stock
      </span>
    );
  }
  if (count <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
        Only {count} left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      {count} available
    </span>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts]   = useState<ProductWithStock[]>([]);
  const [loading, setLoading]     = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try {
      const res = await fetch("/api/products");
      setProducts(await res.json());
    } catch {
      toast.error("Couldn't load products — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReserve(productId: string, warehouseId: string) {
    const key = `${productId}:${warehouseId}`;
    setReserving(key);
    try {
      const res = await fetch("/api/reservations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });
      const data = await res.json();

      if (res.status === 409) {
        toast.error("Someone just grabbed the last unit. Stock updated.");
        await loadProducts();
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? "Reservation failed. Please try again.");
        return;
      }

      toast.success("Unit reserved! 10 minutes to complete checkout.");
      router.push(`/reservation/${data.id}`);
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setReserving(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-200 p-6 animate-pulse">
              <div className="h-4 bg-zinc-100 rounded w-2/3 mb-3" />
              <div className="h-3 bg-zinc-100 rounded w-1/3 mb-6" />
              <div className="space-y-3">
                <div className="h-3 bg-zinc-100 rounded w-full" />
                <div className="h-3 bg-zinc-100 rounded w-full" />
                <div className="h-3 bg-zinc-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Products</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Select a warehouse and reserve your unit. Held for 10 minutes while you checkout.
        </p>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((product) => {

          const totalReserved = product.inventory.reduce((s, i) => s + i.reservedUnits, 0);
          const totalAvailable = product.inventory.reduce((s, i) => s + i.availableUnits, 0);

          return (
            <div
              key={product.id}
              className="group bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all duration-200 overflow-hidden flex flex-col"
            >
              {/* Card header */}
              <div className="p-5 pb-4 border-b border-zinc-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-zinc-900 leading-snug">{product.name}</h2>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-zinc-900">
                      ₹{product.price.toLocaleString("en-IN")}
                    </p>
                    {totalAvailable === 0 && (
                      <p className="text-xs text-red-500 mt-0.5">Unavailable</p>
                    )}
                  </div>
                </div>
                {product.description && (
                  <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{product.description}</p>
                )}
              </div>

              {/* Warehouse stock rows */}
              <div className="flex-1 p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Warehouse Stock
                </p>

                {product.inventory.map((inv) => {
                  const key        = `${product.id}:${inv.warehouseId}`;
                  const isLoading  = reserving === key;
                  const outOfStock = inv.availableUnits === 0;

                  return (
                    <div
                      key={inv.warehouseId}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl transition-colors ${
                        outOfStock ? "bg-zinc-50" : "bg-zinc-50 hover:bg-zinc-100"
                      }`}
                    >
                      {/* Warehouse info */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${outOfStock ? "text-zinc-400" : "text-zinc-700"}`}>
                          {inv.warehouseName}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">{inv.warehouseLocation}</p>
                      </div>

                      {/* Badge + button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <StockBadge count={inv.availableUnits} />

                        {!outOfStock && (
                          <button
                            onClick={() => handleReserve(product.id, inv.warehouseId)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          >
                            {isLoading && <Spinner />}
                            {isLoading ? "Reserving…" : "Reserve"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer*/}
              {totalReserved > 0 && (
                <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
                  <p className="text-xs text-amber-700">
                    ⏳ {totalReserved} unit{totalReserved > 1 ? "s" : ""} currently held in active reservations
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}