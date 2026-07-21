"use client";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Button from "../dashboard/Button";
import { useRouter } from "next/navigation";
import HeroLoginButton from "./HeroLoginButton";

const NavbarClient = ({ isInHome }: { isInHome: boolean }) => {
    const router = useRouter();

    const handleDashboardRedirect = () => {
        router.push("/dashboard");
    };

    return (
        <>
            <SignedIn>
                <div className="flex gap-4 items-center">
                    {isInHome && (
                        <Button
                            text="Open Dashboard"
                            onClick={handleDashboardRedirect}
                        />
                    )}
                    <UserButton
                        appearance={{
                            elements: {
                                avatarBox: "!w-8 !h-8",
                            },
                        }}
                    />
                </div>
            </SignedIn>
            <SignedOut>
                <HeroLoginButton />
            </SignedOut>
        </>
    );
};

export default NavbarClient;
