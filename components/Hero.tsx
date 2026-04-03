"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import gsap from "gsap";
import { useUser } from "@clerk/nextjs";

const TITLE = "Where Effort becomes Understanding";

const INFOBAR = [
    {
        text: "Real time collaboration",
        icon: "users-svgrepo-com.svg",
    },
    {
        text: "Designed for tutors & students",
        icon: "graduation-hat-svgrepo-com.svg",
    },
    {
        text: "Simple lesson scheduling",
        icon: "clock-two-svgrepo-com.svg",
    },
    {
        text: "Organised workspaces",
        icon: "folder-plus-svgrepo-com.svg",
    },
];

const Hero = () => {
    const router = useRouter();
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLHeadingElement>(null);
    const buttonsRef = useRef<HTMLDivElement>(null);
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

        if (!title || !subtitle || !buttons) return;

        const words = title.querySelectorAll<HTMLSpanElement>(".word");

        // set initial states for components
        gsap.set([words, subtitle, buttons], {
            opacity: 0,
            yPercent: 50,
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
            "-=0.6",
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
    }, []);

    return (
        <div className="relative mx-[10%] flex flex-col gap-35">
            <div className="mt-50 z-10 flex justify-between w-full">
                <div className="flex flex-col gap-8 w-160">
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
                    <h3
                        ref={subtitleRef}
                        className="text-lg text-foreground-second"
                    >
                        A real-time collaborative workspace built for effective
                        learning. Schedule and manage sessions, work through
                        problems step by step with your tutor or students, and
                        keep track of progress, all in one place.
                    </h3>
                    <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 rounded-full bg-[#9cc0ef]" />
                        <div className="text-[#9cc0ef]">
                            Get early access to Chalkie Chalkie
                        </div>
                    </div>
                </div>
                <div className="w-[40%] relative dotted-paper">
                    <div className="absolute top-25 left-5 w-1/2 h-1/2">
                        <Image
                            src={"/icons/squiggle1.svg"}
                            alt="squiggle"
                            fill
                            className="rotate-45"
                        />
                    </div>
                    <div className="absolute top-30 right-15 w-1/4 h-1/4">
                        <Image
                            src={"/icons/squiggle2.svg"}
                            alt="squiggle"
                            fill
                            className="-rotate-20"
                        />
                    </div>
                </div>
            </div>
            <div className="justify-between w-full flex card-style">
                {INFOBAR.map((info, i) => (
                    <div className="flex gap-2 items-center w-fit " key={i}>
                        <div className="w-6 h-6 relative">
                            <Image
                                src={`/icons/${info.icon}`}
                                alt={info.text}
                                fill
                            />
                        </div>
                        <div>{info.text}</div>
                    </div>
                ))}
            </div>
            <div className="w-full h-90 relative dotted-paper"></div>
        </div>
    );
};

export default Hero;
