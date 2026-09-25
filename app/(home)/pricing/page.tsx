import Footer from "@/components/Footer";
import PendingPlanBanner from "@/components/pricing/PendingPlanBanner";
import PlanComparison from "@/components/pricing/PlanComparison";
import PricingTiers from "@/components/pricing/PricingTiers";
import { statusGrantsEntitlements } from "@/lib/plans/entitlements";
import { planComparison } from "@/lib/plans/planComparison";
import { readPlanRow } from "@/lib/plans/planRow";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing",
    description:
        "Plans for tutors running lessons on Chalkie Chalkie, from a couple of lessons a week to a full timetable.",
    alternates: { canonical: "/pricing" },
};

const page = async () => {
    const { userId } = await auth();

    const row = userId ? await readPlanRow(userId) : null;

    const currentPlan =
        row?.plan && row.status && statusGrantsEntitlements(row.status)
            ? row.plan
            : null;

    return (
        <div className="px-[8dvw] py-[8svh] flex flex-col gap-[10svh]">
            <div className="flex flex-col gap-6 w-fit">
                <h1 className="text-display w-fit">Choose your plan</h1>
                <p className="text-subheading font-inter-regular text-foreground-third">
                    Plans are for tutors. Students don&apos;t need one. You can
                    cancel whenever you like.
                </p>
            </div>

            {(row?.pendingPlan || row?.cancelsAt) && (
                <PendingPlanBanner
                    currentPlan={currentPlan}
                    pendingPlan={row.pendingPlan}
                    pendingPlanAt={row.pendingPlanAt}
                    cancelsAt={row.cancelsAt}
                />
            )}

            <PricingTiers
                currentPlan={currentPlan}
                signedIn={!!userId}
                hasSubscription={!!row?.stripeSubscriptionId}
                currentPeriodEnd={row?.currentPeriodEnd ?? null}
                cancelling={!!row?.cancelsAt}
            />

            <PlanComparison rows={planComparison()} />

            <div className="relative w-full">
                <Footer />
            </div>
        </div>
    );
};

export default page;
