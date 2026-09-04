"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import RowActionsMenu from "@/components/dashboard/RowActionsMenu";
import { formatRelativeTime } from "@/lib/textUtils";
import { LinkSummary } from "@/types/linkTypes";

type ConnectionRowProps = {
    link: LinkSummary;
    onRemove: (linkId: string) => void;
};

const cellClass =
    "px-3 py-3 align-middle text-small border-b border-foreground-third/10";

const ConnectionRow = ({ link, onRemove }: ConnectionRowProps) => {
    const { counterparty } = link;
    const fullName =
        `${counterparty.firstName} ${counterparty.lastName}`.trim();

    return (
        <tr>
            <td className={cellClass}>
                <div className="flex items-center gap-3">
                    <Avatar className="rounded-md after:rounded-md">
                        <AvatarImage
                            src={counterparty.imageUrl}
                            alt={fullName}
                            className="rounded-md"
                        />
                        <AvatarFallback className="rounded-md bg-foreground-third">
                            {counterparty.firstName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-inter-bold text-foreground">
                            {fullName || counterparty.email}
                        </span>
                        <span className="text-caption text-foreground-third">
                            {counterparty.email}
                        </span>
                    </div>
                </div>
            </td>
            <td className={cellClass}>
                <span className="text-foreground-second">
                    Linked {formatRelativeTime(link.createdAt)}
                </span>
            </td>
            <td className={cellClass}>
                <span className="text-foreground-second">
                    {link.sharedWorkspaces} workspace
                    {link.sharedWorkspaces === 1 ? "" : "s"}
                </span>
            </td>
            <td className={cellClass}>
                <RowActionsMenu
                    actions={[
                        {
                            label: "Remove link",
                            variant: "destructive",
                            onSelect: () => onRemove(link.linkId),
                        },
                    ]}
                />
            </td>
        </tr>
    );
};

export default ConnectionRow;
