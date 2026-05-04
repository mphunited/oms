"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type AddressJson = { street?: string; city?: string; state?: string; zip?: string };
type ScheduleRecipient = { name: string; email: string };

interface FormState {
  name: string;
  legal_name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
  logo_url: string;
}

const EMPTY: FormState = {
  name: "", legal_name: "", street: "", city: "", state: "", zip: "",
  email: "", phone: "", logo_url: "",
};

export function CompanySettingsSection() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [adminRecipients, setAdminRecipients] = useState<ScheduleRecipient[]>([]);
  const [newRecipient, setNewRecipient] = useState({ name: "", email: "" });
  const [frontlineRecipients, setFrontlineRecipients] = useState<ScheduleRecipient[]>([]);
  const [newFrontlineRecipient, setNewFrontlineRecipient] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/company-settings");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const addr = (data.address ?? {}) as AddressJson;
      setForm({
        name: data.name ?? "",
        legal_name: data.legal_name ?? "",
        street: addr.street ?? "",
        city: addr.city ?? "",
        state: addr.state ?? "",
        zip: addr.zip ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        logo_url: data.logo_url ?? "",
      });
      setAdminRecipients((data.admin_schedule_recipients as ScheduleRecipient[]) ?? []);
      setFrontlineRecipients((data.frontline_schedule_contacts as ScheduleRecipient[]) ?? []);
    } catch {
      toast.error("Failed to load company settings");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleAddRecipient() {
    const name = newRecipient.name.trim();
    const email = newRecipient.email.trim();
    if (!name || !email) { toast.error("Name and email are required"); return; }
    setAdminRecipients(prev => [...prev, { name, email }]);
    setNewRecipient({ name: "", email: "" });
  }

  function handleRemoveRecipient(index: number) {
    setAdminRecipients(prev => prev.filter((_, i) => i !== index));
  }

  function handleAddFrontlineRecipient() {
    const name = newFrontlineRecipient.name.trim();
    const email = newFrontlineRecipient.email.trim();
    if (!name || !email) { toast.error("Name and email are required"); return; }
    setFrontlineRecipients(prev => [...prev, { name, email }]);
    setNewFrontlineRecipient({ name: "", email: "" });
  }

  function handleRemoveFrontlineRecipient(index: number) {
    setFrontlineRecipients(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Company name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/company-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, admin_schedule_recipients: adminRecipients, frontline_schedule_contacts: frontlineRecipients }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Company settings saved");
    } catch {
      toast.error("Failed to save company settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Company Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          MPH United company profile used on PDFs and documents.
        </p>
      </div>

      <Separator />

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Company Name</Label>
              <Input
                value={form.name}
                onChange={e => handleChange("name", e.target.value)}
                className="h-8 text-sm"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Legal Name</Label>
              <Input
                value={form.legal_name}
                onChange={e => handleChange("legal_name", e.target.value)}
                className="h-8 text-sm"
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Street</Label>
            <Input
              value={form.street}
              onChange={e => handleChange("street", e.target.value)}
              className="h-8 text-sm"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5 col-span-1">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input
                value={form.city}
                onChange={e => handleChange("city", e.target.value)}
                className="h-8 text-sm"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input
                value={form.state}
                onChange={e => handleChange("state", e.target.value)}
                className="h-8 text-sm"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Zip</Label>
              <Input
                value={form.zip}
                onChange={e => handleChange("zip", e.target.value)}
                className="h-8 text-sm"
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => handleChange("email", e.target.value)}
                className="h-8 text-sm"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input
                value={form.phone}
                onChange={e => handleChange("phone", e.target.value)}
                className="h-8 text-sm"
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Logo URL</Label>
            <Input
              value={form.logo_url}
              onChange={e => handleChange("logo_url", e.target.value)}
              className="h-8 text-sm font-mono text-xs"
              disabled={saving}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Used on PO and BOL PDFs. Must be a publicly accessible URL.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Admin Schedule Recipients</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive the admin (with pricing) version of the weekly schedule email.
              </p>
            </div>

            {adminRecipients.length > 0 && (
              <div className="space-y-1.5">
                {adminRecipients.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5">
                    <span className="text-sm font-medium flex-1">{r.name}</span>
                    <span className="text-sm text-muted-foreground flex-1">{r.email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(i)}
                      disabled={saving}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                      aria-label={`Remove ${r.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input
                placeholder="Name"
                value={newRecipient.name}
                onChange={e => setNewRecipient(prev => ({ ...prev, name: e.target.value }))}
                className="h-8 text-sm flex-1"
                disabled={saving}
              />
              <Input
                type="email"
                placeholder="Email"
                value={newRecipient.email}
                onChange={e => setNewRecipient(prev => ({ ...prev, email: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") handleAddRecipient(); }}
                className="h-8 text-sm flex-1"
                disabled={saving}
              />
              <Button
                type="button"
                onClick={handleAddRecipient}
                disabled={saving}
                variant="outline"
                className="h-8 text-sm border-[#B88A44] text-[#B88A44] hover:bg-[#B88A44]/10"
              >
                Add
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Frontline Schedule Recipients</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Contacts who receive the Frontline carrier schedule email.
              </p>
            </div>

            {frontlineRecipients.length > 0 && (
              <div className="space-y-1.5">
                {frontlineRecipients.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5">
                    <span className="text-sm font-medium flex-1">{r.name}</span>
                    <span className="text-sm text-muted-foreground flex-1">{r.email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFrontlineRecipient(i)}
                      disabled={saving}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                      aria-label={`Remove ${r.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input
                placeholder="Name"
                value={newFrontlineRecipient.name}
                onChange={e => setNewFrontlineRecipient(prev => ({ ...prev, name: e.target.value }))}
                className="h-8 text-sm flex-1"
                disabled={saving}
              />
              <Input
                type="email"
                placeholder="Email"
                value={newFrontlineRecipient.email}
                onChange={e => setNewFrontlineRecipient(prev => ({ ...prev, email: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") handleAddFrontlineRecipient(); }}
                className="h-8 text-sm flex-1"
                disabled={saving}
              />
              <Button
                type="button"
                onClick={handleAddFrontlineRecipient}
                disabled={saving}
                variant="outline"
                className="h-8 text-sm border-[#B88A44] text-[#B88A44] hover:bg-[#B88A44]/10"
              >
                Add
              </Button>
            </div>
          </div>

          <div className="pt-1">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-8 text-sm bg-[#00205B] hover:bg-[#00205B]/90"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Settings"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
