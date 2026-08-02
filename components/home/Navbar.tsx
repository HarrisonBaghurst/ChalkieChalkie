"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
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

    // Navbar is shared with (home) and (legal) as well as the sub-2xl
    // dashboard chrome (DashboardShell only renders Sidebar at 2xl+), so this
    // cluster must be gated to dashboard routes — otherwise the marketing and
    // legal pages would grow dashboard nav links. Label is role-neutral
    // ("Connections", not "Students"/"Tutors"): Navbar has no server-resolved
    // role prop, unlike Sidebar, so a role-branched label would flash the
    // wrong text for a frame before Clerk hydrates.
    const isDashboardRoute = pathname.startsWith("/dashboard");

    return (
        <div className="h-fit py-[2svh] px-[6dvw] fixed w-full flex justify-between items-center z-1000">
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
                    {isDashboardRoute && (
                        <div className="flex items-center gap-1 control-surface p-1">
                            <Link
                                href="/dashboard"
                                className={cn(
                                    "radius-tag px-3 py-1.5 text-small",
                                    pathname === "/dashboard"
                                        ? "bg-foreground-third/30 text-foreground"
                                        : "text-foreground-third",
                                )}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/dashboard/connections"
                                className={cn(
                                    "radius-tag px-3 py-1.5 text-small",
                                    pathname === "/dashboard/connections"
                                        ? "bg-foreground-third/30 text-foreground"
                                        : "text-foreground-third",
                                )}
                            >
                                Connections
                            </Link>
                        </div>
                    )}
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
