'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { MapLayer, MapPin, Neighbourhood } from '@/lib/explore';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Lightweight, dependency-free map of the GTA core. Renders seed pins with an
 * equirectangular projection onto an SVG — no external tiles, so it works
 * offline and inside strict CSP. The production upgrade (MD §4.8) swaps this
 * for Leaflet + OSM tiles rendering the same pin set; the data contract
 * (MapPin[]) stays identical.
 */

// Fixed viewport over the Toronto core (approx). Pins outside are listed but
// not plotted, so far-flung seeds (e.g. Niagara) don't squash downtown.
const BOUNDS = { latMin: 43.585, latMax: 43.83, lngMin: -79.67, lngMax: -79.19 };
const W = 800;
const H = 520;
const PAD = 28;

const LAYERS: { value: MapLayer; label: string; emoji: string; color: string }[] =
  [
    { value: 'restaurants', label: 'Restaurants', emoji: '🍽️', color: '#c8471f' },
    { value: 'schools', label: 'Schools', emoji: '🎓', color: '#2d4a9e' },
    { value: 'suppliers', label: 'Suppliers', emoji: '🛒', color: '#1c4b3d' },
    { value: 'jobs', label: 'Jobs', emoji: '💼', color: '#e8b84b' },
  ];

const COLOR: Record<MapLayer, string> = {
  restaurants: '#c8471f',
  schools: '#2d4a9e',
  suppliers: '#1c4b3d',
  jobs: '#e8b84b',
};

function project(lat: number, lng: number) {
  const x =
    PAD +
    ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * (W - 2 * PAD);
  const y =
    PAD +
    ((BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin)) * (H - 2 * PAD);
  return { x, y };
}

function inBounds(lat: number, lng: number) {
  return (
    lat >= BOUNDS.latMin &&
    lat <= BOUNDS.latMax &&
    lng >= BOUNDS.lngMin &&
    lng <= BOUNDS.lngMax
  );
}

export function ExploreMap({
  pins,
  neighbourhoods,
}: {
  pins: MapPin[];
  neighbourhoods: Neighbourhood[];
}) {
  const [active, setActive] = useState<Record<MapLayer, boolean>>({
    restaurants: true,
    schools: true,
    suppliers: true,
    jobs: true,
  });
  const [selected, setSelected] = useState<MapPin | null>(null);
  const [focus, setFocus] = useState<Neighbourhood | null>(null);

  const visible = useMemo(
    () => pins.filter((p) => active[p.layer]),
    [pins, active],
  );
  const plotted = useMemo(
    () => visible.filter((p) => inBounds(p.lat, p.lng)),
    [visible],
  );

  function toggle(layer: MapLayer) {
    setActive((a) => ({ ...a, [layer]: !a[layer] }));
  }

  return (
    <div>
      {/* Layer toggles */}
      <div className="mb-4 flex flex-wrap gap-2">
        {LAYERS.map((l) => {
          const on = active[l.value];
          const count = pins.filter((p) => p.layer === l.value).length;
          return (
            <button
              key={l.value}
              type="button"
              onClick={() => toggle(l.value)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition',
                on
                  ? 'border-neutral-300 bg-white text-ink'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-400',
              )}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: on ? l.color : '#d4d4d4' }}
              />
              {l.emoji} {l.label}
              <span className="text-xs text-ink/45">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Neighbourhood quick-jumps */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <span className="mr-1 self-center text-xs font-semibold uppercase tracking-wide text-ink/45">
          Jump to
        </span>
        {neighbourhoods.map((n) => (
          <button
            key={n.slug}
            type="button"
            onClick={() => setFocus((cur) => (cur?.slug === n.slug ? null : n))}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
              focus?.slug === n.slug
                ? 'border-rust bg-rust text-white'
                : 'border-neutral-200 bg-white text-ink/70 hover:bg-neutral-50',
            )}
          >
            {n.name}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-[#eef2ea]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Map of Toronto hospitality pins"
        >
          {/* subtle grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#dbe3d6"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />

          {/* Lake Ontario hint along the south edge */}
          <rect x="0" y={H - 46} width={W} height="46" fill="#cfe0e8" />
          <text
            x={W - 14}
            y={H - 18}
            textAnchor="end"
            className="fill-[#6b93a6]"
            style={{ fontSize: 12, fontStyle: 'italic' }}
          >
            Lake Ontario
          </text>

          {/* focused neighbourhood halo */}
          {focus && inBounds(focus.lat, focus.lng) && (
            (() => {
              const { x, y } = project(focus.lat, focus.lng);
              return (
                <circle
                  cx={x}
                  cy={y}
                  r="46"
                  fill="#c8471f"
                  fillOpacity="0.08"
                  stroke="#c8471f"
                  strokeOpacity="0.35"
                  strokeDasharray="4 4"
                />
              );
            })()
          )}

          {/* pins */}
          {plotted.map((p) => {
            const { x, y } = project(p.lat, p.lng);
            const isSel = selected?.id === p.id;
            return (
              <g
                key={p.id}
                transform={`translate(${x} ${y})`}
                className="cursor-pointer"
                onClick={() => setSelected(p)}
              >
                <circle
                  r={isSel ? 8 : 5.5}
                  fill={COLOR[p.layer]}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
                {isSel && (
                  <circle
                    r="12"
                    fill="none"
                    stroke={COLOR[p.layer]}
                    strokeWidth="1.5"
                    strokeOpacity="0.5"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* selected pin card */}
        {selected && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs">
            <Card className="p-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute right-2 top-2 text-ink/40 hover:text-ink"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
                style={{ background: COLOR[selected.layer] }}
              >
                {selected.layer}
              </span>
              <h3 className="mt-2 pr-4 font-display text-base font-bold leading-tight">
                {selected.name}
              </h3>
              {selected.meta && (
                <p className="mt-0.5 text-sm text-ink/60">{selected.meta}</p>
              )}
              {selected.href && (
                <Link
                  href={selected.href}
                  className="mt-3 inline-block text-sm font-semibold text-forest hover:underline"
                >
                  View details →
                </Link>
              )}
            </Card>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-ink/50">
        Showing {plotted.length} of {visible.length} pins across the GTA core.
        This lightweight view upgrades to full Leaflet + OpenStreetMap tiles in
        production — the pin data stays the same.
      </p>
    </div>
  );
}
