"use client";

import React from "react";
import UserAvatar from "@/components/UserAvatar";
import { getFullName } from "@/lib/userColour";
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
    const fullName = getFullName(counterparty);

    const cells: Record<ConnectionColumnKey, React.ReactNode> = {
        person: (
            <div className="flex items-center gap-3">
                <UserAvatar
                    user={counterparty}
                    className="shrink-0"
                />
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
