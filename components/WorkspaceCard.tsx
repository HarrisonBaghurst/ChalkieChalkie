import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { userInfo, WorkspaceEditData } from "@/types/userTypes";
import Image from "next/image";
import { getLastEditedText } from "@/lib/textUtils";
import Button from "./Button";
import { useState } from "react";
import TextInput from "./TextInput";
import DateTimeInput from "./DateTimeInput";
import CollaboratorCard from "./CollaboratorCard";

type WorkspaceCardProps = {
    title: string;
    uuid: string;
    host: string;
    description: string;
    collaborators: userInfo[];
    lastEdited: Date;
    loading: boolean;
    startTime: Date | null;
};

const WorkspaceCard = ({
    title,
    uuid,
    host,
    description,
    collaborators,
    lastEdited,
    loading,
    startTime,
}: WorkspaceCardProps) => {
    const router = useRouter();
    const { user, isLoaded, isSignedIn } = useUser();

    const [workspaceData, setWorkspaceData] = useState<WorkspaceEditData>({
        title,
        description,
        collaborators,
        startTime,
    });

    const [pendingChanges, setPendingChanges] = useState<
        Partial<WorkspaceEditData>
    >({});

    const [isSaving, setIsSaving] = useState(false);
    const [undoKey, setUndoKey] = useState(0);

    const handleFieldChange =
        (field: keyof WorkspaceEditData) => (value: string) => {
            setPendingChanges((prev) => ({ ...prev, [field]: value }));
        };

    const handleDateChange = (value: Date) => {
        setPendingChanges((prev) => ({ ...prev, startTime: value }));
    };

    const currentData: WorkspaceEditData = {
        ...workspaceData,
        ...pendingChanges,
    };

    const hasPendingChanges = Object.entries(pendingChanges).some(
        ([key, value]) =>
            value !== workspaceData[key as keyof WorkspaceEditData],
    );

    const goToBoard = () => {
        router.push(`/board/${uuid}`);
    };

    if (loading || !isLoaded) return;
    if (!isSignedIn || !user) return <p>Not signed in</p>;

    const hostInfo = collaborators.find((c) => c.id === host);

    const lastEditedText = getLastEditedText(lastEdited);

    const onSave = async () => {
        if (!hasPendingChanges || isSaving) return;

        const updatedData: WorkspaceEditData = {
            ...workspaceData,
            ...pendingChanges,
        };

        const previousData = workspaceData;
        const previousPending = pendingChanges;

        setWorkspaceData(updatedData);
        setPendingChanges({});
        setIsSaving(true);

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/workspaces/${uuid}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        roomId: uuid,
                        title: updatedData.title,
                        description: updatedData.description,
                        collaborators: updatedData.collaborators.map(
                            (c) => c.id,
                        ),
                        startTime: updatedData.startTime
                            ? updatedData.startTime instanceof Date
                                ? updatedData.startTime.toISOString()
                                : new Date(updatedData.startTime).toISOString()
                            : null,
                    }),
                },
            );

            if (!res.ok) {
                throw new Error("Failed to update workspace");
            }

            const data = await res.json();

            setWorkspaceData({
                title: data.title,
                description: data.description,
                collaborators: data.user_ids ?? updatedData.collaborators,
                startTime: data.start_time ? new Date(data.start_time) : null,
            });
        } catch (err) {
            console.error(err);

            setWorkspaceData(previousData);
            setPendingChanges(previousPending);

            alert("Failed to save changes. Your edits have been restored.");
        } finally {
            setIsSaving(false);
        }
    };

    const onUndo = () => {
        setPendingChanges({});
        setUndoKey((k) => k + 1);
    };

    return (
        <div className="bg-white/5 rounded-2xl w-full h-fit border border-white/10 flex flex-col gap-8 px-8 py-5 relative">
            <div className="flex justify-between">
                {hostInfo ? (
                    <div className="flex gap-2 items-center">
                        <div className="relative w-6 h-6 rounded-full overflow-hidden">
                            <Image
                                src={hostInfo.imageUrl}
                                alt="host image"
                                fill
                            />
                        </div>
                        <div className="text-sm text-foreground-second">
                            {`${hostInfo.firstName}'s Workspace`}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-foreground-second">
                        Error loading host
                    </div>
                )}
                {hasPendingChanges && (
                    <div className="flex gap-2">
                        <Button
                            text={isSaving ? "Saving…" : "Save"}
                            variant="save"
                            size="small"
                            icon="/icons/bookmar-save-svgrepo-com.svg"
                            handleClick={onSave}
                        />
                        <Button
                            text="Undo"
                            variant="delete"
                            size="small"
                            icon="/icons/trash-delete-svgrepo-com.svg"
                            handleClick={onUndo}
                        />
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-1">
                <TextInput
                    key={`title-${undoKey}`}
                    text={currentData.title}
                    className="font-poppins-bold text-foreground text-2xl leading-8"
                    placeholder="Untitled workspace"
                    onChange={handleFieldChange("title")}
                />
                <DateTimeInput
                    key={`startTime-${undoKey}`}
                    setTime={currentData.startTime}
                    onChange={(date) => handleDateChange(date)}
                />
            </div>
            <TextInput
                key={`description-${undoKey}`}
                title="DESCRIPTION"
                text={currentData.description}
                placeholder="No description yet..."
                onChange={handleFieldChange("description")}
            />
            <div className="flex flex-col gap-2">
                <div className="text-sm text-foreground-third">
                    COLLABORATORS
                </div>
                <div className="flex flex-col gap-0">
                    {collaborators.map((collaborator, i) => (
                        <CollaboratorCard
                            key={i}
                            image={collaborator.imageUrl}
                            firstName={collaborator.firstName}
                            lastName={collaborator.lastName}
                            email={collaborator.email}
                            handleRemove={() => {}}
                        />
                    ))}
                </div>
                <div className="w-full flex">
                    <Button
                        text="Edit collaborators"
                        size="small"
                        variant="secondary"
                        handleClick={() => {}}
                    />
                </div>
            </div>
            <Button
                text="Join Workspace"
                handleClick={goToBoard}
                variant="secondary"
                size="large"
            />
        </div>
    );
};

export default WorkspaceCard;
