export const LEARN_PATH = "/learn";

/** One journal piece is public. Everything else behind an account. */
export const FLAGSHIP_ARTICLE_SLUG = "soft-skills";
export const FLAGSHIP_ARTICLE_PATH = `/journal/${FLAGSHIP_ARTICLE_SLUG}`;
export const ROADMAP_PATH = "/roadmap";
export const ROADMAP_PREVIEW_STEPS = 3;

export const ROADMAP_COPY = {
  kicker: "THE ROADMAP",
  title: "How to become a private chef.",
  paragraphs: [
    "This is the map I would have wanted. Seven clear steps, in order. Under each one is the thing that has to be true before you move to the next. Something you can actually check.",
    "Most people stall at step two. They wait for a perfect posting instead of texting someone they already know. Don't wait, just get started and watch where it takes you!",
  ],
} as const;

/** Logged-out visitors get the public article or roadmap preview. Members get the hub. */
export function learnHref(signedIn: boolean, focus?: "roadmap"): string {
  if (signedIn) {
    return focus === "roadmap" ? `${LEARN_PATH}?focus=roadmap` : LEARN_PATH;
  }
  return focus === "roadmap" ? ROADMAP_PATH : FLAGSHIP_ARTICLE_PATH;
}

export function learnSignupHref(focus?: "roadmap"): string {
  const next =
    focus === "roadmap" ? `${LEARN_PATH}?focus=roadmap` : LEARN_PATH;
  return `/signup?next=${encodeURIComponent(next)}`;
}

export function isPublicResourcePath(pathname: string): boolean {
  return pathname === ROADMAP_PATH || pathname === FLAGSHIP_ARTICLE_PATH;
}

export function isLearnPath(pathname: string): boolean {
  return (
    pathname === LEARN_PATH ||
    pathname === ROADMAP_PATH ||
    pathname === "/journal" ||
    pathname.startsWith("/journal/")
  );
}

export function isFlagshipArticleSlug(slug: string): boolean {
  return slug === FLAGSHIP_ARTICLE_SLUG;
}
