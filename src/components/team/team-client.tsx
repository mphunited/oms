"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateMember } from "@/actions/team";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  title: string | null;
  phone: string | null;
  role: "ADMIN" | "CSR" | "ACCOUNTING" | "SALES";
  is_active: boolean;
  email_signature: string | null;
}

const ROLES = ["ADMIN", "CSR", "ACCOUNTING", "SALES"] as const;

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-[#00205B] text-white",
  CSR: "bg-blue-100 text-blue-800",
  ACCOUNTING: "bg-purple-100 text-purple-800",
  SALES: "bg-[#B88A44]/20 text-[#7a5c2a]",
};

export function TeamClient() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    title: "",
    phone: "",
    role: "CSR" as TeamMember["role"],
    is_active: true,
    email_signature: "",
  });

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((data) => {
        setMembers(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load team members");
        setLoading(false);
      });
  }, []);

  function openEdit(member: TeamMember) {
    setEditing(member);
    setForm({
      name: member.name,
      title: member.title ?? "",
      phone: member.phone ?? "",
      role: member.role,
      is_active: member.is_active,
      email_signature: member.email_signature ?? "",
    });
  }

  function closeEdit() {
    setEditing(null);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateMember(editing.id, {
        name: form.name,
        title: form.title || null,
        phone: form.phone || null,
        role: form.role,
        is_active: form.is_active,
        email_signature: form.email_signature || null,
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editing.id
            ? {
                ...m,
                name: form.name,
                title: form.title || null,
                phone: form.phone || null,
                role: form.role,
                is_active: form.is_active,
                email_signature: form.email_signature || null,
              }
            : m
        )
      );
      toast.success("Member updated");
      closeEdit();
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading team…
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id} className={!m.is_active ? "opacity-50" : ""}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-muted-foreground">{m.email}</TableCell>
                <TableCell>{m.title ?? "—"}</TableCell>
                <TableCell>{m.phone ?? "—"}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[m.role] ?? ""}`}
                  >
                    {m.role}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={m.is_active ? "default" : "secondary"}>
                    {m.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(m)}
                    aria-label="Edit member"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Senior CSR"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="e.g. 555-555-5555"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as TeamMember["role"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="space-y-1.5">
              <Label>Email Signature</Label>
              <Textarea
                value={form.email_signature}
                onChange={(e) => setForm((f) => ({ ...f, email_signature: e.target.value }))}
                rows={5}
                placeholder="Paste your signature here. In Outlook Web, right-click your signature and choose Inspect to copy the HTML."
              />
              <p className="text-xs text-muted-foreground">
                In Outlook Web, right-click your signature → Inspect to copy the HTML.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="bg-[#00205B] hover:bg-[#001a4a] text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
