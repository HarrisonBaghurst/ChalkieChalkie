"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const Header = () => {
    const router = useRouter();

    const returnHome = () => {
        router.push("/");
    };

    return (
        <div className="top-0 fixed w-[85%] rounded-b-2xl mx-[7.5%] h-12 text-sm flex items-center px-2 justify-between z-500 backdrop-blur-lg border-white/10 border-b border-x bg-white/5">
            <button className="cursor-pointer pl-2" onClick={returnHome}>
                Chalkie Chalkie
            </button>
            <SignedOut>
                <SignInButton />
            </SignedOut>
            <SignedIn>
                <UserButton />
            </SignedIn>
        </div>
    );
};

export default Header;
