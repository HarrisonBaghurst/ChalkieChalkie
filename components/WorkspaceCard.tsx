import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { userInfo, WorkspaceEditData } from "@/types/userTypes";
import Image from "next/image";
import { getLastEditedText } from "@/lib/textUtils";
import Button from "./Button";
import { useCallback, useEffect, useRef, useState } from "react";
import TextInput from "./TextInput";
import DateTimeInput from "./DateTimeInput";
import CollaboratorsInput from "./CollaboratorsInput";
import { useDebouncedCallback } from "use-debounce";

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
    const [saveStatus, setSaveStatus] = useState<
        "idle" | "saving" | "saved" | "error"
    >("idle");

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

    const hostInfo = collaborators.find((c) => c.id === host);

    const lastEditedText = getLastEditedText(lastEdited);

    const onSave = useCallback(
        async (changes: Partial<WorkspaceEditData>) => {
            if (!changes || Object.keys(changes).length === 0 || isSaving)
                return;

            const updatedData: WorkspaceEditData = {
                ...workspaceData,
                ...changes,
            };

            const previousData = workspaceData;

            setWorkspaceData(updatedData);
            setPendingChanges({});
            setIsSaving(true);
            setSaveStatus("saving");

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
                            collaborators: updatedData.collaborators
                                .filter(Boolean)
                                .map((c) => c.id),
                            startTime: updatedData.startTime
                                ? updatedData.startTime instanceof Date
                                    ? updatedData.startTime.toISOString()
                                    : new Date(
                                          updatedData.startTime,
                                      ).toISOString()
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
                    startTime: data.start_time
                        ? new Date(data.start_time)
                        : null,
                });

                setSaveStatus("saved");
            } catch (err) {
                console.error(err);

                setWorkspaceData(previousData);
                setPendingChanges(changes);
                setSaveStatus("error");
            } finally {
                setIsSaving(false);
            }
        },
        [workspaceData, uuid, isSaving],
    );

    const onSaveRef = useRef(onSave);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    const debouncedSave = useDebouncedCallback(
        (changes: Partial<WorkspaceEditData>) => {
            onSaveRef.current(changes);
        },
        1500,
    );

    useEffect(() => {
        if (hasPendingChanges) {
            setSaveStatus("saving");
            debouncedSave(pendingChanges);
        }
    }, [pendingChanges, hasPendingChanges]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden" && hasPendingChanges) {
                debouncedSave.cancel();
                onSaveRef.current(pendingChanges);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () =>
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
    }, [hasPendingChanges, pendingChanges]);

    if (loading || !isLoaded) return;
    if (!isSignedIn || !user) return <p>Not signed in</p>;

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

                <div className="flex gap-2 items-center text-foreground-third">
                    {saveStatus === "saving" && (
                        <span className="text-xs">Saving</span>
                    )}
                    {saveStatus === "saved" && (
                        <span className="text-xs">Saved</span>
                    )}
                    {saveStatus === "error" && (
                        <span className="text-xs">Failed - Retrying</span>
                    )}
                </div>
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
            <CollaboratorsInput
                collaborators={collaborators}
                onSave={(updated) => {
                    const changes = {
                        ...pendingChanges,
                        collaborators: updated.filter(Boolean),
                    };
                    setPendingChanges(changes);
                    debouncedSave.cancel();
                    onSaveRef.current(changes);
                }}
            />
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
