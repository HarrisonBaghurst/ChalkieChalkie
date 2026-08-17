"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import RowActionsMenu from "@/components/dashboard/RowActionsMenu";
import { formatRelativeTime } from "@/lib/textUtils";
import { LinkSummary } from "@/types/linkTypes";

type ConnectionRowProps = {
    link: LinkSummary;
    onRemove: (linkId: string) => void;
};

// On the cells, not the <tr>: border-separate won't render <tr> borders or
// clip the last row's corners reliably.
const cellClass =
    "px-3 py-3 align-middle text-small border-b border-foreground-third/10 group-hover:bg-foreground-third/10";

const ConnectionRow = ({ link, onRemove }: ConnectionRowProps) => {
    const { counterparty } = link;
    const fullName = `${counterparty.firstName} ${counterparty.lastName}`.trim();

    return (
        <tr className="group">
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
                <Badge>
                    {link.sharedWorkspaces} workspace
                    {link.sharedWorkspaces === 1 ? "" : "s"}
                </Badge>
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
