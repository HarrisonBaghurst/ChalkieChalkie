'use client'

import Button from '@/components/Button';
import Image from 'next/image';
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

const page = () => {
    const router = useRouter();

    const createBoard = () => {
        const id = uuidv4();
        router.push(`/board/${id}`)
    }

    return (
        <>
            <div className='p-[10%] flex justify-between items-center'>
                <div className='flex justify-center flex-col'>
                    <h1 className='text-5xl font-young'>
                        Chalkie Chalkie
                    </h1>
                    <p className='text-sm text-foreground-second pt-2'>
                        An interactive, collaborative whiteboard for online tutoring.
                    </p>
                    <div className='flex gap-6 mt-8'>
                        <Button
                            text='Create new board'
                            handleClick={createBoard}
                            variant='primary'
                        />
                        <Button
                            text='Open existing board'
                            handleClick={createBoard}
                            variant='secondary'
                        />
                    </div>
                </div>
                <Image
                    src={'/imgs/boardExample.png'}
                    alt='Whiteboard Image'
                    width={2048}
                    height={0}
                    className='card-style w-[40dvw]'
                />
            </div>
            <div className='px-[10%] flex flex-col gap-10 pb-20'>
                <div className='text-xl'>
                    Your existing boards
                </div>
                <div className='grid grid-cols-3 gap-8'>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div
                            key={index}
                            className='card-style aspect-video'
                        >
                        </div>
                    ))}
                </div>
            </div>
        </>
    )

}

export default page