"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Button from "./Button";

const Header = () => {
    const router = useRouter();

    const returnHome = () => {
        router.push("/");
    };

    const SignIn = () => {
        router.push("/sign-in");
    };

    return (
        <div className="px-4 w-full fixed top-0 z-500">
            <div className="top-0 w-full h-14 text-sm flex items-center justify-between">
                <button className="cursor-pointer pl-2" onClick={returnHome}>
                    Chalkie Chalkie
                </button>
                <SignedOut>
                    <Button
                        text="Sign in"
                        handleClick={SignIn}
                        variant="primary"
                        size="small"
                    />
                </SignedOut>
                <SignedIn>
                    <UserButton />
                </SignedIn>
            </div>
        </div>
    );
};

export default Header;
