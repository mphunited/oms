// src/lib/schedules/date-utils.ts
// Returns ISO date strings (YYYY-MM-DD) for Monday and Friday of the current week.

export function getMonFri(): { monday: string; friday: string } {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // Days to subtract to get to Monday
  const daysToMon = day === 0 ? 6 : day - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMon);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    monday: monday.toISOString().slice(0, 10),
    friday: friday.toISOString().slice(0, 10),
  };
}

// Format a date string (YYYY-MM-DD) for display in schedule headers
export function formatScheduleDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
