"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const STATUS_TYPE = "ORDER_STATUS";
const FALLBACK_COLOR = "#6b7280";

type Meta = Record<string, { color: string }>;

export function OrderStatusesSection() {
  const [statuses, setStatuses] = useState<string[]>([]);
  const [localMeta, setLocalMeta] = useState<Meta>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colorsDirty, setColorsDirty] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const colorRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchStatuses();
  }, []);

  async function fetchStatuses() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dropdown-configs?type=${STATUS_TYPE}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const values: string[] = Array.isArray(data.values) ? data.values : [];
      const m: Meta = (data.meta as Meta) ?? {};
      setStatuses(values);
      setLocalMeta(m);
      setColorsDirty(false);
    } catch {
      toast.error("Failed to load order statuses");
    } finally {
      setLoading(false);
    }
  }

  async function saveValues(updated: string[], updatedMeta?: Meta) {
    setSaving(true);
    try {
      const res = await fetch("/api/dropdown-configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: STATUS_TYPE, values: updated, meta: updatedMeta ?? localMeta }),
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

  async function handleSaveColors() {
    const ok = await saveValues(statuses, localMeta);
    if (ok) toast.success("Colors saved");
  }

  async function handleAdd() {
    const trimmed = newStatus.trim();
    if (!trimmed) { toast.error("Status name cannot be empty"); return; }
    if (statuses.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("That status already exists");
      return;
    }
    const newMeta = { ...localMeta, [trimmed]: { color: FALLBACK_COLOR } };
    const ok = await saveValues([...statuses, trimmed], newMeta);
    if (ok) { setNewStatus(""); toast.success(`"${trimmed}" added`); }
  }

  async function handleRemove(status: string) {
    const newMeta = { ...localMeta };
    delete newMeta[status];
    const ok = await saveValues(statuses.filter((s) => s !== status), newMeta);
    if (ok) toast.success(`"${status}" removed`);
  }

  function handleColorChange(status: string, color: string) {
    setLocalMeta(prev => ({ ...prev, [status]: { color } }));
    setColorsDirty(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
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
              <><Plus className="h-3.5 w-3.5 mr-1.5" />Add Status</>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            Current Statuses{!loading && ` (${statuses.length})`}
          </Label>
          {colorsDirty && (
            <Button
              size="sm"
              onClick={handleSaveColors}
              disabled={saving}
              className="h-7 text-xs bg-[#00205B] hover:bg-[#00205B]/90"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Colors"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : statuses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No statuses configured.</p>
        ) : (
          <div className="rounded-md border border-border divide-y divide-border max-h-[420px] overflow-y-auto">
            {statuses.map((status) => {
              const color = localMeta[status]?.color ?? FALLBACK_COLOR;
              return (
                <div
                  key={status}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40"
                >
                  <div
                    className="h-6 w-6 shrink-0 rounded border border-gray-300 cursor-pointer"
                    style={{ backgroundColor: color }}
                    onClick={() => colorRefs.current[status]?.click()}
                    title="Click to change color"
                  />
                  <input
                    type="color"
                    className="sr-only"
                    value={color}
                    ref={el => { colorRefs.current[status] = el }}
                    onChange={e => handleColorChange(status, e.target.value)}
                  />
                  <span className="text-sm flex-1">{status}</span>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
