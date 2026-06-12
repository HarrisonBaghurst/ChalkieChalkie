"use client";
import { SignedIn, UserButton } from "@clerk/nextjs";
import Button from "../dashboard/Button";
import { useRouter } from "next/navigation";

const NavbarClient = ({ isInWorkspace }: { isInWorkspace: boolean }) => {
    const router = useRouter();

    const handleDashboardRedirect = () => {
        router.push("/dashboard");
    };

    return (
        <SignedIn>
            <div className="flex gap-4 items-center">
                {!isInWorkspace && (
                    <Button
                        text="Open Dashboard"
                        onClick={handleDashboardRedirect}
                    />
                )}
                <UserButton
                    appearance={{
                        elements: {
                            avatarBox: "!w-10 !h-10",
                        },
                    }}
                />
            </div>
        </SignedIn>
    );
};

export default NavbarClient;
