"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type OrderTypeConfig = {
  id: string;
  order_type: string;
  is_commission_eligible: boolean;
  sort_order: number;
};

export function OrderTypesSection() {
  const [configs, setConfigs] = useState<OrderTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEligible, setNewEligible] = useState(false);

  useEffect(() => {
    Promise.all([fetchConfigs(), fetchMe()]);
  }, []);

  async function fetchMe() {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) return;
      const data = await res.json();
      setIsAdmin(data.role === "ADMIN");
    } catch {
      // leave isAdmin false
    }
  }

  async function fetchConfigs() {
    setLoading(true);
    try {
      const res = await fetch("/api/order-type-configs");
      if (!res.ok) throw new Error(await res.text());
      const data: OrderTypeConfig[] = await res.json();
      setConfigs(data);
    } catch {
      toast.error("Failed to load order types");
    } finally {
      setLoading(false);
    }
  }

  async function putAll(updated: OrderTypeConfig[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/order-type-configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: updated }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: OrderTypeConfig[] = await res.json();
      setConfigs(data);
    } catch {
      toast.error("Failed to save order types");
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const next = [...configs];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
    const reordered = next.map((c, i) => ({ ...c, sort_order: i }));
    await putAll(reordered);
  }

  async function handleToggle(id: string, value: boolean) {
    const updated = configs.map((c) =>
      c.id === id ? { ...c, is_commission_eligible: value } : c
    );
    await putAll(updated);
  }

  async function handleDelete(id: string, name: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/order-type-configs/${id}`, { method: "DELETE" });
      if (res.status === 409) {
        toast.error(`"${name}" is in use and cannot be deleted`);
        setSaving(false);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      toast.success(`"${name}" removed`);
    } catch {
      toast.error("Failed to delete order type");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) { toast.error("Order type name cannot be empty"); return; }
    if (configs.some((c) => c.order_type.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("That order type already exists");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/order-type-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_type: trimmed,
          is_commission_eligible: newEligible,
          sort_order: configs.length,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: OrderTypeConfig = await res.json();
      setConfigs((prev) => [...prev, created]);
      setNewName("");
      setNewEligible(false);
      toast.success(`"${trimmed}" added`);
    } catch {
      toast.error("Failed to add order type");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Order Types</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage the order types available in order type dropdowns. Commission eligibility is determined per type.
        </p>
      </div>

      <Separator />

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : configs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No order types configured.</p>
      ) : (
        <div className="rounded-md border border-border divide-y divide-border">
          {configs.map((cfg, idx) => (
            <div key={cfg.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40">
              {isAdmin && (
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    onClick={() => handleMove(idx, "up")}
                    disabled={saving || idx === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    onClick={() => handleMove(idx, "down")}
                    disabled={saving || idx === configs.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <span className="text-sm flex-1">{cfg.order_type}</span>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Commission Eligible</Label>
                <Switch
                  checked={cfg.is_commission_eligible}
                  onCheckedChange={(v) => handleToggle(cfg.id, v)}
                  disabled={!isAdmin || saving}
                />
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(cfg.id, cfg.order_type)}
                  disabled={saving}
                  aria-label={`Remove ${cfg.order_type}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Add Order Type</Label>
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Drums"
              className="h-8 text-sm max-w-xs"
              disabled={saving || loading}
            />
            <div className="flex items-center gap-1.5">
              <Switch
                checked={newEligible}
                onCheckedChange={setNewEligible}
                disabled={saving || loading}
                id="new-eligible"
              />
              <Label htmlFor="new-eligible" className="text-xs text-muted-foreground cursor-pointer">
                Commission Eligible
              </Label>
            </div>
            <Button
              onClick={handleAdd}
              disabled={saving || loading || !newName.trim()}
              className="h-8 text-sm bg-[#00205B] hover:bg-[#00205B]/90"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <><Plus className="h-3.5 w-3.5 mr-1.5" />Add</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
