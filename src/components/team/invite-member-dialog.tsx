"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InviteMemberDialog({ open, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const appUrl = "https://oms-jade.vercel.app";

  function handleCopy() {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Share the app URL with the new team member and ask them to sign in
            with their MPH United Microsoft account. Their account will be
            created automatically on first login with a default CSR role.
            You can then update their role and permissions from this page.
          </p>
          <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
            <span className="flex-1 text-sm font-medium">{appUrl}</span>
            <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy URL">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}