'use client'

import { redirect, useRouter } from 'next/navigation';

const Page = () => {
    const router = useRouter();
    const uuid = crypto.randomUUID();

    const handleLoadBoard = () => {
        router.push(`/board/${uuid}`);
    }

    return (
        <div className='w-screen h-screen graph-paper'>
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg text-foreground-second w-[30%]'>
                <h1 className='text-8xl text-foreground underline text-center'>
                    Blackboard
                </h1>
                <p className='pt-6 text-center'>
                    Real-time collaborative whiteboard for math, sincence and research. Seemlessly convert written text into LaTeX. 
                </p>
                <div className='w-full flex justify-center pt-12'>
                    <button 
                    className='card text-foreground cursor-pointer'
                    onClick={() => handleLoadBoard()}
                    >
                        Create Board
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Page