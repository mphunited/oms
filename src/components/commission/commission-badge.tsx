// src/components/commission/commission-badge.tsx
// Commission status badge — used in commission table and potentially order list.

interface CommissionBadgeProps {
  status: string;
}

export function CommissionBadge({ status }: CommissionBadgeProps) {
  const map: Record<string, string> = {
    "Not Eligible":    "bg-gray-100 text-gray-500",
    "Eligible":        "bg-yellow-100 text-yellow-800",
    "Commission Paid": "bg-green-100 text-green-700",
  };
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
        map[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}
