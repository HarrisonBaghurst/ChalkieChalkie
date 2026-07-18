"use client";

import { useOthers, useSelf } from "@liveblocks/react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { getUserColour } from "@/lib/userColour";

// raw Supabase "Room" row shape returned by GET /api/workspaces/[id]
type RoomRow = {
    user_ids?: string[];
};

type Member = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
    email: string | null;
};

const ParticipantRoster = () => {
    const { boardId: workspaceId } = useParams<{ boardId: string }>();
    const [members, setMembers] = useState<Member[]>([]);
    const [collapsed, setCollapsed] = useState(false);

    const others = useOthers();
    const self = useSelf();

    // ids currently connected to the room (remote peers + this user)
    const onlineIds = useMemo(() => {
        const ids = new Set(others.map((o) => o.id));
        if (self?.id) ids.add(self.id);
        return ids;
    }, [others, self?.id]);

    // resolve the workspace's full member list once on mount
    useEffect(() => {
        if (!workspaceId) return;
        let cancelled = false;

        const load = async () => {
            try {
                const wsRes = await fetch(`/api/workspaces/${workspaceId}`);
                if (!wsRes.ok) return;
                const ws: RoomRow = await wsRes.json();

                // user_ids already contains every member (incl. the host)
                const memberIds = Array.from(
                    new Set((ws.user_ids ?? []).filter(Boolean)),
                );
                if (memberIds.length === 0) return;

                const usersRes = await fetch("/api/users/batch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userIds: memberIds }),
                });
                if (!usersRes.ok) return;

                const { users }: { users: Member[] } = await usersRes.json();
                if (!cancelled) setMembers(users);
            } catch {
                // roster is non-critical; fail silently
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [workspaceId]);

    // online first, then alphabetical
    const sorted = useMemo(() => {
        return [...members].sort((a, b) => {
            const aOnline = onlineIds.has(a.id) ? 0 : 1;
            const bOnline = onlineIds.has(b.id) ? 0 : 1;
            if (aOnline !== bOnline) return aOnline - bOnline;
            return (a.firstName ?? "").localeCompare(b.firstName ?? "");
        });
    }, [members, onlineIds]);

    const onlineCount = useMemo(
        () => members.filter((m) => onlineIds.has(m.id)).length,
        [members, onlineIds],
    );

    if (members.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 w-64 bg-card-background radius-surface border border-foreground-third/15 overflow-hidden">
            <button
                onClick={() => setCollapsed((c) => !c)}
                className="w-full flex justify-between items-center px-4 py-3 cursor-pointer"
            >
                <span className="text-small text-foreground">
                    Participants
                    <span className="text-foreground-third">
                        {" · "}
                        {onlineCount}/{members.length}
                    </span>
                </span>
                <Image
                    src="/icons/chevron-down.svg"
                    alt={collapsed ? "Expand" : "Collapse"}
                    width={16}
                    height={16}
                    className={`opacity-50 transition-transform ${
                        collapsed ? "-rotate-90" : ""
                    }`}
                />
            </button>

            {!collapsed && (
                <div className="flex flex-col gap-1 px-2 pb-2 max-h-[60vh] overflow-y-auto">
                    {sorted.map((m) => {
                        const online = onlineIds.has(m.id);
                        const name = `${m.firstName ?? ""} ${
                            m.lastName ?? ""
                        }`.trim();
                        return (
                            <div
                                key={m.id}
                                className={`flex gap-3 items-center p-2 radius-surface ${
                                    online ? "" : "opacity-40"
                                }`}
                            >
                                <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
                                    {m.imageUrl ? (
                                        <Image
                                            src={m.imageUrl}
                                            alt={`${name} icon`}
                                            fill
                                            sizes="32px"
                                        />
                                    ) : null}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="text-small text-foreground truncate">
                                        {name || "Anonymous"}
                                    </div>
                                    <div className="text-caption text-foreground-third truncate">
                                        {online ? "Online" : "Offline"}
                                    </div>
                                </div>
                                <div
                                    className="ml-auto w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{
                                        backgroundColor: online
                                            ? getUserColour(m.id)
                                            : "#52525b",
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ParticipantRoster;
