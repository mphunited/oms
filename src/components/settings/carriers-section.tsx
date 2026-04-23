"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const CARRIER_TYPE = "CARRIER";

export function CarriersSection() {
  const [carriers, setCarriers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCarrier, setNewCarrier] = useState("");

  useEffect(() => {
    fetchCarriers();
  }, []);

  async function fetchCarriers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dropdown-configs?type=${CARRIER_TYPE}`);
      if (!res.ok) throw new Error(await res.text());
      setCarriers(await res.json());
    } catch {
      toast.error("Failed to load carriers");
    } finally {
      setLoading(false);
    }
  }

  async function saveCarriers(updated: string[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/dropdown-configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: CARRIER_TYPE, values: updated }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchCarriers();
    } catch {
      toast.error("Failed to save carriers");
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }

  async function handleAdd() {
    const trimmed = newCarrier.trim();
    if (!trimmed) {
      toast.error("Carrier name cannot be empty");
      return;
    }
    if (carriers.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("That carrier already exists");
      return;
    }
    const ok = await saveCarriers([...carriers, trimmed]);
    if (ok) {
      setNewCarrier("");
      toast.success(`"${trimmed}" added`);
    }
  }

  async function handleRemove(carrier: string) {
    const ok = await saveCarriers(carriers.filter((c) => c !== carrier));
    if (ok) toast.success(`"${carrier}" removed`);
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
        <h2 className="text-base font-semibold text-foreground">Freight Carriers</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage the carrier names available in the Freight Carrier dropdown on orders.
        </p>
      </div>

      <Separator />

      {/* Add carrier */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Add Carrier</Label>
        <div className="flex gap-2">
          <Input
            value={newCarrier}
            onChange={(e) => setNewCarrier(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Frontline Transportation"
            className="h-8 text-sm max-w-sm"
            disabled={saving || loading}
          />
          <Button
            onClick={handleAdd}
            disabled={saving || loading || !newCarrier.trim()}
            className="h-8 text-sm bg-[#00205B] hover:bg-[#00205B]/90"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1.5" />Add Carrier</>}
          </Button>
        </div>
      </div>

      {/* Carrier list */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            Current Carriers{!loading && ` (${carriers.length})`}
          </Label>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : carriers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No carriers configured.</p>
        ) : (
          <div className="rounded-md border border-border divide-y divide-border max-h-[420px] overflow-y-auto">
            {carriers.map((carrier) => (
              <div key={carrier} className="flex items-center justify-between px-3 py-2 hover:bg-muted/40">
                <span className="text-sm">{carrier}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(carrier)}
                  disabled={saving}
                  aria-label={`Remove ${carrier}`}
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
