import Board from "@/components/Board";
import { Room } from "./Room";

const page = async ({ params }: { params: Promise<{ boardId: string }> }) => {
    const { boardId } = await params;

    return (
        <Room boardId={boardId}>
            <Board workspaceId={boardId} />
        </Room>
    );
};

export default page;
