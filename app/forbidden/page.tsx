"use client";

import Button from "@/components/Button";
import { useRouter } from "next/navigation";

const notFound = () => {
    const router = useRouter();

    const returnHome = () => {
        router.push("/");
    };

    return (
        <div className="w-dvw h-dvh flex items-center justify-center overflow-hidden">
            <div className="items-center flex flex-col gap-4">
                <p className="font-poppins-bold text-7xl text-foreground">
                    Nice try
                </p>
                <p className="pb-4">
                    403 - You don't have permission to access this page
                </p>
                <Button
                    text="Return home"
                    variant="primary"
                    handleClick={returnHome}
                />
            </div>
        </div>
    );
};

export default notFound;
