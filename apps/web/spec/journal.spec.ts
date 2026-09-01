/**
 * Journal catalog: eight how-to pieces, one public flagship.
 *
 * Run: node --experimental-strip-types apps/web/spec/journal.spec.ts
 */
import assert from "node:assert/strict";
import {
  articlePath,
  featuredArticle,
  getArticle,
  JOURNAL_AUTHOR_HREF,
  listArticles,
  previewArticle,
  relatedArticles,
} from "../src/lib/journal/articles.ts";
import { JOURNAL_UNLOCK_COOKIE, normalizeJournalEmail } from "../src/lib/journal/email.ts";
import { sanitizeResourceSlug } from "../src/lib/journal/resource-slug.ts";
import { normalizePhone } from "../src/lib/journal/phone.ts";
import { ROADMAP_STEPS } from "../src/lib/journal/roadmap-steps.ts";
import {
  FLAGSHIP_ARTICLE_PATH,
  FLAGSHIP_ARTICLE_SLUG,
  isFlagshipArticleSlug,
  isPublicResourcePath,
  learnHref,
  learnSignupHref,
  ROADMAP_PATH,
  ROADMAP_PREVIEW_STEPS,
} from "../src/lib/learn.ts";
import {
  isValidResourceUnlockCookie,
  RESOURCE_UNLOCK_COOKIE,
  signResourceUnlock,
} from "../src/lib/journal/unlock-cookie.ts";

const articles = listArticles();
assert.equal(articles.length, 8);
assert.equal(featuredArticle().slug, FLAGSHIP_ARTICLE_SLUG);
assert.equal(featuredArticle().title, "The part restaurants never taught you");
assert.equal(featuredArticle().order, 1);
assert.ok(isFlagshipArticleSlug(FLAGSHIP_ARTICLE_SLUG));
assert.equal(isFlagshipArticleSlug("cooking-for-the-same-family"), false);
assert.ok(getArticle("soft-skills"));
assert.equal(getArticle("not-a-real-slug"), undefined);
assert.equal(articlePath("how-to-network"), "/journal/how-to-network");
assert.equal(articlePath(FLAGSHIP_ARTICLE_SLUG), FLAGSHIP_ARTICLE_PATH);
assert.equal(JOURNAL_AUTHOR_HREF, "/learn");
assert.equal(sanitizeResourceSlug("signup"), "signup");

const flagship = featuredArticle();
assert.ok(flagship.body.some((b) => b.type === "h2"));
assert.ok(
  flagship.body.some(
    (b) => b.type === "p" && b.text.toLowerCase().includes("imposter"),
  ),
);
assert.equal(relatedArticles(flagship).length, 2);

const house = getArticle("cooking-for-the-same-family");
assert.ok(house);
assert.ok(house.body.some((b) => b.type === "p" && b.text.includes("Netflix")));
assert.equal(house.featured, false);

const preview = previewArticle(flagship);
assert.ok(preview.body.length > 0);
assert.ok(preview.body.length < flagship.body.length);
assert.ok(preview.body.every((b) => b.type === "p"));

assert.equal(normalizeJournalEmail("  Chef@Kitchen.COM "), "chef@kitchen.com");
assert.equal(normalizeJournalEmail("nope"), null);
assert.equal(normalizeJournalEmail(""), null);

assert.equal(normalizePhone("555-123-4567"), "555-123-4567");
assert.equal(normalizePhone("123"), null);
assert.equal(normalizePhone(""), null);

assert.equal(sanitizeResourceSlug("how-to-network"), "how-to-network");
assert.equal(sanitizeResourceSlug("journal"), "journal");
assert.equal(sanitizeResourceSlug("roadmap"), "roadmap");
assert.equal(sanitizeResourceSlug("not-a-real-slug"), null);
assert.equal(sanitizeResourceSlug("how-to-network; DROP TABLE"), null);

const unlockSecret = "test-unlock-secret";
const token = await signResourceUnlock(unlockSecret);
assert.equal(RESOURCE_UNLOCK_COOKIE, JOURNAL_UNLOCK_COOKIE);
assert.equal(token.length, 64);
assert.equal(await isValidResourceUnlockCookie(token, unlockSecret), true);
assert.equal(await isValidResourceUnlockCookie("1", unlockSecret), false);
assert.equal(await isValidResourceUnlockCookie(token, "other-secret"), false);
assert.equal(await isValidResourceUnlockCookie(undefined, unlockSecret), false);

const agency = getArticle("agency-or-solo");
assert.ok(agency);
assert.match(agency.dek, /15 to 30 percent/);

assert.equal(ROADMAP_STEPS.length, 7);
assert.equal(ROADMAP_PREVIEW_STEPS, 3);
assert.equal(ROADMAP_STEPS[0].title.includes("restaurant"), true);
assert.equal(isPublicResourcePath(FLAGSHIP_ARTICLE_PATH), true);
assert.equal(isPublicResourcePath(ROADMAP_PATH), true);
assert.equal(isPublicResourcePath("/learn"), false);
assert.equal(isPublicResourcePath("/journal/how-to-network"), false);
assert.equal(learnHref(false), FLAGSHIP_ARTICLE_PATH);
assert.equal(learnHref(false, "roadmap"), ROADMAP_PATH);
assert.equal(learnHref(true), "/learn");
assert.equal(learnHref(true, "roadmap"), "/learn?focus=roadmap");
assert.equal(learnSignupHref(), "/signup?next=%2Flearn");
assert.equal(learnSignupHref("roadmap"), "/signup?next=%2Flearn%3Ffocus%3Droadmap");

console.log("journal.spec.ts: ok");
