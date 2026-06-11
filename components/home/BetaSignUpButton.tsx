"use client";
import { SignedOut } from "@clerk/nextjs";
import Button from "../dashboard/Button";

const BetaSignUpButton = () => {
    return (
        <SignedOut>
            <Button text="Join Private Beta" onClick={() => {}} size="large" />
        </SignedOut>
    );
};

export default BetaSignUpButton;
