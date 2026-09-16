import DashboardLinkButton from "@/components/DashboardLinkButton";
import Footer from "@/components/Footer";
import BetaSignUpButton from "@/components/home/BetaSignUpButton";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
    alternates: { canonical: "/" },
};

const page = () => {
    return (
        <div className="px-[8dvw] py-[5svh] h-full flex flex-col items-center gap-[16svh]">
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
            <div className="w-full aspect-4/3 relative pointer-events-none">
                <Image
                    src={"/imgs/dashboardMockup.webp"}
                    alt="dashboard mockup image"
                    fill
                    sizes="92vw"
                    className="scale-110 animate-bob pointer-events-none"
                    priority
                />
            </div>
            <div className="pt-0 2xl:pt-[16svh] relative w-full">
                <Footer />
            </div>
        </div>
    );
};

export default page;
