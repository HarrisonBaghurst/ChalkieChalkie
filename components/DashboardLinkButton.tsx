"use client";

import React from "react";
import Button from "./dashboard/Button";
import { useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";

const DashboardLinkButton = () => {
    const router = useRouter();

    const handleClick = () => {
        router.push("/dashboard");
    };

    return (
        <SignedIn>
            <Button text="Open Dashboard" onClick={handleClick} size="large" />
        </SignedIn>
    );
};

export default DashboardLinkButton;
