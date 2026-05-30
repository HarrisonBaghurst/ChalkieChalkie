import Image from "next/image";
import React from "react";
import { Workspace } from "@/types/userTypes";

interface NextProps {
    workspace: Workspace | null;
    counterpartyImage: string | null;
    counterpartyName: string | null;
}

const formatNextTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const now = new Date();
    const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
    if (sameDay) return `Today ${hh}:${mm}`;
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mo} ${hh}:${mm}`;
};

const Next = ({ workspace, counterpartyImage, counterpartyName }: NextProps) => {
    if (!workspace) {
        return (
            <div className="w-2/3 rounded-2xl py-6 px-6 border-2 border-white/10 bg-white/10">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                        <span className="text-foreground-third">
                            Next Session
                        </span>
                        <span className="text-foreground">
                            No upcoming sessions scheduled
                        </span>
                    </div>
                    <button className="bg-white/10 py-3 px-6 rounded-md cursor-pointer">
                        Schedule a session
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-2/3 rounded-2xl py-6 px-6 border-2 border-white/10 bg-white/10">
            <div className="flex justify-between items-center">
                <div className="flex gap-7 items-center">
                    <div className="relative w-16 h-16 rounded-full bg-white/10 overflow-hidden">
                        {counterpartyImage && (
                            <Image
                                src={counterpartyImage}
                                alt={counterpartyName ?? "Member"}
                                fill
                                sizes="64px"
                                className="object-cover"
                            />
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-3 ">
                            <span>Next Session</span>
                            <span>•</span>
                            <span>{formatNextTime(workspace.startTime)}</span>
                        </div>
                        <h1 className="text-2xl font-poppins-regular text-foreground">
                            {workspace.title}
                        </h1>
                        <div className="">
                            {workspace.description || "No description"}
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button className="bg-white/10 py-3 px-6 rounded-md cursor-pointer">
                        Edit Workspace
                    </button>
                    <button className="bg-white/10 py-3 px-6 rounded-md cursor-pointer">
                        Join Workspace
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Next;
