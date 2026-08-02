"use client";
import { usePathname, useRouter } from "next/navigation";
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import HeroLoginButton from "./HeroLoginButton";

const Navbar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();

    // The brand links home, except inside a workspace where it returns to the
    // dashboard. Suppress the affordance when we're already at the target.
    const isInWorkspace = pathname.startsWith("/board");
    const brandHref = isInWorkspace ? "/dashboard" : "/";
    const isAtBrandTarget = pathname === brandHref;

    return (
        // z-40 keeps the navbar above page content while staying under the
        // z-50 overlay layer (dialogs, sheets, popovers, tooltips), which
        // portal to the body and must cover it. At its previous z-1000 it
        // painted over modal scrims and would sit on top of the full-screen
        // mobile dialogs entirely.
        <div className="h-fit py-[2svh] px-[6dvw] fixed w-full flex justify-between items-center z-40">
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
                    {/* The dashboard nav pill that used to sit here is gone:
                        DashboardShell only renders this Navbar below 2xl, and
                        below 2xl the bottom TabBar carries the same two
                        destinations with role-aware labels. */}
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
