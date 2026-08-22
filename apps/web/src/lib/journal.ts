import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

export type ArticleMeta = {
  slug: string;
  title: string;
  kicker: string;
  dek: string;
  author: string;
  date: string;
  readingTime: number;
};

export type Article = ArticleMeta & {
  content: string;
  html: string;
};

const contentDir = path.join(process.cwd(), 'content/journal');

/**
 * Read all journal articles sorted by date (newest first).
 */
export function getAllArticles(): Article[] {
  const files = fs.readdirSync(contentDir);
  const articles = files
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const filePath = path.join(contentDir, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug: data.slug as string,
        title: data.title as string,
        kicker: data.kicker as string,
        dek: data.dek as string,
        author: data.author as string,
        date: data.date as string,
        readingTime: data.readingTime as number,
        content,
        html: marked(content) as string,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return articles;
}

/**
 * Get article metadata only (no content) for listing pages.
 */
export function getAllArticleMeta(): ArticleMeta[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return getAllArticles().map(({ content, html, ...meta }) => meta);
}

/**
 * Get a single article by slug.
 */
export function getArticleBySlug(slug: string): Article | null {
  const articles = getAllArticles();
  return articles.find((a) => a.slug === slug) ?? null;
}

/**
 * Format a date string like "12 Aug 2026".
 */
export function formatArticleDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Get author initials (e.g., "Jordan Chan" → "JC").
 */
export function getAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
