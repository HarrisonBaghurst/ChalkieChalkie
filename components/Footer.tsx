"use client";

import React, { useState } from "react";
import Link from "next/link";
import SendMessage from "./SendMessage";

const linkClass = "w-fit hover:underline cursor-pointer";

const Footer = () => {
    const [showSendMessage, setShowSendMessage] = useState(false);

    return (
        <div className="w-full min-h-[40svh] pb-8 radius-surface shrink-0 flex flex-col justify-between gap-10">
            <div className="flex flex-col gap-10 sm:flex-row sm:justify-between sm:gap-0">
                <div>
                    <p className="text-foreground-second text-body">
                        More about
                    </p>
                    <p className="text-heading opacity-100 font-inter-bold">
                        Chalkie Chalkie
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-y-12 lg:flex lg:gap-[8dvw]">
                    <div className="flex flex-col gap-5">
                        <p className="text-subheading">Product</p>
                        <div className="flex flex-col gap-1">
                            <Link href="/" className={linkClass}>
                                Home
                            </Link>
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
                            <Link
                                href="/terms-of-service"
                                className={linkClass}
                            >
                                Terms of service
                            </Link>
                            <Link href="/cookie-policy" className={linkClass}>
                                Cookie policy
                            </Link>
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
                                href="https://github.com/HarrisonBaghurst/ChalkieChalkie"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={linkClass}
                            >
                                GitHub
                            </a>
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
