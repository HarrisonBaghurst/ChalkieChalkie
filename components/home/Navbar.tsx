"use client";
import { usePathname, useRouter } from "next/navigation";
import NavbarClient from "./NavbarClient";

const Navbar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const isInWorkspace = pathname?.startsWith("/board") ?? false;

    return (
        <div className="h-fit bg-card-background py-3 px-10 fixed w-full flex justify-between items-center z-1000">
            <p
                className={`font-inter-bold${
                    isInWorkspace ? " cursor-pointer" : ""
                }`}
                onClick={
                    isInWorkspace ? () => router.push("/dashboard") : undefined
                }
            >
                Chalkie Chalkie
            </p>
            <NavbarClient isInWorkspace={isInWorkspace} />
        </div>
    );
};

export default Navbar;
