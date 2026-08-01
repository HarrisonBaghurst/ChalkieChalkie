// Account role stored in Clerk `publicMetadata.role`. Mutually exclusive:
// see lib/roles.ts for what each one confers.
export type UserRole = "student" | "tutor" | "admin";

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
    feedback?: string;
};
