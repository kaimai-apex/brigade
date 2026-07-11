import Link from 'next/link';

/**
 * Renders post text with #hashtags linkified to their topic feed.
 * Kept anchor-free otherwise so it can live outside a wrapping <a>.
 */
export function PostContent({ text }: { text: string }) {
  const parts = text.split(/(#[A-Za-z0-9_]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.length > 1 && part.startsWith('#') ? (
          <Link
            key={i}
            href={`/hashtag/${part.slice(1)}`}
            className="font-semibold text-cobalt hover:underline"
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
