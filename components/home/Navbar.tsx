import React from "react";
import NavbarClient from "./NavbarClient";

const Navbar = () => {
    return (
        <div className="h-fit bg-card-background py-3 px-10 fixed w-full flex justify-between items-center">
            <p className="font-inter-bold">Chalkie Chalkie</p>
            <NavbarClient />
        </div>
    );
};

export default Navbar;
