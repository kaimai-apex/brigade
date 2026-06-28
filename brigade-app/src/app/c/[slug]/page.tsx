import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllChefs, getChefBySlug } from "@/lib/store";
import { avgRating, priceBand } from "@/lib/types";
import { slugify } from "@/lib/seo";
import { GalleryTile, Stars, VerifiedBadges } from "@/components/ui";
import { InquiryForm } from "@/components/InquiryForm";

export async function generateStaticParams() {
  return (await getAllChefs()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const chef = await getChefBySlug(slug);
  if (!chef) return {};
  return {
    title: `${chef.name} — ${chef.cuisines.join(" & ")} private chef in ${chef.city}`,
    description: chef.headline,
    alternates: { canonical: `/c/${chef.slug}` },
    // Unapproved profiles exist but shouldn't be indexed until vetted.
    robots: chef.approved ? undefined : { index: false, follow: false },
  };
}

export default async function ChefProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chef = await getChefBySlug(slug);
  if (!chef) notFound();

  const rating = avgRating(chef.reviews);

  // schema.org structured data (docs/05 SEO architecture).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Person", "LocalBusiness"],
    name: chef.name,
    description: chef.bio,
    jobTitle: "Private Chef",
    areaServed: chef.serviceAreas.map((a) => a.city),
    knowsAbout: chef.cuisines,
    url: `https://brigade.example/c/${chef.slug}`,
    ...(rating !== null && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.toFixed(1),
        reviewCount: chef.reviews.length,
      },
    }),
    review: chef.reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: { "@type": "Rating", ratingValue: r.rating },
      reviewBody: r.text,
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {!chef.approved && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
          Preview — this profile is awaiting admin verification and isn&apos;t live
          in the directory yet.
        </div>
      )}

      {/* Gallery */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 h-64 mb-6">
        {chef.gallery.map((a, i) => (
          <GalleryTile
            key={a.id}
            asset={a}
            priority={i === 0}
            className={i === 0 ? "col-span-2 row-span-2 h-full" : ""}
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-8">
          <header className="space-y-3">
            <nav className="text-sm text-stone-500">
              <Link href="/chefs" className="hover:text-ink">Directory</Link> ·{" "}
              <Link
                href={`/private-chef/${slugify(chef.city)}`}
                className="hover:text-ink"
              >
                {chef.city}
              </Link>
            </nav>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{chef.name}</h1>
                <p className="text-stone-600 mt-1">{chef.headline}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-stone-500">from</p>
                <p className="text-2xl font-bold">£{chef.eventRate}</p>
                <p className="text-xs text-stone-500">per event · {priceBand(chef.eventRate)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {rating !== null && (
                <span className="flex items-center gap-1.5 text-sm">
                  <Stars rating={rating} />
                  <span className="text-stone-600">
                    {rating.toFixed(1)} · {chef.reviews.length} reviews
                  </span>
                </span>
              )}
              <span className="text-sm text-stone-500">
                {chef.yearsExperience} yrs experience
              </span>
              {chef.founding && (
                <span className="text-xs uppercase tracking-wider font-sans rounded-sm bg-forest text-cream px-2 py-1">
                  Founding chef
                </span>
              )}
            </div>
            <VerifiedBadges certs={chef.certifications} />
          </header>

          <section>
            <h2 className="text-lg font-semibold mb-2">About</h2>
            <p className="text-stone-700 leading-relaxed">{chef.bio}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {chef.cuisines.map((c) => (
                <span key={c} className="text-sm rounded-full bg-stone-100 px-2.5 py-1">
                  {c}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Sample menus</h2>
            <div className="space-y-4">
              {chef.menus.map((m) => (
                <div key={m.id} className="rounded-xl border border-stone-200 bg-paper p-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold">{m.title}</h3>
                    <span className="text-copper font-medium">
                      £{m.pricePerHead}<span className="text-stone-500 text-sm"> /head</span>
                    </span>
                  </div>
                  <ul className="mt-3 divide-y divide-stone-100">
                    {m.courses.map((course) => (
                      <li key={course.name} className="py-2 flex gap-3">
                        <span className="font-medium text-sm w-28 shrink-0">{course.name}</span>
                        <span className="text-sm text-stone-600">{course.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {chef.reviews.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Reviews</h2>
              <div className="space-y-3">
                {chef.reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-stone-200 bg-paper p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.author}</span>
                      <Stars rating={r.rating} />
                    </div>
                    <p className="text-stone-700 mt-1">{r.text}</p>
                    <p className="text-xs text-stone-500 mt-2">{r.eventRef}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar — inquiry + share */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-xl border border-stone-200 bg-paper p-5">
              <h2 className="font-semibold mb-3">Request {chef.name.split(" ")[0]}</h2>
              <InquiryForm chefSlug={chef.slug} chefName={chef.name.split(" ")[0]} />
            </div>
            <div className="rounded-xl border border-stone-200 bg-paper p-4 text-sm">
              <p className="text-stone-500">Shareable profile</p>
              <p className="font-mono text-xs mt-1 break-all text-copper">
                brigade.example/c/{chef.slug}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
