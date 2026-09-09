"use client";
import { usePathname, useRouter } from "next/navigation";
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import HeroLoginButton from "./HeroLoginButton";

const Navbar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();

    const isInWorkspace = pathname.startsWith("/board");
    const brandHref = isInWorkspace ? "/dashboard" : "/";
    const isAtBrandTarget = pathname === brandHref;

    return (
        <div className="h-fit py-[2svh] px-4 lg:px-[6dvw] fixed w-full flex justify-between items-center z-40">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 bg-background/80 backdrop-blur-sm border-b md:border-none border-foreground/10"
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
                    <div
                        className={`font-inter-bold flex flex-col leading-tight ${
                            !isAtBrandTarget ? "cursor-pointer" : ""
                        }`}
                        onClick={
                            !isAtBrandTarget
                                ? () => router.push(brandHref)
                                : undefined
                        }
                    >
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
                        !isAtBrandTarget ? "cursor-pointer" : ""
                    }`}
                    onClick={
                        !isAtBrandTarget
                            ? () => router.push(brandHref)
                            : undefined
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
