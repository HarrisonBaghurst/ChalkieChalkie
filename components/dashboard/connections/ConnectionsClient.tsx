"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { LinkRole, LinkSummary } from "@/types/linkTypes";
import { UserRole } from "@/types/userTypes";
import DashboardShell from "../DashboardShell";
import Sidebar from "../Sidebar";
import TabBar from "../mobile/TabBar";
import ConnectionsList from "../mobile/ConnectionsList";
import ConnectionsSkeleton from "../skeletons/ConnectionsSkeleton";
import ConnectionsTable from "./ConnectionsTable";
import LinkCodeDialog from "./LinkCodeDialog";

type ConnectionsClientProps = {
    // Server-resolved, so the heading doesn't flash before Clerk hydrates.
    role?: UserRole;
};

// No ENVIRONMENT=testing fixture path here — this always hits the live API.
const ConnectionsClient = ({ role: serverRole }: ConnectionsClientProps) => {
    const { isLoaded, isSignedIn } = useUser();
    const clientRole = useUserRole();
    const role = serverRole ?? clientRole;
    const roleKnown = !!serverRole || isLoaded;

    const [links, setLinks] = useState<LinkSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

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
            } finally {
                setLoading(false);
            }
        };

        fetchLinks();
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

    const friends = links.map((l) => l.counterparty);
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

    return (
        <DashboardShell
            sidebar={
                <Sidebar
                    role={serverRole}
                    friends={friends}
                    onLinked={handleLinked}
                />
            }
            bottomBar={
                <TabBar
                    role={serverRole}
                    friends={friends}
                    onLinked={handleLinked}
                />
            }
        >
            {loading || !isLoaded ? (
                <ConnectionsSkeleton heading={heading} />
            ) : isUnsupportedRole ? (
                <div className="flex flex-col gap-1">
                    <p className="text-heading font-inter-bold">
                        Connections
                    </p>
                    <p className="text-foreground-second">
                        Connections are for tutors and students.
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between">
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
                        {/* Below lg this same action is the TabBar's floating
                            button, so showing it here too would offer it
                            twice. */}
                        <Button
                            onClick={() => setDialogOpen(true)}
                            className="hidden lg:inline-flex"
                        >
                            Link a {linkRole === "tutor" ? "student" : "tutor"}
                        </Button>
                    </div>

                    {/* Swapped by CSS rather than a media-query hook, same as
                        the dashboard's list — see WorkspaceLists. */}
                    <div className="lg:hidden">
                        <ConnectionsList
                            links={links}
                            role={linkRole}
                            onRemove={handleRemove}
                        />
                    </div>
                    <div className="hidden lg:block">
                        <ConnectionsTable
                            links={links}
                            role={linkRole}
                            onRemove={handleRemove}
                        />
                    </div>

                    <LinkCodeDialog
                        open={dialogOpen}
                        role={linkRole}
                        onClose={() => setDialogOpen(false)}
                        onLinked={handleLinked}
                    />
                </>
            )}
        </DashboardShell>
    );
};

export default ConnectionsClient;
