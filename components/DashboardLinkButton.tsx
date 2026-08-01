"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";

const DashboardLinkButton = () => {
    const router = useRouter();

    const handleClick = () => {
        router.push("/dashboard");
    };

    return (
        <SignedIn>
            <Button size="lg" onClick={handleClick}>
                Open Dashboard
            </Button>
        </SignedIn>
    );
};

export default DashboardLinkButton;
