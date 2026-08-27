/**
 * Journal catalog: eight how-to pieces, one featured.
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
import {
  isValidResourceUnlockCookie,
  RESOURCE_UNLOCK_COOKIE,
  signResourceUnlock,
} from "../src/lib/journal/unlock-cookie.ts";

const articles = listArticles();
assert.equal(articles.length, 8);
assert.equal(featuredArticle().slug, "cooking-for-the-same-family");
assert.equal(featuredArticle().order, 1);
assert.ok(getArticle("soft-skills"));
assert.equal(getArticle("not-a-real-slug"), undefined);
assert.equal(articlePath("how-to-network"), "/journal/how-to-network");
assert.match(
  JOURNAL_AUTHOR_HREF,
  /^\/mentors\/[0-9a-f-]{36}$/,
);

const house = featuredArticle();
assert.ok(house.body.some((b) => b.type === "h2"));
assert.ok(house.body.some((b) => b.type === "p" && b.text.includes("Netflix")));
assert.equal(relatedArticles(house).length, 2);

const preview = previewArticle(house);
assert.ok(preview.body.length > 0);
assert.ok(preview.body.length < house.body.length);
assert.ok(preview.body.every((b) => b.type === "p"));

assert.equal(normalizeJournalEmail("  Chef@Kitchen.COM "), "chef@kitchen.com");
assert.equal(normalizeJournalEmail("nope"), null);
assert.equal(normalizeJournalEmail(""), null);

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

console.log("journal.spec.ts: ok");
