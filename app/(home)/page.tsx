"use client";
import Button from "@/components/dashboard/Button";
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
                    <Button
                        text="Join Private Beta"
                        onClick={() => {}}
                        size="large"
                    />
                    <Button text="Login" onClick={() => {}} size="large" />
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
                        <Button
                            text="Contact Chalkie Chalkie"
                            onClick={() => {}}
                        />
                    </div>
                </div>
                <div className="text-xs text-foreground-third flex gap-8">
                    <p>© Chalkie Chalkie 2026</p>
                    <p>Privacy Policy</p>
                </div>
            </div>
            <div className="absolute right-24 border-2 border-white/10 top-1/2 -translate-y-1/2 w-fit h-fit rounded-lg -skew-3 -rotate-3">
                <div className="relative w-240 h-140 rounded-lg overflow-hidden">
                    <Image
                        src={"/imgs/dashboardExample.webp"}
                        alt="dashboard example"
                        fill
                        priority
                    />
                </div>
            </div>
        </div>
    );
};

export default page;
