"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import RowActionsMenu from "@/components/dashboard/RowActionsMenu";
import { DataTableRow } from "@/components/dashboard/DataTable";
import { formatRelativeTime } from "@/lib/textUtils";
import {
    CONNECTIONS_TABLE_COLUMNS,
    ConnectionColumnKey,
} from "@/lib/connectionsTableColumns";
import { LinkSummary } from "@/types/linkTypes";

type ConnectionRowProps = {
    link: LinkSummary;
    onRemove: (linkId: string) => void;
    onToggleActive?: (linkId: string, active: boolean) => void;
};

const ConnectionRow = ({
    link,
    onRemove,
    onToggleActive,
}: ConnectionRowProps) => {
    const { counterparty } = link;
    const fullName =
        `${counterparty.firstName} ${counterparty.lastName}`.trim();

    const cells: Record<ConnectionColumnKey, React.ReactNode> = {
        person: (
            <div className="flex items-center gap-3">
                <Avatar className="rounded-md after:rounded-md shrink-0">
                    <AvatarImage
                        src={counterparty.imageUrl}
                        alt={fullName}
                        className="rounded-md"
                    />
                    <AvatarFallback className="rounded-md bg-foreground-third">
                        {counterparty.firstName.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                    <span className="truncate font-inter-bold text-foreground">
                        {fullName || counterparty.email}
                    </span>
                    <span className="truncate text-caption text-foreground-third">
                        {counterparty.email}
                    </span>
                </div>
                {!link.active && <Badge>Inactive</Badge>}
            </div>
        ),
        linked: (
            <span className="whitespace-nowrap text-foreground-second">
                Linked {formatRelativeTime(link.createdAt)}
            </span>
        ),
        workspaces: (
            <span className="whitespace-nowrap text-foreground-second">
                {link.sharedWorkspaces} workspace
                {link.sharedWorkspaces === 1 ? "" : "s"}
            </span>
        ),
        actions: (
            <RowActionsMenu
                actions={[
                    ...(onToggleActive
                        ? [
                              {
                                  label: link.active
                                      ? "Deactivate"
                                      : "Reactivate",
                                  onSelect: () =>
                                      onToggleActive(link.linkId, !link.active),
                              },
                          ]
                        : []),
                    {
                        label: "Remove link",
                        variant: "destructive",
                        onSelect: () => onRemove(link.linkId),
                    },
                ]}
            />
        ),
    };

    return <DataTableRow columns={CONNECTIONS_TABLE_COLUMNS} cells={cells} />;
};

export default ConnectionRow;
