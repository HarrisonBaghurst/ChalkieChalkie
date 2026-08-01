"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignedOut } from "@clerk/nextjs";

const HeroLoginButton = () => {
    const router = useRouter();

    const handleLogin = () => {
        router.push("/sign-in");
    };

    return (
        <SignedOut>
            <Button onClick={handleLogin}>Sign In</Button>
        </SignedOut>
    );
};

export default HeroLoginButton;
