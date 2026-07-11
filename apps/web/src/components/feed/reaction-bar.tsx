'use client';

import { useState } from 'react';
import { MessageCircle, Repeat2, ThumbsUp } from 'lucide-react';
import { api, REACTIONS, type Post, type ReactionType } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/**
 * LinkedIn-style reaction control: a trigger that opens a hover tray of the 6
 * reaction types, plus a summary of aggregate reactions + comment/repost actions.
 * Self-contained + optimistic; reports the viewer's new reaction via onChange.
 */
export function ReactionBar({
  post,
  commentCount,
  onToggleComments,
  onRepost,
  onChange,
}: {
  post: Post;
  commentCount: number;
  onToggleComments?: () => void;
  onRepost?: () => void;
  onChange?: (reaction: ReactionType | null) => void;
}) {
  const [reaction, setReaction] = useState<ReactionType | null>(
    post.viewerReaction ?? null,
  );
  const [count, setCount] = useState(post.reactionCount ?? post.likeCount ?? 0);
  const [busy, setBusy] = useState(false);

  const active = reaction ? REACTIONS.find((r) => r.type === reaction) : null;

  // Aggregate faces shown in the summary: distinct reaction types present on the
  // post (server breakdown), guaranteeing the viewer's own reaction is included.
  const present = new Set<ReactionType>(
    Object.entries(post.reactions ?? {})
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([t]) => t as ReactionType),
  );
  if (reaction) present.add(reaction);
  const faces = REACTIONS.filter((r) => present.has(r.type)).slice(0, 3);

  async function choose(type: ReactionType) {
    if (busy) return;
    setBusy(true);
    const prev = reaction;
    const next = prev === type ? null : type;
    // optimistic
    setReaction(next);
    setCount((c) => {
      if (prev && !next) return Math.max(0, c - 1);
      if (!prev && next) return c + 1;
      return c;
    });
    onChange?.(next);
    try {
      if (next) await api.react(post.id, next);
      else await api.unreact(post.id);
    } catch {
      /* optimistic — leave as-is */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Aggregate summary */}
      {(count > 0 || commentCount > 0) && (
        <div className="mb-1 flex items-center justify-between px-1 text-xs text-ink/55">
          <div className="flex items-center gap-1">
            {faces.length > 0 && (
              <span className="flex -space-x-1">
                {faces.map((f) => (
                  <span
                    key={f.type}
                    className="grid size-4 place-items-center rounded-full bg-cream text-[10px] ring-1 ring-cream"
                  >
                    {f.emoji}
                  </span>
                ))}
              </span>
            )}
            {count > 0 && <span>{count}</span>}
          </div>
          {commentCount > 0 && (
            <button
              type="button"
              onClick={onToggleComments}
              className="hover:text-ink hover:underline"
            >
              {commentCount} comment{commentCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-ink/10 pt-1">
        {/* React trigger + hover tray */}
        <div className="group relative flex-1">
          <div className="pointer-events-none absolute bottom-full left-0 mb-2 flex gap-1 rounded-full border border-ink/10 bg-paper p-1.5 opacity-0 shadow-lg transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
            {REACTIONS.map((r) => (
              <button
                key={r.type}
                type="button"
                aria-label={r.label}
                title={r.label}
                onClick={() => choose(r.type)}
                className="grid size-9 place-items-center rounded-full text-xl transition-transform duration-150 hover:-translate-y-1 hover:scale-125"
              >
                {r.emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => choose(reaction ?? 'like')}
            disabled={busy}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition hover:bg-ink/5',
              active ? '' : 'text-ink/60',
            )}
            style={active ? { color: active.color } : undefined}
          >
            {active ? (
              <span className="text-base leading-none">{active.emoji}</span>
            ) : (
              <ThumbsUp className="size-4" />
            )}
            {active ? active.label : 'React'}
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleComments}
          className="flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold text-ink/60 transition hover:bg-ink/5"
        >
          <MessageCircle className="size-4" />
          Comment
        </button>

        <button
          type="button"
          onClick={onRepost}
          className="flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold text-ink/60 transition hover:bg-ink/5"
        >
          <Repeat2 className="size-4" />
          Repost
        </button>
      </div>
    </div>
  );
}
