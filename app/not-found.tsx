"use client";

import Button from "@/components/dashboard/Button";
import { useRouter } from "next/navigation";

const notFound = () => {
    const router = useRouter();

    const returnHome = () => {
        router.push("/");
    };

    return (
        <div className="w-dvw h-dvh flex items-center justify-center overflow-hidden dotted-paper">
            <div className="items-center flex flex-col gap-4">
                <p className="text-display text-foreground">Got lost?</p>
                <p className="pb-4">
                    404 - The page your looking for doesn't exist
                </p>
                <Button
                    text={"Return Home"}
                    onClick={returnHome}
                    size="large"
                />
            </div>
        </div>
    );
};

export default notFound;
