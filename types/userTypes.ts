export type userInfo = {
    id: string;
    firstName: string;
    lastName: string;
    imageUrl: string;
    email: string;
};

export type WorkspaceEditData = {
    title: string;
    description: string;
    collaborators: userInfo[];
    startTime: Date | null;
};

export type Workspace = {
    id: string;
    lastActivity: string;
    host: string;
    collaboratorIds: string[];
    title: string;
    description: string;
    startTime: string;
};
