"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateMember } from "@/actions/team";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  title: string | null;
  phone: string | null;
  role: "ADMIN" | "CSR" | "ACCOUNTING" | "SALES";
  is_active: boolean;
  email_signature: string | null;
  can_view_commission: boolean;
  is_commission_eligible: boolean;
}

const ROLES = ["ADMIN", "CSR", "ACCOUNTING", "SALES"] as const;

interface Props {
  member: TeamMember | null;
  onClose: () => void;
  onSaved: (updated: TeamMember) => void;
}

export function TeamMemberDialog({ member, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: member?.name ?? "",
    title: member?.title ?? "",
    phone: member?.phone ?? "",
    role: (member?.role ?? "CSR") as TeamMember["role"],
    is_active: member?.is_active ?? true,
    email_signature: member?.email_signature ?? "",
    can_view_commission: member?.can_view_commission ?? false,
    is_commission_eligible: member?.is_commission_eligible ?? false,
  });

  async function handleSave() {
    if (!member) return;
    setSaving(true);
    try {
      await updateMember(member.id, {
        name: form.name,
        title: form.title || null,
        phone: form.phone || null,
        role: form.role,
        is_active: form.is_active,
        email_signature: form.email_signature || null,
        can_view_commission: form.can_view_commission,
        is_commission_eligible: form.is_commission_eligible,
      });
      onSaved({
        ...member,
        name: form.name,
        title: form.title || null,
        phone: form.phone || null,
        role: form.role,
        is_active: form.is_active,
        email_signature: form.email_signature || null,
        can_view_commission: form.can_view_commission,
        is_commission_eligible: form.is_commission_eligible,
      });
      toast.success("Member updated");
      onClose();
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior CSR" />
          </div>

          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="e.g. 555-555-5555" />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as TeamMember["role"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="is_active" checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="can_view_commission" checked={form.can_view_commission} onCheckedChange={(v) => setForm((f) => ({ ...f, can_view_commission: v }))} />
            <Label htmlFor="can_view_commission">Can View Commission Report</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="is_commission_eligible" checked={form.is_commission_eligible} onCheckedChange={(v) => setForm((f) => ({ ...f, is_commission_eligible: v }))} />
            <Label htmlFor="is_commission_eligible">Commission Eligible (appears in commission report)</Label>
          </div>

          <div className="space-y-1.5">
            <Label>Email Signature</Label>
            <Textarea
              value={form.email_signature}
              onChange={(e) => setForm((f) => ({ ...f, email_signature: e.target.value }))}
              rows={4}
              placeholder="Paste your signature HTML here."
            />
            <p className="text-xs text-muted-foreground">
              In Outlook Web, right-click your signature → Inspect to copy the HTML.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="bg-[#00205B] hover:bg-[#001a4a] text-white" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
