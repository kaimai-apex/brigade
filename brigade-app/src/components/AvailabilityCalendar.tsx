import type { Inquiry } from "@/lib/types";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = (first.getDay() + 6) % 7; // Monday-first offset
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(start).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}

function Month({
  year,
  month,
  booked,
}: {
  year: number;
  month: number;
  booked: Set<string>;
}) {
  const cells = monthGrid(year, month);
  const name = new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  return (
    <div className="rounded-xl border border-stone-200 bg-paper p-4">
      <h3 className="font-medium text-sm mb-3">{name}</h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-stone-400 py-1">{w}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isBooked = booked.has(iso);
          return (
            <span
              key={i}
              title={isBooked ? "Booked" : "Available"}
              className={`aspect-square grid place-items-center rounded-md ${
                isBooked
                  ? "bg-copper text-white font-medium"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {d}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function AvailabilityCalendar({ inquiries }: { inquiries: Inquiry[] }) {
  const booked = new Set(
    inquiries.filter((i) => i.status === "booked").map((i) => i.eventDate),
  );
  // Show the two months where activity is happening (demo anchors to mid-2026).
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Month year={2026} month={6} booked={booked} />
        <Month year={2026} month={7} booked={booked} />
      </div>
      <p className="text-xs text-stone-500">
        <span className="inline-block h-3 w-3 rounded bg-copper align-middle mr-1" />
        Booked dates are blocked automatically when an inquiry is marked
        “booked”.
      </p>
    </div>
  );
}
