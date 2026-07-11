import { ExternalLink, GraduationCap } from 'lucide-react';
import type { Association, School } from '@/lib/explore';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function SchoolList({ schools }: { schools: School[] }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {schools.map((s) => (
        <li key={s.id}>
          <Card className="flex h-full flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                <GraduationCap className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold leading-tight">
                  {s.name}
                </h3>
                <p className="text-sm text-ink/60">{s.city}</p>
              </div>
            </div>

            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/75">
              {s.blurb}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {s.programs.slice(0, 4).map((p) => (
                <Badge key={p} variant="outline">
                  {p}
                </Badge>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                {s.credential}
              </span>
              <a
                href={s.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-forest hover:underline"
              >
                Programs <ExternalLink className="size-3.5" />
              </a>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function AssociationList({
  associations,
}: {
  associations: Association[];
}) {
  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {associations.map((a) => (
        <li key={a.id}>
          <Card className="flex h-full flex-col p-5">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold">
                {a.acronym ?? a.name}
              </h3>
              <Badge variant="secondary">{a.scope}</Badge>
            </div>
            {a.acronym && (
              <p className="text-sm text-ink/60">{a.name}</p>
            )}
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/75">
              {a.blurb}
            </p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                {a.role}
              </span>
              <a
                href={a.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-forest hover:underline"
              >
                Visit <ExternalLink className="size-3.5" />
              </a>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
