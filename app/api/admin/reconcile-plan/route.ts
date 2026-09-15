import { errorResponse } from "@/lib/errorResponse";
import { reconcilePlanChange } from "@/lib/plans/reconcile";
import { requireAdmin } from "@/lib/serverRole";
import { auth } from "@clerk/nextjs/server";

const CLERK_USER_ID_REGEX = /^user_[a-zA-Z0-9]+$/;

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorised", { status: 401 });

    const forbidden = await requireAdmin(userId);
    if (forbidden) return forbidden;

    let body: { userId?: unknown };
    try {
        body = (await req.json()) as { userId?: unknown };
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const target = body.userId;
    if (typeof target !== "string" || !CLERK_USER_ID_REGEX.test(target)) {
        return new Response("Invalid userId", { status: 400 });
    }

    try {
        return Response.json(await reconcilePlanChange(target));
    } catch (error) {
        return errorResponse("plan:reconcile", error, 500, { userId });
    }
}
