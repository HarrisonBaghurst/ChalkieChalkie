"use client";

import React, { useState } from "react";
import Link from "next/link";
import SendMessage from "./SendMessage";

const linkClass = "w-fit hover:underline cursor-pointer";
const disabledLinkClass = "w-fit text-foreground-third cursor-not-allowed";

const Footer = () => {
    const [showSendMessage, setShowSendMessage] = useState(false);

    return (
        <div className="w-full h-[40dvh] pb-8 radius-surface shrink-0 flex flex-col justify-between">
            <div className="flex justify-between">
                <div>
                    <p className="text-foreground-second text-body">
                        More about
                    </p>
                    <p className="text-heading opacity-100 font-inter-bold">
                        Chalkie Chalkie
                    </p>
                </div>
                <div className="flex gap-[8dvw]">
                    <div className="flex flex-col gap-5">
                        <p className="text-subheading">Product</p>
                        <div className="flex flex-col gap-1">
                            <Link href="/dashboard" className={linkClass}>
                                Dashboard
                            </Link>
                            <Link href="/sign-in" className={linkClass}>
                                Sign in
                            </Link>
                        </div>
                    </div>
                    <div className="flex flex-col gap-5">
                        <p className="text-subheading">Legal</p>
                        <div className="flex flex-col gap-1">
                            <Link href="/privacy-policy" className={linkClass}>
                                Privacy policy
                            </Link>
                            {/* TODO: enable and link once the Terms of service page is implemented */}
                            <p className={disabledLinkClass}>Terms of service</p>
                            {/* TODO: enable and link once the Cookie policy page is implemented */}
                            <p className={disabledLinkClass}>Cookie policy</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-5">
                        <p className="text-subheading">Get in touch</p>
                        <div className="flex flex-col gap-1">
                            {/* TODO: point this at a dedicated general contact modal instead of the beta request modal */}
                            <button
                                type="button"
                                onClick={() => setShowSendMessage(true)}
                                className={`${linkClass} text-left`}
                            >
                                Contact
                            </button>
                            <a
                                href="https://github.com/harrisonbaghurst"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={linkClass}
                            >
                                GitHub
                            </a>
                            {/* TODO: add Instagram link back once the account is set up */}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex gap-4 text-foreground-third text-caption">
                <p>© Chalkie Chalkie 2026</p>
                <p>|</p>
                <p>Harrison Baghurst Digital</p>
            </div>
            {showSendMessage && (
                <SendMessage
                    mode="beta"
                    onClose={() => setShowSendMessage(false)}
                />
            )}
        </div>
    );
};

export default Footer;
