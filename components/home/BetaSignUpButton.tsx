"use client";
import { useState } from "react";
import { SignedOut } from "@clerk/nextjs";
import Button from "../dashboard/Button";
import SendMessage from "../SendMessage";

const BetaSignUpButton = () => {
    const [showSendMessage, setShowSendMessage] = useState(false);

    return (
        <SignedOut>
            <Button
                text="Request Beta Access"
                onClick={() => setShowSendMessage(true)}
                size="large"
            />
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
