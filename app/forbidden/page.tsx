"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const notFound = () => {
    const router = useRouter();

    const returnHome = () => {
        router.push("/");
    };

    return (
        <div className="w-dvw h-dvh flex items-center justify-center overflow-hidden">
            <div className="items-center flex flex-col gap-4">
                <p className="text-display text-foreground">
                    Nice try
                </p>
                <p className="pb-4">
                    403 - You don't have permission to access this page
                </p>
                <Button onClick={returnHome}>Return home</Button>
            </div>
        </div>
    );
};

export default notFound;
