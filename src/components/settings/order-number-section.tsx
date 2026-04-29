"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function OrderNumberSection() {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders/next-po-preview?initials=XX")
      .then(r => r.json())
      .then(d => setPreview(d.preview ?? null))
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Order Number Sequence</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          The next order number that will be assigned, shown in preview format.
        </p>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Next Order Number (preview)</p>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <p className="text-xl font-mono font-semibold text-[#00205B]">
            {preview ?? "—"}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          This increments automatically. Contact your administrator if the sequence needs adjustment.
        </p>
      </div>
    </div>
  );
}
