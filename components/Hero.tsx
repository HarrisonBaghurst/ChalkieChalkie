"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Button from "./Button";
import gsap from "gsap";
import { useUser } from "@clerk/nextjs";

const TITLE = "Where Effort becomes Understanding";

const Hero = () => {
    const router = useRouter();
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLHeadingElement>(null);
    const buttonsRef = useRef<HTMLDivElement>(null);
    const betaRef = useRef<HTMLDivElement>(null);
    const workspaceHintRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showWorkspaceHint, setShowWorkspaceHint] = useState<Boolean>(false);

    const { isLoaded, isSignedIn } = useUser();

    const createBoard = () => {
        const id = uuidv4();
        router.push(`/board/${id}`);
    };

    const scrollToWorkspaces = () => {
        document
            .getElementById("workspaces")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleLogin = () => {
        router.push("/sign-in");
    };

    // scroll detection handling
    useEffect(() => {
        const handleScroll = () => {
            // hide when scrolling
            setShowWorkspaceHint(false);

            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // show after 5 seconds of not scrolling
            scrollTimeoutRef.current = setTimeout(() => {
                setShowWorkspaceHint(true);
            }, 2500);
        };

        window.addEventListener("scroll", handleScroll);

        // start first timer
        scrollTimeoutRef.current = setTimeout(() => {
            setShowWorkspaceHint(true);
        }, 2500);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current)
                clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    // animate workspace hint
    useEffect(() => {
        const el = workspaceHintRef.current;
        if (!el) return;

        gsap.to(el, {
            opacity: showWorkspaceHint ? 1 : 0,
            duration: 0.4,
            ease: "power2.out",
            pointerEvents: showWorkspaceHint ? "auto" : "none",
        });
    }, [showWorkspaceHint]);

    useEffect(() => {
        const el = workspaceHintRef.current;
        if (!el) return;

        gsap.fromTo(
            el,
            { y: -6 },
            {
                y: 6,
                duration: 1.2,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
            },
        );
    }, []);

    // animation handling
    useEffect(() => {
        const title = titleRef.current;
        const subtitle = subtitleRef.current;
        const buttons = buttonsRef.current;
        const beta = betaRef.current;

        if (!title || !subtitle || !buttons || !beta) return;

        const words = title.querySelectorAll<HTMLSpanElement>(".word");

        // set initial states for components
        gsap.set([words, subtitle, buttons], {
            opacity: 0,
            yPercent: 50,
        });

        gsap.set(beta, {
            opacity: 0,
            xPercent: 10,
            yPercent: 50,
            rotate: -10,
        });

        const tl = gsap.timeline({ delay: 0.5 });

        tl.to(words, {
            opacity: 1,
            duration: 0.75,
            ease: "elastic.out(1, 1)",
            stagger: 0.08,
            yPercent: 0,
        });

        tl.to(
            subtitle,
            {
                opacity: 1,
                yPercent: 0,
                duration: 0.75,
                ease: "elastic.out(1, 1)",
            },
            "-=0.4",
        );

        tl.to(
            buttons,
            {
                opacity: 1,
                yPercent: 0,
                duration: 0.75,
                ease: "elastic.out(1, 1)",
            },
            "-=0.6",
        );

        tl.to(beta, {
            opacity: 1,
            duration: 0.75,
            ease: "elastic.out(1, 1)",
            xPercent: 0,
            yPercent: 0,
            rotate: 0,
        });
    }, []);

    return (
        <div className="relative bg-background w-dvw h-dvh overflow-hidden dotted-paper">
            <div className="[box-shadow:0_4px_100px_rgba(9,9,6,1)] absolute top-1/2 -translate-y-1/2 -left-4 bg-background w-200 h-200 rounded-full flex justify-center items-center">
                <div className="w-120 flex flex-col gap-8 will-change-transform">
                    <h1
                        ref={titleRef}
                        className="font-poppins-bold text-6xl text-foreground will-change-transform"
                    >
                        {TITLE.split(" ").map((word, i) => (
                            <span
                                key={i}
                                className="word inline-block will-change-transform mr-4 last:mr-0"
                            >
                                {word}
                            </span>
                        ))}
                    </h1>
                    <h3 ref={subtitleRef} className="text-foreground text-lg">
                        Schedule lessons, solve problems step by step and share
                        progress effortlessly.
                    </h3>
                    <div ref={buttonsRef}>
                        {!isLoaded ? (
                            <div>Loading your account...</div>
                        ) : isSignedIn ? (
                            <div className="flex gap-8">
                                <Button
                                    text="Create workspace"
                                    handleClick={createBoard}
                                    variant="primary"
                                    className="font-bold"
                                />
                                <Button
                                    text="Join workspace"
                                    handleClick={scrollToWorkspaces}
                                    variant="secondary"
                                />
                            </div>
                        ) : (
                            <div className="flex gap-8">
                                <Button
                                    text="Create account"
                                    handleClick={() => {}}
                                    variant="primary"
                                    className="font-bold"
                                />
                                <Button
                                    text="Sign in"
                                    handleClick={handleLogin}
                                    variant="secondary"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div
                ref={betaRef}
                className="absolute bottom-16 right-16 border-white/10 border bg-[#151512] p-4 rounded-lg flex gap-4 items-center will-change-transform"
            >
                <div className="w-2 h-2 rounded-full bg-[#e3642a]" />
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-poppins-bold">
                        Currently in private beta
                    </p>
                    <p className="text-xs">Contact us to request access</p>
                </div>
            </div>
            <div
                ref={workspaceHintRef}
                className="absolute left-1/2 -translate-x-1/2 bottom-8 flex flex-col items-center"
            >
                <p className="text-xs font-poppins-light text-foreground-second">
                    Your workspaces
                </p>
                <div className="relative w-4 h-4">
                    <Image
                        src={"/icons/down-arrow.svg"}
                        alt="down arrow"
                        fill
                    />
                </div>
            </div>
            <div className="absolute top-25 right-15 w-130 h-130">
                <div className="absolute left-0 bottom-0 w-75 h-75 rotate-45">
                    <Image src={"/icons/squiggle1.svg"} alt="squiggle" fill />
                </div>
                <div className="absolute right-35 top-20 w-35 h-35 -rotate-20">
                    <Image src={"/icons/squiggle2.svg"} alt="squiggle" fill />
                </div>
            </div>
        </div>
    );
};

export default Hero;
