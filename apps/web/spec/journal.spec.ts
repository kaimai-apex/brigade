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
  listArticles,
  relatedArticles,
} from "../src/lib/journal/articles.ts";

const articles = listArticles();
assert.equal(articles.length, 8);
assert.equal(featuredArticle().slug, "cooking-for-the-same-family");
assert.equal(featuredArticle().order, 1);
assert.ok(getArticle("soft-skills"));
assert.equal(getArticle("not-a-real-slug"), undefined);
assert.equal(articlePath("how-to-network"), "/journal/how-to-network");

const house = featuredArticle();
assert.ok(house.body.some((b) => b.type === "h2"));
assert.ok(house.body.some((b) => b.type === "p" && b.text.includes("Netflix")));
assert.equal(relatedArticles(house).length, 2);

const agency = getArticle("agency-or-solo");
assert.ok(agency);
assert.match(agency.dek, /15 to 30 percent/);

console.log("journal.spec.ts: ok");
