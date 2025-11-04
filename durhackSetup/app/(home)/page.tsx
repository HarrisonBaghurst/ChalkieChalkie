'use client'

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const Page = () => {
    const router = useRouter();
    const [uuid, setUuid] = useState<string | null>(null);
    useEffect(() => {
        setUuid(uuidv4());
    }, [])

    const handleLoadBoard = () => {
        if (uuid) {
            router.push(`/board/${uuid}`);
        }
        else {
            console.error('uuid not created');
        }
    }

    return (
        <div className='w-screen h-screen graph-paper'>
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg text-foreground-second'>
                <h1 
                className='text-8xl text-center text-transparent bg-clip-text bg-center bg-cover opacity-90'
                style={{backgroundImage: "url(/img/chalk.jpg)"}}
                >
                    Blackboard
                </h1>
                <p className='pt-4 text-center'>
                    Real-time collaborative whiteboard with LaTeX conversion.
                </p>
                <div className='w-full flex justify-center pt-12'>
                    <button 
                    className='text-background font-bold px-4 py-2 rounded-full cursor-pointer button-bright hover:translate-y-[-2px] hover:scale-105 ease-in-out duration-200'
                    onClick={() => handleLoadBoard()}
                    >
                        Create Board
                    </button>
                </div>
            </div>
            <div className='fixed bottom-2 left-1/2 -translate-x-1/2'>
                <a href='https://github.com/jammy98007'>Jammy98007</a> • <a href='https://github.com/harrisonbaghurst'>HarrisonBaghurst</a> • <a href='https://github.com/vrpst'>vrpst</a>
            </div>
        </div>
    )
}

export default Page