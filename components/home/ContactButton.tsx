"use client";
import { useState } from "react";
import Button from "../dashboard/Button";
import SendMessage from "../SendMessage";

const ContactButton = () => {
    const [showSendMessage, setShowSendMessage] = useState(false);

    return (
        <>
            <Button
                text="Contact Chalkie Chalkie"
                onClick={() => {
                    setShowSendMessage((prev) => !prev);
                }}
            />
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
