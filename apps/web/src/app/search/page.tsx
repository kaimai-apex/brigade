import { redirect } from "next/navigation";

/** Search duplicates the Directory — one door. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const qs = params.toString();
  redirect(qs ? `/directory?${qs}` : "/directory");
}
