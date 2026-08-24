import data from "./articles-data.json" with { type: "json" };

export type JournalBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export type JournalArticle = {
  slug: string;
  kicker: string;
  title: string;
  dek: string;
  date: string;
  minutes: number;
  featured: boolean;
  order: number;
  related: string[];
  author: string;
  body: JournalBlock[];
};

const ARTICLES: JournalArticle[] = data as JournalArticle[];

const bySlug = new Map(ARTICLES.map((a) => [a.slug, a]));

export function listArticles(): JournalArticle[] {
  return [...ARTICLES].sort((a, b) => a.order - b.order);
}

export function getArticle(slug: string): JournalArticle | undefined {
  return bySlug.get(slug);
}

export function featuredArticle(): JournalArticle {
  return ARTICLES.find((a) => a.featured) ?? ARTICLES[0];
}

export function relatedArticles(article: JournalArticle): JournalArticle[] {
  return article.related
    .map((slug) => bySlug.get(slug))
    .filter((a): a is JournalArticle => Boolean(a));
}

export function formatJournalDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day} ${months[month - 1]} ${year}`;
}

export function articlePath(slug: string): string {
  return `/journal/${slug}`;
}
