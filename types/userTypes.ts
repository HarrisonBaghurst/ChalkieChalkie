export type userInfo = {
    id: string;
    firstName: string;
    lastName: string;
    imageUrl: string;
};

export type WorkspaceEditData = {
    title: string;
    description: string;
    collaborators: userInfo[];
};
