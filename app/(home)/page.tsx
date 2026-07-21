import DashboardLinkButton from "@/components/DashboardLinkButton";
import BetaSignUpButton from "@/components/home/BetaSignUpButton";
import ContactButton from "@/components/home/ContactButton";
import HeroLoginButton from "@/components/home/HeroLoginButton";
import Image from "next/image";
import Link from "next/link";

const page = () => {
    return (
        <div className="px-[16dvw] py-[5dvh] h-full flex flex-col items-center gap-12">
            <div className="flex flex-col gap-12 items-center">
                <div className="flex flex-col gap-8 items-center">
                    <div className="flex gap-3 flex-col items-center">
                        <h1 className="text-display w-fit text-center">
                            Where effort
                        </h1>
                        <h1 className="text-display w-fit text-center">
                            becomes
                        </h1>
                        <h1 className="text-display w-fit text-center">
                            understanding.
                        </h1>
                    </div>
                    <p className="text-subheading font-inter-regular text-foreground-third w-[20ch] text-center">
                        A real-time workspace for tutors and their students.
                    </p>
                </div>
                <BetaSignUpButton />
                <DashboardLinkButton />
            </div>
            <div className="w-full aspect-4/3 relative">
                <Image
                    src={"/imgs/heroEllipse.webp"}
                    alt="background ellipse"
                    fill
                    className="scale-110"
                />
                <Image
                    src={"/imgs/dashboardMockup.webp"}
                    alt="dashboard mockup image"
                    fill
                    className="scale-110 animate-bob"
                    priority
                    unoptimized
                />
            </div>
            {/* <div className="flex flex-col gap-6 2xl:gap-10">
                <h1 className="text-display w-[11ch]">
                    Where Effort Becomes Understanding
                </h1>
                <p className="text-foreground-second text-body">
                    A real-time collaborative workspace for tutors and students.
                    Work through complex problems, schedule lessons, and track
                    progress through Chalkie Chalkie.
                </p>
                <div className="flex gap-6 2xl:gap-12">
                    <BetaSignUpButton />
                    <HeroLoginButton />
                </div>
            </div>
            <div className="flex flex-col gap-6">
                <div className="w-full h-fit gradient-border radius-surface p-4 flex flex-col gap-2">
                    <p className="text-subheading">Still in Private Beta</p>
                    <p className="text-foreground-second text-body">
                        Chalkie Chalkie is still being actively developed. If
                        you encounter any bugs or have an idea for our next
                        feature, please submit them here.
                    </p>
                    <div className="flex justify-end">
                        <ContactButton />
                    </div>
                </div>
                <div className="text-caption text-foreground-third flex gap-8">
                    <p>© Chalkie Chalkie 2026</p>
                    <Link
                        href="/privacy-policy"
                        className="transition-colors hover:text-foreground-second"
                    >
                        Privacy Policy
                    </Link>
                </div>
            </div>
            <div className="hidden 2xl:block absolute left-224 border-2 border-white/10 top-60 w-fit h-fit radius-surface skew-5 rotate-5">
                <div className="relative w-240 h-140 radius-control overflow-hidden">
                    <Image
                        src={"/imgs/dashboardExample.webp"}
                        alt="dashboard example"
                        fill
                        priority
                    />
                </div>
            </div>
            <div className="hidden 2xl:block absolute left-200 border-2 border-white/10 top-90 w-fit h-fit radius-surface skew-5 rotate-5">
                <div className="relative w-240 h-140 radius-control overflow-hidden">
                    <Image
                        src={"/imgs/dashboardExample.webp"}
                        alt="dashboard example"
                        fill
                    />
                </div>
            </div> */}
        </div>
    );
};

export default page;
