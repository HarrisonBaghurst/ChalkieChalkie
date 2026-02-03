'use client'

import Button from '@/components/Button';
import DotGrid from '@/components/DotGrid';
import gsap from 'gsap';
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid'

const WORDS = ['Teaching', 'Learning'];

const page = () => {
    const router = useRouter();

    const createBoard = () => {
        const id = uuidv4();
        router.push(`/board/${id}`)
    }

    const lettersRef = useRef<HTMLSpanElement[]>([]);
    const [wordIndex, setWordIndex] = useState(0);

    const currentWord = WORDS[wordIndex]

    useEffect(() => {
        lettersRef.current = lettersRef.current.slice(0, currentWord.length);

        const ctx = gsap.context(() => {
            const tl = gsap.timeline();

            tl.fromTo(lettersRef.current,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.04, ease: 'back.out(1.7)' },
            )
                .to({}, { duration: 1 })
                .to(lettersRef.current, {
                    y: -12,
                    opacity: 0,
                    duration: 0.4,
                    stagger: 0.03,
                    ease: 'power2.in',
                    onComplete: () => {
                        setWordIndex((prev) => (prev + 1) % WORDS.length);
                    }
                });
        });

        return () => ctx.revert();
    }, [wordIndex])

    return (
        <div className='bg-background w-dvw h-dvh flex items-center justify-center'>
            <div className='fixed w-dvw h-dvh top-0 left-0'>
                <DotGrid
                    dotSize={3}
                    gap={15}
                    baseColor="#2e2f30"
                    activeColor="#1098b5"
                    proximity={120}
                    shockRadius={20}
                    shockStrength={1}
                    resistance={1700}
                    returnDuration={0.5}
                />
            </div>
            <div className='z-10 bg-background/75 p-15 rounded-full shadow-[0px_0px_84px_50px_rgba(20,20,20,0.75)]'>
                <div className='flex justify-center'>
                    <div className='flex flex-col items-center justify-center gap-12'>
                        <h1 className='font-mont-bold text-4xl bg'>
                            Your
                            <span className='inline-flex overflow-hidden py-3  m-3 w-44 justify-center'>
                                {currentWord.split('').map((char, i) => (
                                    <span
                                        key={`${char}-${i}`}
                                        ref={(el) => {
                                            if (el) lettersRef.current[i] = el;
                                        }}
                                        className='inline-block'
                                    >
                                        {char}
                                    </span>
                                ))}
                            </span>
                            tool
                        </h1>
                    </div>
                </div>
                <div className='flex justify-center gap-8 my-[2dvh]'>
                    <Button
                        text='Create workspace'
                        handleClick={createBoard}
                        variant='primary'
                        icon='/icons/plus.svg'
                    />
                    <Button
                        text='Join workspace'
                        handleClick={() => { }}
                        variant='secondary'
                        icon='/icons/search.svg'
                    />
                </div>
            </div>
        </div>
    )

}

export default page