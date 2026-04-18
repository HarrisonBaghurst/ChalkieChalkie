"use client";

import SendMessage from "./SendMessage";

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
        <div className=" relative h-fit pb-70 overflow-hidden">
            <div className="absolute bottom-0 -left-35 min-w-fit font-poppins-bold text-9xl translate-y-4 text-foreground w-full">
                <h2 className="whitespace-nowrap">
                    Chalkie Chalkie Chalkie Chalkie
                </h2>
            </div>
            <div className="mx-[10%] flex gap-16">
                <SendMessage />
                <div />
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
