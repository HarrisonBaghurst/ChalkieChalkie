import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PLAN_IDS } from "@/lib/plans/entitlements";
import { PLAN_LABELS } from "@/lib/plans/labels";
import type { PlanId } from "@/types/planTypes";

const isPlanId = (value: string | undefined): value is PlanId =>
    !!value && (PLAN_IDS as string[]).includes(value);

const CheckoutSuccess = async ({
    searchParams,
}: {
    searchParams: Promise<{ plan?: string }>;
}) => {
    const { plan } = await searchParams;

    if (!isPlanId(plan)) notFound();

    return (
        <div className="w-dvw h-dvh flex items-center justify-center overflow-hidden px-6 dotted-paper">
            <div className="items-center flex flex-col gap-4 text-center">
                <p className="text-display text-foreground">
                    Welcome to {PLAN_LABELS[plan]}
                </p>
                <p className="pb-4 text-foreground-second">
                    Thanks for subscribing to Chalkie Chalkie. Your plan is
                    ready to use.
                </p>
                <Button size="lg" asChild>
                    <Link href="/dashboard">Go to dashboard</Link>
                </Button>
            </div>
        </div>
    );
};

export default CheckoutSuccess;
