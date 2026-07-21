"use client";
import { usePathname, useRouter } from "next/navigation";
import NavbarClient from "./NavbarClient";

const Navbar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const isInHome = pathname === "/";

    return (
        <div className="h-fit py-[2dvh] px-[6dvw] fixed w-full flex justify-between items-center z-1000">
            <p
                className={`text-subheading font-inter-regular ${
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
