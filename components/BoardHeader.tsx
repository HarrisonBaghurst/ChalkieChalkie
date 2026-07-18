"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { toast } from "sonner";

// raw Supabase "Room" row shape returned by GET /api/workspaces/[id]
type RoomRow = {
    title?: string | null;
    host_id?: string | null;
};

type HostInfo = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
};

const MAX_TITLE_LENGTH = 100;

/**
 * Top-left board chrome. Mirrors the dashboard sidebar identity block (host
 * avatar + "{host}'s Chalkie Chalkie") and exposes the workspace title, which
 * the host can edit inline. Saves on blur via the existing workspace PATCH.
 */
const BoardHeader = () => {
    const { boardId: workspaceId } = useParams<{ boardId: string }>();
    const { user } = useUser();
    const router = useRouter();

    const [host, setHost] = useState<HostInfo | null>(null);
    const [hostId, setHostId] = useState<string | null>(null);
    const [title, setTitle] = useState<string>("");

    // last value persisted to the DB, used to detect real changes on blur
    const savedTitleRef = useRef<string>("");

    const isHost = !!user?.id && hostId === user.id;

    // resolve title + host identity once on mount
    useEffect(() => {
        if (!workspaceId) return;
        let cancelled = false;

        const load = async () => {
            try {
                const wsRes = await fetch(`/api/workspaces/${workspaceId}`);
                if (!wsRes.ok) return;
                const ws: RoomRow = await wsRes.json();

                if (!cancelled) {
                    setTitle(ws.title ?? "");
                    savedTitleRef.current = ws.title ?? "";
                    setHostId(ws.host_id ?? null);
                }

                if (!ws.host_id) return;
                const usersRes = await fetch("/api/users/batch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userIds: [ws.host_id] }),
                });
                if (!usersRes.ok) return;
                const { users }: { users: HostInfo[] } = await usersRes.json();
                if (!cancelled && users[0]) setHost(users[0]);
            } catch {
                // header identity is non-critical; fail silently
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [workspaceId]);

    // persist the title only when it has actually changed (fired on blur)
    const commitTitle = async () => {
        const next = title.trim();
        if (!next || next === savedTitleRef.current) {
            setTitle(savedTitleRef.current);
            return;
        }

        const previous = savedTitleRef.current;
        savedTitleRef.current = next;
        setTitle(next);

        try {
            const res = await fetch(`/api/workspaces/${workspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: next }),
            });
            if (!res.ok) throw new Error(String(res.status));
        } catch {
            savedTitleRef.current = previous;
            setTitle(previous);
            toast.error("Could not save the workspace title.");
        }
    };

    const hostFirstName = host?.firstName ?? "Host";

    return (
        <div className="fixed top-4 left-4 z-50 flex items-center gap-4 bg-card-background radius-surface border border-foreground-third/15 px-4 py-3">
            {host?.imageUrl ? (
                <div className="relative w-10 h-10 radius-tag overflow-hidden bg-foreground-third shrink-0">
                    <Image
                        src={host.imageUrl}
                        alt={`${hostFirstName} icon`}
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                    />
                </div>
            ) : (
                <div className="w-10 h-10 radius-tag bg-foreground-third shrink-0" />
            )}

            <div className="font-inter-bold flex flex-col leading-tight">
                <p className="text-caption text-foreground-second">
                    {`${hostFirstName}'s`}
                </p>
                <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="text-left cursor-pointer hover:text-foreground-second transition-colors"
                >
                    Chalkie Chalkie
                </button>
            </div>

            <div className="w-px h-8 bg-foreground-third/15" />

            {isHost ? (
                // inline-grid sizer: the invisible span sets the column width to
                // fit the text, the input stretches to fill it — so the field
                // grows/shrinks exactly with the title.
                <div className="grid items-center max-w-[36vw] min-w-[6ch]">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") {
                                setTitle(savedTitleRef.current);
                                e.currentTarget.blur();
                            }
                        }}
                        maxLength={MAX_TITLE_LENGTH}
                        size={1}
                        aria-label="Workspace title"
                        placeholder="Untitled"
                        className="col-start-1 row-start-1 w-full min-w-0 text-body text-foreground bg-transparent radius-tag px-2 py-1 outline-none hover:bg-white/5 focus:bg-white/5 transition-colors"
                    />
                    <span
                        aria-hidden
                        className="col-start-1 row-start-1 invisible whitespace-pre px-2 py-1 text-body"
                    >
                        {title || "Untitled"}
                    </span>
                </div>
            ) : (
                <p className="text-body text-foreground px-1 max-w-[36vw] truncate">
                    {title || "Untitled"}
                </p>
            )}
        </div>
    );
};

export default BoardHeader;
