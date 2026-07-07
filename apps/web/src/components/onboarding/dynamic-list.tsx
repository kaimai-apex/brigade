"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type DynamicListProps = {
  label: string;
  addLabel: string;
  fields: { name: string; placeholder: string; type?: string }[];
  minRows?: number;
  defaultRows?: Record<string, string>[];
};

export function DynamicList({
  label,
  addLabel,
  fields,
  minRows = 1,
  defaultRows = [],
}: DynamicListProps) {
  const initial =
    defaultRows.length > 0
      ? defaultRows
      : Array.from({ length: minRows }, () =>
          Object.fromEntries(fields.map((f) => [f.name, ""])),
        );

  const [rows, setRows] = useState<Record<string, string>[]>(initial);

  function addRow() {
    setRows((prev) => [...prev, Object.fromEntries(fields.map((f) => [f.name, ""]))]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: string, value: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={addRow}>
          {addLabel}
        </Button>
      </div>

      {rows.map((row, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-ink/10 bg-cream/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <Input
                key={field.name}
                name={field.name}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                value={row[field.name] ?? ""}
                onChange={(e) => updateRow(index, field.name, e.target.value)}
              />
            ))}
          </div>
          {rows.length > minRows && (
            <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(index)}>
              Remove
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
