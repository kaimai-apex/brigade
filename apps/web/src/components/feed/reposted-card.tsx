import Link from 'next/link';
import { Repeat2 } from 'lucide-react';
import type { RepostedPost } from '@/lib/api/client';

/** The embedded original inside a repost, linking to its permalink. */
export function RepostedCard({ post }: { post: RepostedPost }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="mt-3 block rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 transition hover:bg-neutral-100"
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink/50">
        <Repeat2 className="size-3.5" />
        {post.authorId.slice(0, 8)}…
      </p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
        {post.content}
      </p>
      {post.mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.mediaUrl}
          alt=""
          className="mt-2 max-h-56 w-full rounded-lg object-cover"
        />
      )}
    </Link>
  );
}
