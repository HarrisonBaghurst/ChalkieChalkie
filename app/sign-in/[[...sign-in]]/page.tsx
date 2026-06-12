import { SignIn } from "@clerk/nextjs";
import React from "react";

const page = () => {
    return (
        <div className="w-full h-dvh flex items-center justify-center bg-background dotted-paper">
            <SignIn
                appearance={{
                    elements: {
                        // Warm gradient border accent, echoing the dashboard's
                        // "Next" card (.gradient-border in globals.css).
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
