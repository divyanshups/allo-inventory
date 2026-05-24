import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function scheduleReservationExpiry(
  reservationId: string,
  expiresInMs: number
) {
  await redis.set(`reservation:${reservationId}`, "pending", { px: expiresInMs });
}