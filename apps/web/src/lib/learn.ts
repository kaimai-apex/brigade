export const LEARN_PATH = "/learn";

export const ROADMAP_COPY = {
  kicker: "THE ROADMAP",
  title: "How to become a private chef.",
  paragraphs: [
    "This is the map I would have wanted. Seven clear steps, in order. Under each one is the thing that has to be true before you move to the next. Something you can actually check.",
    "Most people stall at step two. They wait for a perfect posting instead of texting someone they already know. Don't wait, just get started and watch where it takes you!",
  ],
} as const;

export function learnSignupHref(focus?: "roadmap"): string {
  const next =
    focus === "roadmap" ? `${LEARN_PATH}?focus=roadmap` : LEARN_PATH;
  return `/signup?next=${encodeURIComponent(next)}`;
}

export function isLearnPath(pathname: string): boolean {
  return (
    pathname === LEARN_PATH ||
    pathname === "/roadmap" ||
    pathname === "/journal" ||
    pathname.startsWith("/journal/")
  );
}
