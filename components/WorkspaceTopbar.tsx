"use client";

import { Workspace } from "@/types/userTypes";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";

const WorkspaceTopbar = () => {
    const { boardId: workspaceId } = useParams<{ boardId: string }>();
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    const returnHome = () => {
        router.push("/");
    };

    useEffect(() => {
        if (!workspaceId) return;

        const fetchWorkspace = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${workspaceId}`,
                );

                if (!res.ok) {
                    const message = await res.text();
                    setError(message);
                    console.error("Failed to fetch workspace info");
                    toast.error("Failed to fetch workspace info.", {
                        description: "Please reload the page and try again.",
                    });
                    return;
                }

                const data: Workspace = await res.json();
                setWorkspace(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
                console.error("Failed to fetch workspace info");
                toast.error("Failed to fetch workspace info.", {
                    description: "Please reload the page and try again.",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchWorkspace();
    }, [workspaceId]);

    const title = loading
        ? "Loading..."
        : error
          ? "Workspace"
          : (workspace?.title ?? "Untitled workspace");

    return (
        <div className="absolute top-4 px-4 py-3 left-1/2 w-[75%] -translate-x-1/2 bg-[#0d0d0a] rounded-full border border-[color-mix(in_oklab,var(--color-white)_5%,transparent)] flex justify-between items-center">
            <div className="flex gap-4 items-center">
                <button
                    className="w-8 h-8 relative cursor-pointer"
                    onClick={returnHome}
                >
                    <Image
                        src={"/icons/home-20-svgrepo-com.svg"}
                        alt="this"
                        fill
                    />
                </button>
                <div className="w-0.5 bg-[color-mix(in_oklab,var(--color-white)_5%,transparent)] h-8" />
                <p className="text-foreground">{title}</p>
            </div>
            <UserButton />
        </div>
    );
};

export default WorkspaceTopbar;
