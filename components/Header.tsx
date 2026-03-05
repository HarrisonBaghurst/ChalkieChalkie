"use client";

import { SignedIn, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const Header = () => {
    const router = useRouter();

    const returnHome = () => {
        router.push("/");
    };

    return (
        <div className="top-0 fixed w-[80%] rounded-b-lg mx-[10%] h-14 text-sm flex items-center px-4 justify-between z-500 backdrop-blur-lg border-white/10 border-b border-x bg-white/5">
            <button className="cursor-pointer pl-2" onClick={returnHome}>
                Chalkie Chalkie
            </button>
            <SignedIn>
                <UserButton />
            </SignedIn>
        </div>
    );
};

export default Header;
