"use client";
import { useRouter } from "next/navigation";
import Button from "../dashboard/Button";
import { SignedOut } from "@clerk/nextjs";

const HeroLoginButton = () => {
    const router = useRouter();

    const handleLogin = () => {
        router.push("/sign-in");
    };

    return (
        <SignedOut>
            <Button text="Login" onClick={handleLogin} size="large" />
        </SignedOut>
    );
};

export default HeroLoginButton;
