import React, { useEffect, useState } from "react";
import Button from "./Button";
import { userInfo, WorkspaceEditData } from "@/types/userTypes";
import Image from "next/image";
import TextInput from "./TextInput";
import { cn } from "@/lib/utils";

type CustomiseWorkspaceModalProps = {
    isOpen: boolean;
    onClose: () => void;
    initialData: WorkspaceEditData;
    onSave: (data: WorkspaceEditData) => void;
    currentUserId: string;
};

const CustomiseWorkspaceModal = ({
    isOpen,
    onClose,
    initialData,
    onSave,
    currentUserId,
}: CustomiseWorkspaceModalProps) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [collaborators, setCollaborators] = useState<userInfo[]>([]);

    const [userSearch, setUserSearch] = useState("");

    const [friends, setFriends] = useState<userInfo[]>([]);
    const [filteredFriends, setFilteredFriends] = useState<userInfo[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(true);

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchFocused, setSearchFocused] = useState(false);

    const handleSearchFocus = () => {
        setSearchFocused(true);
        setSelectedIndex(0);
    };

    const handleSearchBlur = () => {
        setSearchFocused(false);
    };

    const addCollaborator = (user: userInfo) => {
        setCollaborators((prev) => {
            const exists = prev.some((c) => c.id === user.id);
            if (exists) return prev;
            return [...prev, user];
        });
    };

    const removeCollaborator = (userId: string) => {
        setCollaborators((prev) => prev.filter((c) => c.id !== userId));
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && filteredFriends.length > 0) {
            e.preventDefault();
            const selected = filteredFriends[selectedIndex];
            if (selected) {
                addCollaborator(selected);
                setUserSearch("");
                setSelectedIndex(0);
            }
        }
    };

    // loading friends
    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const res = await fetch("/api/get/friends-from-user");

                if (!res.ok) {
                    console.error("Failed to fetch friends");
                }

                const data = await res.json();
                setFriends(data.friends);
                setLoadingFriends(false);
            } catch (err) {
                console.error("Failed to fetch freinds");
            }
        };
        fetchFriends();
    }, []);

    // update filtered friends when friends or user search changes
    useEffect(() => {
        setFilteredFriends(
            friends.filter((friend) =>
                `${friend.firstName} ${friend.lastName}`
                    .toLowerCase()
                    .includes(userSearch.toLowerCase()),
            ),
        );
        setSelectedIndex(0);
    }, [friends, userSearch]);

    // sync modal when opened or data changes
    useEffect(() => {
        if (isOpen) {
            setTitle(initialData.title);
            setDescription(initialData.description);
            setCollaborators(initialData.collaborators);
        }
    }, [isOpen, initialData]);

    // close on esc pressed
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden"; // prevent scroll
        }

        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    const handleSave = () => {
        onSave({
            title,
            description,
            collaborators,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-500 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/75" onClick={onClose} />
            <div className="relative z-10 w-[40dvw] h-[75dvh] bg-[#181815] rounded-2xl border border-white/10 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto flex flex-col gap-8 pt-2">
                    <div className="px-6 pt-6 flex flex-col gap-8">
                        <h3 className="font-mont-bold text-lg text-foreground">
                            Edit workspace
                        </h3>
                        <TextInput
                            title={"TITLE"}
                            placeholder={"e.g. John Doe lesson 3"}
                            value={title}
                            onChange={(text) => setTitle(text)}
                        />
                        <TextInput
                            title={"DESCRIPTION"}
                            placeholder={"e.g. Learning trigonometry"}
                            value={description}
                            onChange={(text) => setDescription(text)}
                            variant="long"
                        />
                    </div>
                    <div className="border-t border-white/10 p-6 flex flex-col gap-8">
                        <div className="flex flex-col gap-2">
                            <div className="text-xs text-foreground-third">
                                COLLABORATORS ({collaborators.length})
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {collaborators.map((collaborator, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 text-sm text-foreground px-2 py-2 rounded-md border border-white/10 bg-white/5 min-w-fit"
                                    >
                                        <div className="relative w-6 h-6 rounded-full overflow-hidden">
                                            <Image
                                                src={collaborator.imageUrl}
                                                alt="user image"
                                                fill
                                                className=""
                                            />
                                        </div>
                                        {`${collaborator.firstName} ${collaborator.lastName}`}
                                        {collaborator.id !== currentUserId && (
                                            <button
                                                className="relative w-6 h-6 cursor-pointer"
                                                onClick={() =>
                                                    removeCollaborator(
                                                        collaborator.id,
                                                    )
                                                }
                                            >
                                                <Image
                                                    src={"/icons/cross.svg"}
                                                    alt="remove collaborator"
                                                    fill
                                                />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <TextInput
                                title={"SEARCH"}
                                placeholder={"e.g. John Doe"}
                                value={userSearch}
                                onChange={(text) => setUserSearch(text)}
                                onFocus={handleSearchFocus}
                                onBlur={handleSearchBlur}
                                onKeyDown={handleSearchKeyDown}
                            />
                            <div className="border-white/10 border rounded-md h-30 overflow-hidden flex flex-col gap-1 p-2 text-sm overflow-y-auto">
                                {!loadingFriends &&
                                    filteredFriends.map((friend, index) => {
                                        const isSelected =
                                            index === selectedIndex;

                                        return (
                                            <div
                                                onMouseEnter={() =>
                                                    setSelectedIndex(index)
                                                }
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    addCollaborator(friend);
                                                    setUserSearch("");
                                                    setSelectedIndex(0);
                                                }}
                                                className={cn(
                                                    "rounded-sm p-2 flex justify-between items-center",
                                                    `${isSelected ? "bg-white/5" : ""}`,
                                                )}
                                                key={index}
                                            >
                                                <div className="flex gap-2 items-center">
                                                    <div className="relative w-6 h-6 rounded-full overflow-hidden">
                                                        <Image
                                                            src={
                                                                friend.imageUrl
                                                            }
                                                            alt="user image"
                                                            fill
                                                        />
                                                    </div>
                                                    {`${friend.firstName} ${friend.lastName}`}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="border-t border-white/10 px-6 py-4 bg-white/2 justify-between w-full gap-2 grid grid-cols-3">
                    <Button
                        text="Cancel"
                        handleClick={onClose}
                        variant="secondary"
                    />
                    <Button
                        text="Save changes"
                        handleClick={handleSave}
                        variant="primary"
                        className="w-full col-span-2"
                    />
                </div>
            </div>
        </div>
    );
};

export default CustomiseWorkspaceModal;
