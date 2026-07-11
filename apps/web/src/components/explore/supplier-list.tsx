import { ExternalLink, Phone } from 'lucide-react';
import type { Supplier } from '@/lib/explore';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function SupplierList({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {suppliers.map((s) => (
        <li key={s.id}>
          <Card className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-bold">{s.name}</h2>
              {!s.claimed && (
                <Badge variant="outline" className="shrink-0 text-ink/50">
                  Unclaimed
                </Badge>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.categories.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>

            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/75">
              {s.description}
            </p>

            <p className="mt-3 text-xs text-ink/55">
              Serves: {s.regionsServed.join(', ')}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <a
                href={s.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-forest hover:underline"
              >
                Website <ExternalLink className="size-3.5" />
              </a>
              {s.phone && (
                <span className="inline-flex items-center gap-1 text-ink/60">
                  <Phone className="size-3.5" />
                  {s.phone}
                </span>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
