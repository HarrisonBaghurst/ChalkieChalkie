"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";

type OpenWorkspaceDialogProps = {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

const OpenWorkspaceDialog = ({
    open,
    onConfirm,
    onCancel,
}: OpenWorkspaceDialogProps) => (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
        <DialogContent
            showCloseButton={false}
            className="gap-4 sm:max-w-110"
            onClick={(e) => e.stopPropagation()}
        >
            <DialogTitle>Open this workspace?</DialogTitle>
            <DialogDescription>
                Opening lets your students in and locks the start time. You
                won&apos;t be able to reschedule it afterwards.
            </DialogDescription>
            <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={onConfirm}>Open</Button>
            </div>
        </DialogContent>
    </Dialog>
);

export default OpenWorkspaceDialog;
