"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { CopyIcon, XIcon } from "lucide-react";
import InviteCountdown from "./InviteCountdown";
import { LinkInvite, LinkRole, LinkSummary } from "@/types/linkTypes";

type LinkCodeDialogProps = {
    open: boolean;
    // Decides the copy, and server-side which direction a code may be redeemed.
    role: LinkRole;
    onClose: () => void;
    onLinked: (link: LinkSummary) => void;
};

const counterpartyLabel = (role: LinkRole) =>
    role === "tutor" ? "student" : "tutor";

const LinkCodeDialog = ({
    open,
    role,
    onClose,
    onLinked,
}: LinkCodeDialogProps) => {
    const [invite, setInvite] = useState<LinkInvite | null>(null);
    const [loadingInvite, setLoadingInvite] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [code, setCode] = useState("");
    const [redeeming, setRedeeming] = useState(false);

    // Restores a live code on every open, so a reload doesn't look like the
    // code was lost.
    useEffect(() => {
        if (!open) return;
        setCode("");

        const fetchInvite = async () => {
            setLoadingInvite(true);
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}/api/links/invites`,
                );
                if (!res.ok) return;
                const data = await res.json();
                setInvite(data.invite ?? null);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingInvite(false);
            }
        };

        fetchInvite();
    }, [open]);

    if (!open) return null;

    const generate = async () => {
        if (generating) return;
        setGenerating(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/links/invites`,
                { method: "POST" },
            );
            if (!res.ok) {
                toast.error("Failed to generate a code.", {
                    description: "Please try again.",
                });
                return;
            }
            const data = await res.json();
            setInvite(data);
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong.");
        } finally {
            setGenerating(false);
        }
    };

    const redeem = async () => {
        if (redeeming || code.trim().length === 0) return;
        setRedeeming(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/links/redeem`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code }),
                },
            );
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error ?? "Failed to redeem code.");
                return;
            }
            toast.success("Linked successfully.");
            onLinked(data.link);
            setCode("");
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong.");
        } finally {
            setRedeeming(false);
        }
    };

    const copyCode = async () => {
        if (!invite) return;
        try {
            await navigator.clipboard.writeText(invite.code);
            toast.success("Code copied.");
        } catch {
            toast.error("Failed to copy code.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent
                showCloseButton={false}
                mobileFullScreen
                className="2xl:max-w-125"
            >
                <div className="flex items-center justify-between">
                    <DialogTitle>Link a {counterpartyLabel(role)}</DialogTitle>
                    <DialogClose asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Close"
                            className="text-foreground-third hover:text-foreground"
                        >
                            <XIcon />
                        </Button>
                    </DialogClose>
                </div>

                <Tabs defaultValue="share">
                    <TabsList className="w-full">
                        <TabsTrigger value="share">Share a code</TabsTrigger>
                        <TabsTrigger value="enter">Enter a code</TabsTrigger>
                    </TabsList>

                    <TabsContent
                        value="share"
                        className="flex flex-col gap-4 pt-2"
                    >
                        <p className="text-caption text-foreground-third">
                            Share this code with your{" "}
                            {counterpartyLabel(role)}. It expires 10 minutes
                            after you generate it.
                        </p>
                        {loadingInvite ? (
                            <div className="h-32 flex items-center justify-center text-caption text-foreground-third">
                                Loading…
                            </div>
                        ) : invite ? (
                            <div className="flex flex-col items-center gap-3 control-surface py-6">
                                <span className="text-heading font-inter-bold tracking-[0.3em]">
                                    {invite.code}
                                </span>
                                <InviteCountdown
                                    key={invite.code}
                                    expiresAt={invite.expiresAt}
                                    onExpire={() => setInvite(null)}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={copyCode}
                                    >
                                        <CopyIcon /> Copy
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={generate}
                                        disabled={generating}
                                    >
                                        {generating
                                            ? "Regenerating…"
                                            : "Regenerate"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 control-surface py-6">
                                <span className="text-caption text-foreground-third">
                                    No active code
                                </span>
                                <Button
                                    onClick={generate}
                                    disabled={generating}
                                >
                                    {generating
                                        ? "Generating…"
                                        : "Generate code"}
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent
                        value="enter"
                        className="flex flex-col gap-4 pt-2"
                    >
                        <p className="text-caption text-foreground-third">
                            Enter the code your {counterpartyLabel(role)}{" "}
                            shared with you.
                        </p>
                        <Input
                            value={code}
                            onChange={(e) =>
                                setCode(e.target.value.toUpperCase())
                            }
                            maxLength={8}
                            placeholder="ABC123"
                            className="text-center tracking-[0.3em] uppercase"
                        />
                        <Button
                            onClick={redeem}
                            disabled={redeeming || code.trim().length === 0}
                        >
                            {redeeming ? "Linking…" : "Link account"}
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default LinkCodeDialog;
