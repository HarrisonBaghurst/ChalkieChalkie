"use client";
import { usePathname, useRouter } from "next/navigation";
import NavbarClient from "./NavbarClient";

const Navbar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const isInHome = pathname === "/";

    return (
        <div className="h-fit bg-card-background py-3.5 px-4 2xl:px-10 fixed w-full flex justify-between items-center z-1000">
            <p
                className={`font-inter-bold${
                    !isInHome ? " cursor-pointer" : ""
                }`}
                onClick={
                    !isInHome ? () => router.push("/dashboard") : undefined
                }
            >
                Chalkie Chalkie
            </p>
            <NavbarClient isInHome={isInHome} />
        </div>
    );
};

export default Navbar;
