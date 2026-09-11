"use client";
import { useState } from "react";
import { SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import StepperFormDialog from "../forms/StepperFormDialog";
import { BETA_REQUEST } from "@/lib/forms/betaRequest";

const BetaSignUpButton = () => {
    const [showSendMessage, setShowSendMessage] = useState(false);

    return (
        <SignedOut>
            <Button size="lg" onClick={() => setShowSendMessage(true)}>
                Request Beta Access
            </Button>
            {showSendMessage && (
                <StepperFormDialog
                    spec={BETA_REQUEST}
                    onClose={() => setShowSendMessage(false)}
                />
            )}
        </SignedOut>
    );
};

export default BetaSignUpButton;
