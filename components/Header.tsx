'use client'

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const Header = () => {
    const router = useRouter();

    const returnHome = () => {
        router.push('/');
    }

    return (
        <div className='top-2 fixed w-[80%] rounded-full mx-[10%] h-10 text-sm flex items-center px-2 justify-between z-500 bg-linear-to-b from-card-background/60 to-[hsl(0,0,18%)]/60 backdrop-blur-md border-b-white/25 border-b'>
            <button
                className='cursor-pointer pl-2'
                onClick={returnHome}
            >
                Chalkie Chalkie
            </button>
            <SignedOut>
                <SignInButton />
            </SignedOut>
            <SignedIn>
                <UserButton />
            </SignedIn>
        </div >
    )
}

export default Header