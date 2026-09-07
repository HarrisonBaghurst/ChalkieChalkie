import Link from "next/link";
import { Button } from "@/components/ui/button";

const COPY: Record<string, { heading: string; detail: string }> = {
    "not-open": {
        heading: "Not open yet",
        detail: "This workspace opens shortly before the lesson starts.",
    },
    unscheduled: {
        heading: "No start time",
        detail: "This workspace can't be opened until its host schedules it.",
    },
    expired: {
        heading: "No longer available",
        detail: "This workspace has passed its retention window and is being removed.",
    },
};

const FALLBACK = {
    heading: "Nice try",
    detail: "403 - You don't have permission to access this page",
};

const Forbidden = async ({
    searchParams,
}: {
    searchParams: Promise<{ reason?: string }>;
}) => {
    const { reason } = await searchParams;
    const { heading, detail } = (reason && COPY[reason]) || FALLBACK;

    return (
        <div className="w-dvw h-dvh flex items-center justify-center overflow-hidden px-6">
            <div className="items-center flex flex-col gap-4 text-center">
                <p className="text-display text-foreground">{heading}</p>
                <p className="pb-4 text-foreground-second">{detail}</p>
                <Button asChild>
                    <Link href="/dashboard">Back to dashboard</Link>
                </Button>
            </div>
        </div>
    );
};

export default Forbidden;
