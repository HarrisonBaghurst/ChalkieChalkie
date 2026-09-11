"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { CollapseState } from "@/lib/sidebarCookie";
import { TableDensity } from "@/lib/tableDensityCookie";
import { DASHBOARD_GRACE_MS } from "@/lib/dashboardFilters";
import { mapRoomRow, type RoomRow } from "@/lib/workspaceMapping";
import { ChecklistCounts, resolvePresentation } from "@/lib/gettingStarted";
import { LinkRole, LinkSummary } from "@/types/linkTypes";
import { UserRole } from "@/types/userTypes";
import DashboardShell from "../DashboardShell";
import Sidebar from "../Sidebar";
import TabBar from "../mobile/TabBar";
import GettingStarted, { GettingStartedTakeover } from "../GettingStarted";
import ConnectionsList from "../mobile/ConnectionsList";
import ConnectionsSkeleton from "../skeletons/ConnectionsSkeleton";
import ConnectionsTable from "./ConnectionsTable";

type ConnectionsClientProps = {
    // Server-resolved, so the heading doesn't flash before Clerk hydrates.
    role?: UserRole;
    sidebarCollapsed?: CollapseState;
    tableDensity?: TableDensity;
};

// No ENVIRONMENT=testing fixture path here — this always hits the live API.
const ConnectionsClient = ({
    role: serverRole,
    sidebarCollapsed,
    tableDensity,
}: ConnectionsClientProps) => {
    const { isLoaded, isSignedIn } = useUser();
    const clientRole = useUserRole();
    const role = serverRole ?? clientRole;
    const roleKnown = !!serverRole || isLoaded;

    const [links, setLinks] = useState<LinkSummary[]>([]);
    const [workspaceCount, setWorkspaceCount] = useState(0);
    const [startedCount, setStartedCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const fetchLinks = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/links`,
                    { cache: "no-store" },
                );
                if (!res.ok) {
                    toast.error("Failed to fetch connections.", {
                        description: "Please reload the page and try again.",
                    });
                    return;
                }
                const data = await res.json();
                setLinks(data.links ?? []);
            } catch (err) {
                console.error(err);
            }
        };

        const fetchWorkspaceCounts = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/users/workspaces`,
                    { cache: "no-store" },
                );
                if (!res.ok) return;

                const raw: RoomRow[] = await res.json();
                const workspaces = raw.map(mapRoomRow);
                const cutoff = Date.now() - DASHBOARD_GRACE_MS;

                setWorkspaceCount(workspaces.length);
                setStartedCount(
                    workspaces.filter((w) => {
                        if (!w.startTime) return false;
                        const t = new Date(w.startTime).getTime();
                        return !Number.isNaN(t) && t < cutoff;
                    }).length,
                );
            } catch (err) {
                console.error(err);
            }
        };

        const load = async () => {
            try {
                await Promise.all([fetchLinks(), fetchWorkspaceCounts()]);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [isLoaded, isSignedIn]);

    const handleLinked = (link: LinkSummary) => {
        setLinks((prev) => [
            link,
            ...prev.filter((l) => l.linkId !== link.linkId),
        ]);
    };

    const handleRemove = async (linkId: string) => {
        const previous = links;
        setLinks((prev) => prev.filter((l) => l.linkId !== linkId));

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/links/${linkId}`,
                { method: "DELETE" },
            );
            if (!res.ok) {
                setLinks(previous);
                toast.error("Failed to remove link.", {
                    description: "Please try again.",
                });
                return;
            }
            toast.success("Link removed.");
        } catch (err) {
            console.error(err);
            setLinks(previous);
            toast.error("Something went wrong.");
        }
    };

    const linkRole: LinkRole = role === "tutor" ? "tutor" : "student";

    const heading =
        role === "tutor"
            ? "Your Students"
            : role === "student"
              ? "Your Tutors"
              : "Connections";

    // The API 403s admins from every /api/links route, so show a panel rather
    // than a table they could never populate.
    const isUnsupportedRole = roleKnown && role === "admin";

    const checklistCounts: ChecklistCounts = {
        linkCount: links.length,
        workspaceCount,
        startedCount,
    };

    const presentation = isUnsupportedRole
        ? "hidden"
        : resolvePresentation("connections", checklistCounts);

    const ready = !loading && isLoaded;

    return (
        <DashboardShell
            initialCollapsed={sidebarCollapsed}
            initialDensity={tableDensity}
            sidebar={<Sidebar role={serverRole} onLinked={handleLinked} />}
            bottomBar={<TabBar role={serverRole} onLinked={handleLinked} />}
            overlay={
                ready && presentation === "page" ? (
                    <GettingStartedTakeover
                        role={linkRole}
                        surface="connections"
                        counts={checklistCounts}
                    />
                ) : null
            }
        >
            {!ready ? (
                <ConnectionsSkeleton heading={heading} />
            ) : isUnsupportedRole ? (
                <div className="flex flex-col gap-1">
                    <p className="text-heading font-inter-bold">Connections</p>
                    <p className="text-foreground-second">
                        Connections are for tutors and students.
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-1">
                        <p className="text-heading font-inter-bold">
                            {heading}
                        </p>
                        <p className="text-foreground-second">
                            {role === "tutor"
                                ? "The students you're linked to."
                                : "The tutors you're linked to."}
                        </p>
                    </div>

                    {presentation === "card" && (
                        <GettingStarted
                            role={linkRole}
                            surface="connections"
                            presentation="card"
                            counts={checklistCounts}
                        />
                    )}

                    <div className="md:hidden">
                        <ConnectionsList
                            links={links}
                            role={linkRole}
                            onRemove={handleRemove}
                        />
                    </div>
                    <div className="hidden md:block">
                        <ConnectionsTable
                            links={links}
                            role={linkRole}
                            onRemove={handleRemove}
                        />
                    </div>
                </>
            )}
        </DashboardShell>
    );
};

export default ConnectionsClient;
