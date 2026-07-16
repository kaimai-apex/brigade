import { redirect } from "next/navigation";

/** Search duplicates Discover — one door. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const params = new URLSearchParams({ focus: "1" });
  if (q) params.set("q", q);
  redirect(`/discover?${params.toString()}`);
}
