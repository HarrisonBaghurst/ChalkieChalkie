'use client'

import Button from '@/components/Button';
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
            <div className='bg-card-background rounded-b-xl mx-[12%] h-8 text-xs flex items-center px-4 justify-between'>
                Chalkie Chalkie
            </div>
            <div className='mt-[20dvh] flex justify-center'>
                <div className='flex flex-col items-center justify-center gap-8'>
                    <h1 className='font-mont-bold text-4xl'>
                        Your collaborative Teaching tool
                    </h1>
                    <div className='flex gap-8'>
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
            </div>
        </>
    )

}

export default page