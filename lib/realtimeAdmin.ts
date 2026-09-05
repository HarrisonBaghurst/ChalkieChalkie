// The realtime Worker's origin over HTTPS. NEXT_PUBLIC_REALTIME_URL is a wss://
// URL because that is what the browser opens; the admin calls are plain fetches.
const httpOrigin = () =>
    process.env.NEXT_PUBLIC_REALTIME_URL!.replace(/^ws/, "http");

const adminHeaders = () => ({
    Authorization: `Bearer ${process.env.REALTIME_ADMIN_SECRET!}`,
});

export async function deleteRealtimeRoom(roomId: string): Promise<void> {
    const response = await fetch(
        `${httpOrigin()}/rooms/${encodeURIComponent(roomId)}`,
        { method: "DELETE", headers: adminHeaders() },
    );

    if (!response.ok) {
        throw new Error(
            `Failed to delete realtime room ${roomId}: ${response.status}`,
        );
    }
}
