import Workspace from "@/components/Workspace";
import { Room } from "./Room";

const page = async ({ params }: { params: Promise<{ boardId: string }> }) => {
    const { boardId } = await params;

    return (
        <Room boardId={boardId}>
            <Workspace workspaceId={boardId} />
        </Room>
    );
};

export default page;
