"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type ProductWeight = {
  id: string;
  product_name: string;
  weight_lbs: string;
};

type EditState = { product_name: string; weight_lbs: string };

export function ProductWeightsSection() {
  const [weights, setWeights] = useState<ProductWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ product_name: "", weight_lbs: "" });
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");

  useEffect(() => {
    Promise.all([fetchWeights(), fetchMe()]);
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

  async function fetchWeights() {
    setLoading(true);
    try {
      const res = await fetch("/api/product-weights");
      if (!res.ok) throw new Error(await res.text());
      const data: ProductWeight[] = await res.json();
      setWeights(data);
    } catch {
      toast.error("Failed to load product weights");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(pw: ProductWeight) {
    setEditingId(pw.id);
    setEditState({ product_name: pw.product_name, weight_lbs: pw.weight_lbs });
  }

  async function commitEdit(id: string) {
    const name = editState.product_name.trim();
    const wt = parseFloat(editState.weight_lbs);
    if (!name || isNaN(wt) || wt <= 0) {
      toast.error("Valid product name and weight required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/product-weights/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_name: name, weight_lbs: wt }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: ProductWeight = await res.json();
      setWeights((prev) => prev.map((w) => (w.id === id ? updated : w)));
      setEditingId(null);
      toast.success("Product weight updated");
    } catch {
      toast.error("Failed to update product weight");
    } finally {
      setSaving(false);
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(id); }
    if (e.key === "Escape") { setEditingId(null); }
  }

  async function handleDelete(id: string, name: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/product-weights/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setWeights((prev) => prev.filter((w) => w.id !== id));
      toast.success(`"${name}" removed`);
    } catch {
      toast.error("Failed to delete product weight");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    const name = newName.trim();
    const wt = parseFloat(newWeight);
    if (!name) { toast.error("Product name cannot be empty"); return; }
    if (isNaN(wt) || wt <= 0) { toast.error("Weight must be a positive number"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/product-weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_name: name, weight_lbs: wt }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: ProductWeight = await res.json();
      setWeights((prev) => [...prev, created].sort((a, b) => a.product_name.localeCompare(b.product_name)));
      setNewName("");
      setNewWeight("");
      toast.success(`"${name}" added`);
    } catch {
      toast.error("Failed to add product weight");
    } finally {
      setSaving(false);
    }
  }

  function handleAddKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Product Weights</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage the BOL product weights used in Bill of Lading PDFs. Product names must match order description prefixes exactly.
        </p>
      </div>

      <Separator />

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : weights.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No product weights configured.</p>
      ) : (
        <div className="rounded-md border border-border divide-y divide-border max-h-[420px] overflow-y-auto">
          {weights.map((pw) => (
            <div key={pw.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40">
              {editingId === pw.id ? (
                <>
                  <Input
                    value={editState.product_name}
                    onChange={(e) => setEditState((s) => ({ ...s, product_name: e.target.value }))}
                    onBlur={() => commitEdit(pw.id)}
                    onKeyDown={(e) => handleEditKeyDown(e, pw.id)}
                    className="h-7 text-sm flex-1"
                    autoFocus
                    disabled={saving}
                  />
                  <Input
                    type="number"
                    value={editState.weight_lbs}
                    onChange={(e) => setEditState((s) => ({ ...s, weight_lbs: e.target.value }))}
                    onBlur={() => commitEdit(pw.id)}
                    onKeyDown={(e) => handleEditKeyDown(e, pw.id)}
                    className="h-7 text-sm w-24"
                    disabled={saving}
                    placeholder="lbs"
                  />
                </>
              ) : (
                <>
                  <span
                    className={`text-sm flex-1 ${isAdmin ? "cursor-pointer hover:text-[#00205B]" : ""}`}
                    onClick={() => isAdmin && startEdit(pw)}
                    title={isAdmin ? "Click to edit" : undefined}
                  >
                    {pw.product_name}
                  </span>
                  <span
                    className={`text-sm text-muted-foreground w-24 text-right ${isAdmin ? "cursor-pointer hover:text-[#00205B]" : ""}`}
                    onClick={() => isAdmin && startEdit(pw)}
                    title={isAdmin ? "Click to edit" : undefined}
                  >
                    {pw.weight_lbs} lbs
                  </span>
                </>
              )}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(pw.id, pw.product_name)}
                  disabled={saving || editingId === pw.id}
                  aria-label={`Remove ${pw.product_name}`}
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
          <Label className="text-xs text-muted-foreground">Add Product Weight</Label>
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="e.g. 275 Gal Rebottle IBC"
              className="h-8 text-sm flex-1 max-w-xs"
              disabled={saving || loading}
            />
            <Input
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="lbs"
              className="h-8 text-sm w-24"
              disabled={saving || loading}
            />
            <Button
              onClick={handleAdd}
              disabled={saving || loading || !newName.trim() || !newWeight}
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
