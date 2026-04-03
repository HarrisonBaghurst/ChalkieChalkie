"use client";

import React from "react";
import TextInput from "./TextInput";

const LINKS = [
    ["Plans", "User guides", "Contact support", "Report an issue", "Whats new"],
    [
        "Terms of service",
        "Privacy policy",
        "Cookie policy",
        "Data processing agreement",
        "Acceptable use policy",
        "Safeguarding policy",
        "Copyright policy",
    ],
];

const Footer = () => {
    return (
        <div className=" relative h-150 overflow-hidden">
            <div className="absolute bottom-0 -left-35 min-w-fit font-poppins-bold text-9xl translate-y-4 text-foreground w-full">
                <h2 className="whitespace-nowrap">
                    Chalkie Chalkie Chalkie Chalkie
                </h2>
            </div>
            <div className="mx-[10%] grid grid-cols-4 gap-16">
                <div className="col-span-2 flex flex-col gap-1">
                    <p className="text-2xl font-poppins-bold">
                        Stay in the loop
                    </p>
                    <p className="text-foreground">
                        Be the first to know about new features
                    </p>
                    <input
                        type="email"
                        placeholder="Input your Email address to receive updates..."
                        className="px-3 py-1.5 mt-4 -translate-x-2 border-2 border-white/5 rounded-md w-3/4"
                    />
                </div>
                <div className="flex flex-col gap-4 text-foreground-second">
                    {LINKS[0].map((link, i) => (
                        <div key={i}>{link}</div>
                    ))}
                </div>
                <div className="flex flex-col gap-4 text-foreground-second">
                    {LINKS[1].map((link, i) => (
                        <div key={i}>{link}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Footer;
