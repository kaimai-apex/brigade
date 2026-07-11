import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Instagram, MapPin, Star } from 'lucide-react';
import { getRestaurantBySlug, getRestaurants } from '@/lib/explore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function generateStaticParams() {
  return getRestaurants().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = getRestaurantBySlug(slug);
  return { title: r ? `${r.name} · Explore · Brigade` : 'Restaurant · Brigade' };
}

function isPrestige(source: string) {
  return source === 'Michelin' || source === "Canada's 100 Best";
}

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = getRestaurantBySlug(slug);
  if (!r) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/explore/restaurants"
        className="inline-flex items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink"
      >
        <ArrowLeft className="size-4" /> All restaurants
      </Link>

      <div className="mt-4">
        <p className="flex items-center gap-1 text-sm font-bold uppercase tracking-wide text-forest">
          <MapPin className="size-4" />
          {r.neighbourhood}
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight md:text-5xl">
          {r.name}
        </h1>
        <p className="mt-2 text-ink/60">
          {r.address} · {r.priceLevel}
        </p>
      </div>

      {r.accolades.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {r.accolades.map((a) => (
            <Badge
              key={`${a.source}-${a.detail}-${a.year}`}
              className={
                isPrestige(a.source)
                  ? 'gap-1 bg-gold/15 text-[#8a6d1f]'
                  : 'gap-1 bg-secondary text-secondary-foreground'
              }
            >
              {isPrestige(a.source) && <Star className="size-3 fill-current" />}
              {a.source}: {a.detail} ({a.year})
            </Badge>
          ))}
        </div>
      )}

      <p className="mt-6 text-lg leading-relaxed text-ink/80">{r.blurb}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {r.cuisineTags.map((t) => (
          <Badge key={t} variant="outline">
            {t}
          </Badge>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {r.website && (
          <Button asChild variant="rust">
            <a href={r.website} target="_blank" rel="noopener noreferrer">
              Visit website <ExternalLink className="size-4" />
            </a>
          </Button>
        )}
        {r.reservationUrl && (
          <Button asChild variant="outline">
            <a href={r.reservationUrl} target="_blank" rel="noopener noreferrer">
              Reserve
            </a>
          </Button>
        )}
        {r.instagram && (
          <Button asChild variant="outline">
            <a href={r.instagram} target="_blank" rel="noopener noreferrer">
              <Instagram className="size-4" /> Instagram
            </a>
          </Button>
        )}
      </div>

      <Card className="mt-8 flex flex-col items-start gap-3 bg-secondary/40 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold">Work here?</p>
          <p className="text-sm text-ink/70">
            Claim this venue page to manage details, post jobs, and connect your
            team on Brigade.
          </p>
        </div>
        <Button asChild variant="secondary" className="shrink-0">
          <Link href="/signup">Claim this venue</Link>
        </Button>
      </Card>

      <p className="mt-6 text-xs text-ink/45">
        Directory listing compiled from public sources ({r.accolades
          .map((a) => a.source)
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .join(', ') || 'local press'}
        ). Structured details are enriched via Google Places. Photos and hours
        are fetched live rather than stored.
      </p>
    </div>
  );
}
