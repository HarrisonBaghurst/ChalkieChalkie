"use client";
import { useState } from "react";
import { SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import SendMessage from "../SendMessage";

const BetaSignUpButton = () => {
    const [showSendMessage, setShowSendMessage] = useState(false);

    return (
        <SignedOut>
            <Button size="lg" onClick={() => setShowSendMessage(true)}>
                Request Beta Access
            </Button>
            {showSendMessage && (
                <SendMessage
                    mode="beta"
                    onClose={() => setShowSendMessage(false)}
                />
            )}
        </SignedOut>
    );
};

export default BetaSignUpButton;
