'use client'

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const Header = () => {
    const router = useRouter();

    const returnHome = () => {
        router.push('/');
    }

    return (
        <div className='top-0 fixed w-[84%] bg-card-background rounded-b-xl mx-[8%] h-12 text-lg flex items-center px-4 justify-between z-500'>
            <button
                className='cursor-pointer'
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