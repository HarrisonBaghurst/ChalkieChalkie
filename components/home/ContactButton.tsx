"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import StepperFormDialog from "../forms/StepperFormDialog";
import { BUG_REPORT } from "@/lib/forms/bugReport";

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
                <StepperFormDialog
                    spec={BUG_REPORT}
                    onClose={() => setShowSendMessage(false)}
                />
            )}
        </>
    );
};

export default ContactButton;
