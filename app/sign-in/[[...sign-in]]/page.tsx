import { SignIn } from "@clerk/nextjs";
import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign in",
    robots: { index: false, follow: false },
};

const page = () => {
    return (
        <div className="w-full h-dvh flex items-center justify-center bg-background dotted-paper">
            <SignIn
                appearance={{
                    elements: {
                        card: "gradient-border shadow-2xl",
                        cardBox: "shadow-none",
                        headerTitle: "font-inter-bold",
                    },
                }}
            />
        </div>
    );
};

export default page;
