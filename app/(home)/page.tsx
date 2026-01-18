'use client'

import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

const page = () => {
    const router = useRouter();

    const createBoard = () => {
        const id = uuidv4();
        router.push(`/board/${id}`)
    }

    return (
        <div className='w-dvw h-dvh flex justify-center items-center'>
            <div className='flex justify-center flex-col items-center'>
                <h1 className='text-8xl font-young'>
                    Chalkie Chalkie
                </h1>
                <p className='text-4xl text-foreground-second pt-4'>
                    Online collaborative whiteboard
                </p>
                <button
                    className='button-style px-6 py-3 cursor-pointer mt-14 text-3xl'
                    onClick={createBoard}
                >
                    Create new board
                </button>
            </div>
        </div>
    )

}

export default page