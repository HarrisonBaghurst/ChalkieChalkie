import { Workspace } from "@/types/userTypes";

export type RoomRow = {
    id: string;
    title: string;
    description: string;
    user_ids: string[];
    host_id: string;
    start_time: string;
    opens_at?: string | null;
    expires_at?: string | null;
    last_activity_at?: string;
    lastActivity?: string;
    feedback?: string | null;
};

export const mapRoomRow = (raw: RoomRow): Workspace => ({
    id: raw.id,
    title: raw.title,
    description: raw.description,
    collaboratorIds: raw.user_ids,
    host: raw.host_id,
    startTime: raw.start_time,
    opensAt: raw.opens_at ?? null,
    expiresAt: raw.expires_at ?? null,
    lastActivity: raw.last_activity_at ?? raw.lastActivity ?? "",
    feedback: raw.feedback ?? undefined,
});
