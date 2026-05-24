"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReservationDetail } from "@/types";

function useCountdown(expiresAt: string | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return {
    secondsLeft,
    minutes: Math.floor(secondsLeft / 60),
    seconds: secondsLeft % 60,
  };
}

function CountdownRing({
  secondsLeft,
  totalSeconds,
  minutes,
  seconds,
}: {
  secondsLeft: number;
  totalSeconds: number;
  minutes: number;
  seconds: number;
}) {
  const radius    = 54;
  const circ      = 2 * Math.PI * radius;
  const progress  = secondsLeft / totalSeconds;
  const dashOffset = circ * (1 - progress);
  const isUrgent  = secondsLeft < 60;
  const color     = isUrgent ? "#ef4444" : secondsLeft < 180 ? "#f59e0b" : "#10b981";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Background track */}
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#f4f4f5" strokeWidth="8" />
          {/* Progress arc */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
          />
        </svg>
        {/* Time text*/}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold font-mono tabular-nums leading-none"
            style={{ color }}
          >
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
          <span className="text-xs text-zinc-400 mt-0.5">remaining</span>
        </div>
      </div>
      <p className="text-xs text-zinc-500 text-center">
        {isUrgent
          ? "⚠️ Hurry! Almost out of time"
          : "Unit held — complete payment before time runs out"}
      </p>
    </div>
  );
}

export default function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId]                       = useState<string | null>(null);
  const [reservation, setReservation]     = useState<ReservationDetail | null>(null);
  const [pageLoading, setPageLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState<"confirm" | "cancel" | null>(null);

  const TOTAL_SECONDS = 10 * 60; 
  const { secondsLeft, minutes, seconds } = useCountdown(reservation?.expiresAt ?? null);

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  const fetchReservation = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) { toast.error("Reservation not found."); router.push("/"); return; }
      setReservation(await res.json());
    } catch {
      toast.error("Couldn't load reservation.");
    } finally {
      setPageLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchReservation(); }, [fetchReservation]);

  useEffect(() => {
    if (secondsLeft === 0 && reservation?.status === "PENDING") {
      const t = setTimeout(fetchReservation, 1500);
      return () => clearTimeout(t);
    }
  }, [secondsLeft, reservation?.status, fetchReservation]);

  async function handleConfirm() {
    if (!id) return;
    setActionLoading("confirm");
    try {
      const res  = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (res.status === 410) {
        toast.error("Reservation expired — unit returned to stock.");
        await fetchReservation();
        return;
      }
      if (!res.ok) { toast.error(data.error ?? "Confirmation failed."); return; }
      toast.success("Purchase confirmed!");
      await fetchReservation();
    } catch { toast.error("Network error — please try again."); }
    finally   { setActionLoading(null); }
  }

  async function handleCancel() {
    if (!id) return;
    setActionLoading("cancel");
    try {
      const res  = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Cancel failed."); return; }
      toast.info("Reservation cancelled. Unit is back in stock.");
      await fetchReservation();
    } catch { toast.error("Network error — please try again."); }
    finally   { setActionLoading(null); }
  }

  if (pageLoading || !reservation) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 animate-pulse space-y-4">
          <div className="h-5 bg-zinc-100 rounded w-1/2" />
          <div className="h-3 bg-zinc-100 rounded w-1/3" />
          <div className="h-24 bg-zinc-100 rounded-xl" />
          <div className="h-32 bg-zinc-100 rounded-xl" />
          <div className="h-10 bg-zinc-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const isExpired   = new Date() > new Date(reservation.expiresAt);
  const isPending   = reservation.status === "PENDING";
  const isConfirmed = reservation.status === "CONFIRMED";
  const isReleased  = reservation.status === "RELEASED";
  const isOver      = isConfirmed || isReleased || (isPending && isExpired);

  return (
    <div className="max-w-lg mx-auto px-4 py-10">

      {/* Back link */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to products
      </button>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">

        {/* Card top strip — colour reflects status */}
        <div className={`h-1.5 w-full ${
          isConfirmed ? "bg-emerald-400" :
          isReleased  ? "bg-zinc-300"    :
          isExpired   ? "bg-red-400"     :
          secondsLeft < 60 ? "bg-red-400 animate-pulse" :
          "bg-amber-400"
        }`} />

        <div className="p-6 space-y-6">

          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-bold text-lg text-zinc-900 leading-tight">
                {isConfirmed ? "Order Confirmed" :
                 isReleased  ? "Reservation Cancelled" :
                 isExpired   ? "Reservation Expired" :
                 "Complete Your Purchase"}
              </h1>
              <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                {reservation.id}
              </p>
            </div>

            {/* Status pill */}
            <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isConfirmed             ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
              isReleased || isExpired ? "bg-zinc-100 text-zinc-500 border border-zinc-200"         :
              "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {isConfirmed ? "✓ Confirmed" :
               isReleased  ? "Cancelled"   :
               isExpired   ? "Expired"     :
               "Pending"}
            </span>
          </div>

          {/* Product + warehouse info */}
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900">{reservation.product.name}</p>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  SKU: {reservation.product.sku}
                </p>
              </div>
              <p className="font-bold text-zinc-900 shrink-0">
                ₹{reservation.product.price.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="border-t border-zinc-200 pt-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-zinc-200 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-700">{reservation.warehouse.name}</p>
                <p className="text-xs text-zinc-400">{reservation.warehouse.location}</p>
              </div>
            </div>
          </div>

          {/* Order total */}
          <div className="flex items-center justify-between px-1">
            <div className="text-sm text-zinc-500">
              {reservation.quantity} × ₹{reservation.product.price.toLocaleString("en-IN")}
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400 mb-0.5">Total</p>
              <p className="text-xl font-bold text-zinc-900">
                ₹{(reservation.product.price * reservation.quantity).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Countdown ring */}
          {isPending && !isExpired && (
            <div className="flex justify-center py-2">
              <CountdownRing
                secondsLeft={secondsLeft}
                totalSeconds={TOTAL_SECONDS}
                minutes={minutes}
                seconds={seconds}
              />
            </div>
          )}

          {/* Terminal state messages */}
          {isConfirmed && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="text-2xl mb-1">🎉</p>
              <p className="font-semibold text-emerald-800">Thank you for your order!</p>
              <p className="text-sm text-emerald-600 mt-0.5">
                Your purchase has been confirmed successfully.
              </p>
            </div>
          )}

          {(isReleased || (isPending && isExpired)) && (
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-center">
              <p className="text-2xl mb-1">{isExpired ? "⏰" : "✕"}</p>
              <p className="font-semibold text-zinc-700">
                {isPending && isExpired
                  ? "Time's up — reservation expired"
                  : "Reservation cancelled"}
              </p>
              <p className="text-sm text-zinc-500 mt-0.5">
                The unit has been returned to available stock.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {isPending && !isExpired && (
            <div className="space-y-2 pt-1">
              <button
                onClick={handleConfirm}
                disabled={actionLoading !== null}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === "confirm" && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {actionLoading === "confirm" ? "Processing…" : "Confirm Purchase"}
              </button>

              <button
                onClick={handleCancel}
                disabled={actionLoading !== null}
                className="w-full py-3 px-4 rounded-xl border border-zinc-200 text-zinc-600 font-medium text-sm hover:bg-zinc-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === "cancel" ? "Cancelling…" : "Cancel Reservation"}
              </button>
            </div>
          )}

          {/* Back to products after terminal state */}
          {isOver && (
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 px-4 rounded-xl border border-zinc-200 text-zinc-600 font-medium text-sm hover:bg-zinc-50 transition-colors"
            >
              Back to products
            </button>
          )}

        </div>
      </div>
    </div>
  );
}