"use client";
import { usePathname, useRouter } from "next/navigation";
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import HeroLoginButton from "./HeroLoginButton";

const Navbar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const isInHome = pathname === "/";

    return (
        <div className="h-fit py-[2dvh] px-[6dvw] fixed w-full flex justify-between items-center z-1000">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-transparent to-background"
            />
            <SignedIn>
                <div className="flex gap-4 items-center">
                    <UserButton
                        appearance={{
                            elements: {
                                avatarBox: "!w-10 !h-10 !rounded-sm",
                            },
                        }}
                    />
                    <div className="font-inter-bold flex flex-col leading-tight">
                        <p className="text-caption text-foreground-second">
                            {user?.firstName ? `${user.firstName}'s` : "Your"}
                        </p>
                        <p>Chalkie Chalkie</p>
                    </div>
                </div>
            </SignedIn>
            <SignedOut>
                <div
                    className={`font-inter-bold flex flex-col leading-tight ${
                        !isInHome ? "cursor-pointer" : ""
                    }`}
                    onClick={
                        !isInHome ? () => router.push("/dashboard") : undefined
                    }
                >
                    <p className="text-caption text-foreground-second">
                        Welcome to
                    </p>
                    <p>Chalkie Chalkie</p>
                </div>
                <HeroLoginButton />
            </SignedOut>
        </div>
    );
};

export default Navbar;
