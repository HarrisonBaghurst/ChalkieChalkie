import React from "react";
import FullscreenLoader from "@/components/FullscreenLoader";

// Shown during the server render gap (the board page awaits params) before the
// Room/Workspace client tree mounts.
const BoardLoading = () => {
    return <FullscreenLoader />;
};

export default BoardLoading;
