"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * The structured half of a resume: one row per job.
 *
 * Kept alongside the free-text resume rather than derived from it. Chefs write
 * their history as prose, but the directory has to filter on discrete roles and
 * dates, and no amount of parsing turns one reliably into the other.
 */

export type ExperienceRow = {
  company: string;
  position: string;
  location: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  highlights: string;
};

/** Mirrors EMPLOYMENT_TYPES in the profile PUT route — keep the two in step. */
export const EMPLOYMENT_TYPES = [
  "Restaurant",
  "Private household",
  "Yacht",
  "Events & catering",
  "Hotel & resort",
  "Freelance",
  "Other",
] as const;

export const EMPTY_EXPERIENCE: ExperienceRow = {
  company: "",
  position: "",
  location: "",
  employmentType: "",
  startDate: "",
  endDate: "",
  highlights: "",
};

export function ExperienceEditor({
  value,
  onChange,
  max = 40,
}: {
  value: ExperienceRow[];
  onChange: (next: ExperienceRow[]) => void;
  max?: number;
}) {
  function update(index: number, patch: Partial<ExperienceRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-4">
      {value.map((row, index) => (
        <div
          key={index}
          className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/50">
              Role {index + 1}
            </p>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="flex items-center gap-1 text-xs font-semibold text-rust"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`exp-position-${index}`}>Title</Label>
              <Input
                id={`exp-position-${index}`}
                value={row.position}
                onChange={(e) => update(index, { position: e.target.value })}
                placeholder="Sous Chef"
              />
            </div>
            <div>
              <Label htmlFor={`exp-company-${index}`}>Where</Label>
              <Input
                id={`exp-company-${index}`}
                value={row.company}
                onChange={(e) => update(index, { company: e.target.value })}
                placeholder="Alo, Toronto"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`exp-type-${index}`}>Kind of work</Label>
              <select
                id={`exp-type-${index}`}
                value={row.employmentType}
                onChange={(e) => update(index, { employmentType: e.target.value })}
                className="flex h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm"
              >
                <option value="">Select…</option>
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor={`exp-location-${index}`}>Location</Label>
              <Input
                id={`exp-location-${index}`}
                value={row.location}
                onChange={(e) => update(index, { location: e.target.value })}
                placeholder="Toronto, ON"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`exp-start-${index}`}>Started</Label>
              <Input
                id={`exp-start-${index}`}
                type="month"
                value={row.startDate}
                onChange={(e) => update(index, { startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`exp-end-${index}`}>Ended</Label>
              <Input
                id={`exp-end-${index}`}
                type="month"
                value={row.endDate}
                onChange={(e) => update(index, { endDate: e.target.value })}
              />
              <p className="mt-1 text-xs text-ink/55">Leave blank if this is current.</p>
            </div>
          </div>

          <div>
            <Label htmlFor={`exp-highlights-${index}`}>What you did there</Label>
            <Textarea
              id={`exp-highlights-${index}`}
              value={row.highlights}
              onChange={(e) => update(index, { highlights: e.target.value })}
              rows={3}
              placeholder="Ran the pass on weekends, 40 covers a night. Built the tasting menu with the chef de cuisine."
            />
          </div>
        </div>
      ))}

      {value.length < max && (
        <button
          type="button"
          onClick={() => onChange([...value, { ...EMPTY_EXPERIENCE }])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 bg-white px-4 py-4 text-sm font-semibold text-ink/70"
        >
          <Plus className="size-4" aria-hidden />
          {value.length === 0 ? "Add your first role" : "Add another role"}
        </button>
      )}
    </div>
  );
}
