'use client';

import { Check, MapPin } from 'lucide-react';
import { EXPERTISE_AREAS } from '@/lib/types/database';
import {
  EXPERIENCE_BANDS,
  type DirectoryFacets,
  type DirectoryParams,
} from '@/lib/directory/params';
import { cn } from '@/lib/utils';

type Props = {
  params: DirectoryParams;
  facets: DirectoryFacets;
  onChange: (next: DirectoryParams) => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-neutral-100 py-4 first:pt-0 last:border-0">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink/50">
        {title}
      </h3>
      {children}
    </div>
  );
}

function OptionRow({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: React.ReactNode;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
        active ? 'bg-forest/10 font-semibold text-forest' : 'hover:bg-neutral-50',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        {active && <Check className="size-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </span>
      {typeof count === 'number' && (
        <span className="shrink-0 text-xs text-ink/40">{count}</span>
      )}
    </button>
  );
}

export function DirectoryFilters({ params, facets, onChange }: Props) {
  const toggleExpertise = (value: string) => {
    const set = new Set(params.expertise ?? []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    onChange({ ...params, expertise: set.size ? [...set] : undefined });
  };

  const availability: {
    key: 'openToWork' | 'emergency' | 'privateEvents' | 'contract';
    label: string;
  }[] = [
    { key: 'openToWork', label: 'Open to work' },
    { key: 'privateEvents', label: 'Private events & weddings' },
    { key: 'contract', label: 'Contract / gig ready' },
    { key: 'emergency', label: 'Emergency / last-minute' },
  ];

  const expertiseFromFacets = facets.expertise.map((f) => f.value);
  const expertiseList = [
    ...expertiseFromFacets,
    ...EXPERTISE_AREAS.filter((a) => !expertiseFromFacets.includes(a)),
  ];

  return (
    <div className="text-sm">
      <Section title="Location">
        <div className="max-h-52 space-y-0.5 overflow-y-auto">
          <OptionRow
            active={!params.city}
            label="All locations"
            onClick={() => onChange({ ...params, city: undefined, state: undefined })}
          />
          {facets.cities.map((c) => (
            <OptionRow
              key={`${c.value}-${c.state ?? ''}`}
              active={params.city === c.value}
              label={
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 text-ink/40" />
                  {c.value}
                  {c.state ? `, ${c.state}` : ''}
                </span>
              }
              count={c.count}
              onClick={() =>
                onChange({
                  ...params,
                  city: c.value,
                  state: c.state ?? undefined,
                })
              }
            />
          ))}
        </div>
      </Section>

      <Section title="Role">
        <div className="max-h-52 space-y-0.5 overflow-y-auto">
          <OptionRow
            active={!params.role}
            label="All roles"
            onClick={() => onChange({ ...params, role: undefined })}
          />
          {facets.roles.map((r) => (
            <OptionRow
              key={r.value}
              active={params.role === r.value}
              label={r.value}
              count={r.count}
              onClick={() => onChange({ ...params, role: r.value })}
            />
          ))}
        </div>
      </Section>

      <Section title="Specialties">
        <div className="max-h-52 space-y-0.5 overflow-y-auto">
          {expertiseList.map((a) => {
            const count = facets.expertise.find((f) => f.value === a)?.count;
            return (
              <OptionRow
                key={a}
                active={(params.expertise ?? []).includes(a)}
                label={a}
                count={count}
                onClick={() => toggleExpertise(a)}
              />
            );
          })}
        </div>
      </Section>

      <Section title="Availability">
        <div className="space-y-0.5">
          {availability.map(({ key, label }) => (
            <OptionRow
              key={key}
              active={Boolean(params[key])}
              label={label}
              onClick={() => onChange({ ...params, [key]: !params[key] || undefined })}
            />
          ))}
        </div>
      </Section>

      <Section title="Experience">
        <div className="space-y-0.5">
          <OptionRow
            active={typeof params.minYears !== 'number'}
            label="Any experience"
            onClick={() => onChange({ ...params, minYears: undefined })}
          />
          {EXPERIENCE_BANDS.map((b) => (
            <OptionRow
              key={b.value}
              active={params.minYears === b.value}
              label={b.label}
              onClick={() => onChange({ ...params, minYears: b.value })}
            />
          ))}
        </div>
      </Section>

      <Section title="Photo">
        <OptionRow
          active={Boolean(params.hasPhoto)}
          label="Has a profile photo"
          onClick={() => onChange({ ...params, hasPhoto: !params.hasPhoto || undefined })}
        />
      </Section>
    </div>
  );
}
