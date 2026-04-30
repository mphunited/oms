"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamMemberDialog, type TeamMember } from "@/components/team/team-member-dialog";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";

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
  const [inviting, setInviting] = useState(false);

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

  function handleSaved(updated: TeamMember) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
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
      <div className="flex justify-end mb-4">
        <Button onClick={() => setInviting(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

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
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[m.role] ?? ""}`}>
                    {m.role}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={m.is_active ? "default" : "secondary"}>
                    {m.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(m)} aria-label="Edit member">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TeamMemberDialog
        key={editing?.id ?? "none"}
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />

      <InviteMemberDialog
        open={inviting}
        onClose={() => setInviting(false)}
      />
    </>
  );
}