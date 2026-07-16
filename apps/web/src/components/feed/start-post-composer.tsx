'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Image as ImageIcon, X } from 'lucide-react';
import { HudCard } from '@/components/layout/app-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resolveAvatarUrl } from '@/lib/avatars';
import { cn } from '@/lib/utils';

type StartPostComposerProps = {
  userName: string;
  userInitials: string;
  avatarUrl?: string;
  /** Stable id for kitchen default avatar (userId) */
  avatarSeed?: string;
  onPost: (content: string, mediaUrl?: string) => Promise<void>;
  onPosted?: () => void;
  className?: string;
};

/**
 * Inline composer (no modal). Expands on focus so typing/submit stay reliable.
 */
export function StartPostComposer({
  userName,
  userInitials,
  avatarUrl,
  avatarSeed,
  onPost,
  onPosted,
  className,
}: StartPostComposerProps) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (expanded) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [expanded]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!content.trim() || posting) return;
    setPosting(true);
    try {
      await onPost(content.trim(), mediaUrl.trim() || undefined);
      setContent('');
      setMediaUrl('');
      setShowMediaInput(false);
      setExpanded(false);
      onPosted?.();
      toast.success('Posted to the community feed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setPosting(false);
    }
  }

  const canPost = content.trim().length > 0 && !posting;
  const avatarSrc = resolveAvatarUrl(avatarUrl, avatarSeed ?? userName);

  return (
    <HudCard className={cn('p-2', className)}>
      <form onSubmit={submit}>
        <div className={cn('flex gap-3', !expanded && 'h-14 items-center')}>
          <Avatar className="size-10 shrink-0 border border-neutral-200">
            <AvatarImage src={avatarSrc} alt={userName} className="object-cover" />
            <AvatarFallback className="bg-neutral-100 text-sm font-semibold text-forest">
              {userInitials}
            </AvatarFallback>
          </Avatar>

          {!expanded ? (
            <button
              type="button"
              className="touch-compact flex h-11 flex-1 items-center rounded-xl border border-neutral-300 px-4 text-left text-[15px] font-medium text-neutral-600 transition hover:bg-neutral-50"
              onClick={() => setExpanded(true)}
            >
              Start a post
            </button>
          ) : (
            <div className="min-w-0 flex-1 self-start pt-1">
              <p className="mb-1 text-sm font-semibold text-ink">{userName}</p>
              <textarea
                ref={textareaRef}
                name="content"
                placeholder="What’s happening on the floor?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="block min-h-[96px] w-full resize-none rounded-xl border border-neutral-200 bg-white p-3 text-base leading-relaxed text-ink outline-none placeholder:text-neutral-400 focus:border-forest focus:ring-2 focus:ring-forest/20"
              />

              {showMediaInput && (
                <Input
                  className="mt-2 min-h-11"
                  placeholder="Paste an image URL (optional)"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="touch-compact"
                    onClick={() => setShowMediaInput((v) => !v)}
                  >
                    <ImageIcon className="size-4" />
                    Photo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="touch-compact"
                    onClick={() => {
                      setExpanded(false);
                      setContent('');
                      setMediaUrl('');
                      setShowMediaInput(false);
                    }}
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                </div>
                <Button type="submit" disabled={!canPost} size="sm">
                  {posting ? 'Posting…' : 'Post'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </form>
    </HudCard>
  );
}
