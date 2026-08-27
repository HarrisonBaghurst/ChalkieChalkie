import { randomUUID } from "crypto";
import { redis } from "@/lib/ratelimit";

const LEASE_TTL_SECONDS = 10 * 60;

const leaseKey = (userId: string, workspaceId: string, leaseId: string) =>
    `chalkie:pdflease:${userId}:${workspaceId}:${leaseId}`;

export async function createPdfLease(
    userId: string,
    workspaceId: string,
    pageCount: number,
): Promise<string> {
    const leaseId = randomUUID();
    await redis
        .pipeline()
        .incrby(leaseKey(userId, workspaceId, leaseId), pageCount)
        .expire(leaseKey(userId, workspaceId, leaseId), LEASE_TTL_SECONDS)
        .exec();
    return leaseId;
}

export async function consumePdfLease(
    userId: string,
    workspaceId: string,
    leaseId: string,
): Promise<boolean> {
    const key = leaseKey(userId, workspaceId, leaseId);
    try {
        if ((await redis.decr(key)) >= 0) return true;
        await redis.del(key);
        return false;
    } catch {
        return false;
    }
}
