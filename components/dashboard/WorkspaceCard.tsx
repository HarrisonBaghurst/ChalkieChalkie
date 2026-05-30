import Image from "next/image";
import React from "react";
import { Workspace } from "@/types/userTypes";

interface WorkspaceCardProps {
    workspace: Workspace;
    counterpartyImage: string | null;
    counterpartyName: string | null;
}

const WEEKDAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

const formatCardDate = (iso: string | null) => {
    if (!iso) return { primary: "Not scheduled", secondary: "" };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return { primary: "Not scheduled", secondary: "" };
    const weekday = WEEKDAYS[d.getDay()];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return { primary: `${weekday} • ${hh}:${mm}`, secondary: `${dd}/${mo}/${yy}` };
};

const WorkspaceCard = ({
    workspace,
    counterpartyImage,
    counterpartyName,
}: WorkspaceCardProps) => {
    const { primary, secondary } = formatCardDate(workspace.startTime);
    return (
        <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
                <div className="relative w-12 h-12 bg-white/10 rounded-full overflow-hidden">
                    {counterpartyImage && (
                        <Image
                            src={counterpartyImage}
                            alt={counterpartyName ?? "Member"}
                            fill
                            sizes="48px"
                            className="object-cover"
                        />
                    )}
                </div>
                <div>
                    <div>{workspace.title}</div>
                    <div className="text-sm text-foreground-third">
                        {workspace.description || "No description"}
                    </div>
                </div>
            </div>
            <div className="flex gap-8 justify-end items-center">
                <div className="flex flex-col">
                    <div>{primary}</div>
                    <div className="text-sm text-foreground-third">
                        {secondary}
                    </div>
                </div>
                <button className="bg-white/10 rounded-md py-2 px-4 cursor-pointer">
                    Edit
                </button>
            </div>
        </div>
    );
};

export default WorkspaceCard;
