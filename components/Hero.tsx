"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Button from "./Button";
import gsap from "gsap";

const WORDS = ["Teaching", "Learning"];

const Hero = () => {
    const router = useRouter();

    const createBoard = () => {
        const id = uuidv4();
        router.push(`/board/${id}`);
    };

    const lettersRef = useRef<HTMLSpanElement[]>([]);
    const [wordIndex, setWordIndex] = useState(0);

    const currentWord = WORDS[wordIndex];

    useEffect(() => {
        lettersRef.current = lettersRef.current.slice(0, currentWord.length);

        const ctx = gsap.context(() => {
            const tl = gsap.timeline();

            tl.fromTo(
                lettersRef.current,
                { y: 20, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.5,
                    stagger: 0.04,
                    ease: "back.out(1.7)",
                },
            )
                .to({}, { duration: 1 })
                .to(lettersRef.current, {
                    y: -12,
                    opacity: 0,
                    duration: 0.4,
                    stagger: 0.03,
                    ease: "power2.in",
                    onComplete: () => {
                        setWordIndex((prev) => (prev + 1) % WORDS.length);
                    },
                });
        });

        return () => ctx.revert();
    }, [wordIndex]);

    return (
        <div className="bg-background w-dvw h-dvh flex items-center justify-center overflow-hidden">
            <div className="w-dvw h-dvh absolute top-0 left-0 dotted-paper z-0">
                <div className="absolute left-[10%] bottom-[30%] w-100 h-20">
                    <Image
                        src={"/icons/squiggle1.svg"}
                        alt="squiggle"
                        fill
                        className="rotate-50"
                    />
                </div>
                <div className="absolute right-[10%] top-[30%] w-100 h-20">
                    <Image
                        src={"/icons/squiggle2.svg"}
                        alt="squiggle"
                        fill
                        className="rotate-30"
                    />
                </div>
            </div>
            <div className="bg-background/50 shadow-[0_0_40px_rgba(9,9,6,0.5)] rounded-full p-20 z-100">
                <div className="flex justify-center">
                    <div className="flex flex-col items-center justify-center gap-12">
                        <h1 className="font-mont-bold text-4xl">
                            Your
                            <span className="inline-flex overflow-hidden py-3  m-3 w-44 justify-center">
                                {currentWord.split("").map((char, i) => (
                                    <span
                                        key={`${char}-${i}`}
                                        ref={(el) => {
                                            if (el) lettersRef.current[i] = el;
                                        }}
                                        className="inline-block"
                                    >
                                        {char}
                                    </span>
                                ))}
                            </span>
                            tool
                        </h1>
                    </div>
                </div>
                <div className="flex justify-center gap-8 my-[2dvh]">
                    <Button
                        text="Create workspace"
                        handleClick={createBoard}
                        variant="primary"
                        icon="/icons/plus.svg"
                    />
                    <Button
                        text="Join workspace"
                        handleClick={() => {}}
                        variant="secondary"
                        icon="/icons/search.svg"
                    />
                </div>
            </div>
        </div>
    );
};

export default Hero;
