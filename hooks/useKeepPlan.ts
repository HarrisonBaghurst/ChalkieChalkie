"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { responseDenialCopy } from "@/lib/planDenialCopy";

export const useKeepPlan = (keeping: string) => {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const keep = async () => {
        if (submitting) return;
        setSubmitting(true);

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/pending`,
                { method: "DELETE" },
            );

            if (!res.ok) {
                const denial = await responseDenialCopy(res);
                toast.error(
                    denial?.title ?? "Could not cancel the scheduled change.",
                    {
                        description: denial?.description ?? "Please try again.",
                    },
                );
                return;
            }

            toast.success(`Staying on ${keeping}.`, {
                description: "The scheduled change has been cancelled.",
            });
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    return { keep, submitting };
};
