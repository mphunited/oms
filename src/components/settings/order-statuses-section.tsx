"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const STATUS_TYPE = "ORDER_STATUS";

export function OrderStatusesSection() {
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    fetchStatuses();
  }, []);

  async function fetchStatuses() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dropdown-configs?type=${STATUS_TYPE}`);
      if (!res.ok) throw new Error(await res.text());
      setStatuses(await res.json());
    } catch {
      toast.error("Failed to load order statuses");
    } finally {
      setLoading(false);
    }
  }

  async function saveStatuses(updated: string[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/dropdown-configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: STATUS_TYPE, values: updated }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchStatuses();
    } catch {
      toast.error("Failed to save order statuses");
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }

  async function handleAdd() {
    const trimmed = newStatus.trim();
    if (!trimmed) {
      toast.error("Status name cannot be empty");
      return;
    }
    if (statuses.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("That status already exists");
      return;
    }
    const ok = await saveStatuses([...statuses, trimmed]);
    if (ok) {
      setNewStatus("");
      toast.success(`"${trimmed}" added`);
    }
  }

  async function handleRemove(status: string) {
    const ok = await saveStatuses(statuses.filter((s) => s !== status));
    if (ok) toast.success(`"${status}" removed`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Order Statuses</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage the status values available in order status dropdowns.
        </p>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Add Status</Label>
        <div className="flex gap-2">
          <Input
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. On Hold"
            className="h-8 text-sm max-w-sm"
            disabled={saving || loading}
          />
          <Button
            onClick={handleAdd}
            disabled={saving || loading || !newStatus.trim()}
            className="h-8 text-sm bg-[#00205B] hover:bg-[#00205B]/90"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Status
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Current Statuses{!loading && ` (${statuses.length})`}
        </Label>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : statuses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No statuses configured.</p>
        ) : (
          <div className="rounded-md border border-border divide-y divide-border max-h-[420px] overflow-y-auto">
            {statuses.map((status) => (
              <div
                key={status}
                className="flex items-center justify-between px-3 py-2 hover:bg-muted/40"
              >
                <span className="text-sm">{status}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(status)}
                  disabled={saving}
                  aria-label={`Remove ${status}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
