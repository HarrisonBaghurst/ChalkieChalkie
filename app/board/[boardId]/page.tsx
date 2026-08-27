import type { Viewport } from "next";
import Workspace from "@/components/Workspace";
import { Room } from "./Room";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
};

const page = async ({ params }: { params: Promise<{ boardId: string }> }) => {
    const { boardId } = await params;

    return (
        <Room boardId={boardId}>
            <Workspace workspaceId={boardId} />
        </Room>
    );
};

export default page;
