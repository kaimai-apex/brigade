import Link from "next/link";
import Image from "next/image";
import type { ChefProfile, MediaAsset, Certification } from "@/lib/types";
import { avgRating, priceBand, verifiedBadges } from "@/lib/types";

const CERT_LABEL: Record<Certification["type"], string> = {
  id: "ID verified",
  "food-safety": "Food safety",
  insurance: "Insured",
  "background-check": "Background check",
};

export function GalleryTile({
  asset,
  className = "",
  priority = false,
}: {
  asset: MediaAsset;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`tile-grad relative overflow-hidden rounded-sm flex items-end ${className}`}
      style={
        {
          ["--tw-grad-a"]: asset.gradA,
          ["--tw-grad-b"]: asset.gradB,
        } as React.CSSProperties
      }
    >
      {asset.src && (
        <Image
          src={asset.src}
          alt={asset.label}
          fill
          priority={priority}
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover"
        />
      )}
      {/* legibility scrim + menu-style caption */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
      <span className="relative z-10 p-3 text-xs font-medium tracking-wide text-white/95">
        {asset.label}
      </span>
    </div>
  );
}

export function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="text-copper" aria-label={`${rating.toFixed(1)} out of 5`}>
      {"★".repeat(rounded)}
      <span className="text-stone-300">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}

export function VerifiedBadges({ certs }: { certs: Certification[] }) {
  const verified = verifiedBadges(certs);
  if (!verified.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {verified.map((c) => (
        <li
          key={c.type}
          className="inline-flex items-center gap-1 rounded-full bg-copper-soft text-copper px-2 py-0.5 text-xs font-medium"
        >
          <span aria-hidden>✓</span>
          {CERT_LABEL[c.type]}
        </li>
      ))}
    </ul>
  );
}

export function ChefCard({
  chef,
  priority = false,
}: {
  chef: ChefProfile;
  priority?: boolean;
}) {
  const rating = avgRating(chef.reviews);
  return (
    <Link
      href={`/c/${chef.slug}`}
      className="group block rounded-sm border border-stone-300/70 bg-paper overflow-hidden hover:shadow-lg hover:border-brass transition"
    >
      <div className="grid grid-cols-3 gap-0.5 h-32">
        {chef.gallery.slice(0, 3).map((a, i) => (
          <GalleryTile
            key={a.id}
            asset={a}
            priority={priority && i === 0}
            className={i === 0 ? "col-span-2" : ""}
          />
        ))}
        {chef.gallery.length < 2 && (
          <GalleryTile
            asset={{ id: "ph", label: chef.cuisines[0], gradA: "#e7e5e4", gradB: "#a8a29e" }}
          />
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-ink group-hover:text-copper transition">
            {chef.name}
          </h3>
          <span className="text-sm text-stone-500">{priceBand(chef.eventRate)}</span>
        </div>
        <p className="text-sm text-stone-600 line-clamp-2">{chef.headline}</p>
        <div className="flex flex-wrap gap-1.5">
          {chef.cuisines.map((c) => (
            <span key={c} className="text-xs rounded-full bg-stone-100 px-2 py-0.5 text-stone-700">
              {c}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 text-sm">
          <span className="text-stone-500">{chef.city}</span>
          {rating !== null && (
            <span className="flex items-center gap-1 text-stone-600">
              <Stars rating={rating} />
              <span className="text-xs">({chef.reviews.length})</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
