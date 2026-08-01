"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import SendMessage from "../SendMessage";

const ContactButton = () => {
    const [showSendMessage, setShowSendMessage] = useState(false);

    return (
        <>
            <Button
                onClick={() => {
                    setShowSendMessage((prev) => !prev);
                }}
            >
                Contact Chalkie Chalkie
            </Button>
            {showSendMessage && (
                <SendMessage
                    mode="contact"
                    onClose={() => setShowSendMessage(false)}
                />
            )}
        </>
    );
};

export default ContactButton;
