import { SignIn } from '@clerk/nextjs'
import React from 'react'

const page = () => {
    return (
        <div className='w-full h-full flex items-center justify-center'>
            <SignIn />
        </div>
    )
}

export default page