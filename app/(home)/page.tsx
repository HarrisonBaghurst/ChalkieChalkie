'use client'

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react'

const Page = () => {

    // this code is temporary - redirect user to random uuid
    const router = useRouter();
    const uuid = crypto.randomUUID();

    useEffect(() => {
        router.push(`/board/${uuid}`);
    }, [])

    return (
        <div className='w-screen h-screen'>
            This is the home page
        </div>
    )
}

export default Page