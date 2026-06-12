import BetaSignUpButton from "@/components/home/BetaSignUpButton";
import ContactButton from "@/components/home/ContactButton";
import HeroLoginButton from "@/components/home/HeroLoginButton";
import Image from "next/image";

const page = () => {
    return (
        <div className="mx-32 my-24 h-[calc(100%-12rem)] flex flex-col w-135 justify-between">
            <div className="flex flex-col gap-10">
                <h1 className="text-7xl font-inter-bold w-full leading-20">
                    Where Effort Becomes Understanding
                </h1>
                <p className="text-foreground-second text-lg leading-relaxed">
                    A real-time collaborative workspace for tutors and students.
                    Work through complex problems, schedule lessons, and track
                    progress through Chalkie Chalkie.
                </p>
                <div className="flex gap-12">
                    <BetaSignUpButton />
                    <HeroLoginButton />
                </div>
            </div>
            <div className="flex flex-col gap-6">
                <div className="w-full h-fit gradient-border rounded-xl p-4 flex flex-col gap-2">
                    <p className="text-lg font-inter-bold">
                        Still in Private Beta
                    </p>
                    <p className="text-foreground-second text-md">
                        Chalkie Chalkie is still being actively developed. If
                        you encounter any bugs or have an idea for our next
                        feature, please submit them here.
                    </p>
                    <div className="flex justify-end">
                        <ContactButton />
                    </div>
                </div>
                <div className="text-xs text-foreground-third flex gap-8">
                    <p>© Chalkie Chalkie 2026</p>
                    <p>Privacy Policy</p>
                </div>
            </div>
            <div className="absolute right-16 border-2 border-white/10 top-[calc(50%-3rem)] -translate-y-1/2 w-fit h-fit rounded-lg skew-5 rotate-5">
                <div className="relative w-240 h-140 rounded-lg overflow-hidden">
                    <Image
                        src={"/imgs/dashboardExample.webp"}
                        alt="dashboard example"
                        fill
                        priority
                    />
                </div>
            </div>
            <div className="absolute right-40 border-2 border-white/10 top-[calc(50%+3rem)] -translate-y-1/2 w-fit h-fit rounded-lg skew-5 rotate-5">
                <div className="relative w-240 h-140 rounded-lg overflow-hidden">
                    <Image
                        src={"/imgs/dashboardExample.webp"}
                        alt="dashboard example"
                        fill
                    />
                </div>
            </div>
        </div>
    );
};

export default page;
