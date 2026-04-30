"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteMember } from "@/actions/team";
import type { TeamMember } from "@/components/team/team-member-dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onInvited: (member: TeamMember) => void;
}

export function InviteMemberDialog({ open, onClose, onInvited }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "CSR" | "ACCOUNTING" | "SALES">("CSR");
  const [saving, setSaving] = useState(false);

  function handleClose() {
    setName("");
    setEmail("");
    setRole("CSR");
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const result = await inviteMember(email.trim(), name.trim(), role);
      if (!result.invited) {
        toast.error("A user with that email already exists");
        return;
      }
      toast.success(`Invite sent to ${email}`);
      onInvited({
        id: result.user.id,
        email: result.user.email ?? email,
        name,
        role,
        title: null,
        phone: null,
        is_active: true,
        can_view_commission: false,
        is_commission_eligible: false,
        permissions: [],
        email_signature: null,
      });
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="invite-name">Full Name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Christina Bayne"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="christina@mphunited.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="CSR">CSR</SelectItem>
                <SelectItem value="ACCOUNTING">Accounting</SelectItem>
                <SelectItem value="SALES">Sales</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}