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
        <div className="px-[10%] w-full fixed top-0 z-500">
            <div className="top-0 w-full rounded-b-2xl h-14 text-sm flex items-center px-4 justify-between backdrop-blur-lg border-white/10 border-b border-x bg-white/8">
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
