'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Image as ImageIcon, Newspaper, Video } from 'lucide-react';
import { HudCard } from '@/components/layout/app-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
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

export function StartPostComposer({
  userName,
  userInitials,
  avatarUrl,
  avatarSeed,
  onPost,
  onPosted,
  className,
}: StartPostComposerProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function openComposer(options?: { media?: boolean }) {
    setShowMediaInput(Boolean(options?.media));
    setOpen(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setShowMediaInput(false);
    }
  }

  async function submit() {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await onPost(content.trim(), mediaUrl.trim() || undefined);
      setContent('');
      setMediaUrl('');
      setShowMediaInput(false);
      setOpen(false);
      onPosted?.();
      toast.success('Posted to your network');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create post');
    } finally {
      setPosting(false);
    }
  }

  const canPost = content.trim().length > 0 && !posting;
  const avatarSrc = resolveAvatarUrl(avatarUrl, avatarSeed ?? userName);

  return (
    <>
      <HudCard className={cn('p-3', className)}>
        <div className="flex gap-3">
          <Avatar className="size-12 shrink-0 border border-neutral-200">
            <AvatarImage src={avatarSrc} alt={userName} className="object-cover" />
            <AvatarFallback className="bg-neutral-100 font-semibold text-forest">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            className="flex h-12 flex-1 items-center rounded-full border border-neutral-400 px-4 text-left text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50"
            onClick={() => openComposer()}
          >
            Start a post
          </button>
        </div>

        <div className="mt-1 flex justify-around border-t border-neutral-100 pt-1">
          <ComposerShortcut
            icon={<Video className="size-5 text-forest" />}
            label="Video"
            onClick={() => openComposer()}
          />
          <ComposerShortcut
            icon={<ImageIcon className="size-5 text-cobalt" />}
            label="Photo"
            onClick={() => openComposer({ media: true })}
          />
          <ComposerShortcut
            icon={<Newspaper className="size-5 text-rust" />}
            label="Write article"
            onClick={() => openComposer()}
          />
        </div>
      </HudCard>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex flex-col gap-0 p-0 sm:max-w-[552px]"
          showCloseButton
        >
          <DialogTitle className="sr-only">Create a post</DialogTitle>

          <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4">
            <Avatar className="size-14 shrink-0 border border-neutral-200">
              <AvatarImage src={avatarSrc} alt={userName} className="object-cover" />
              <AvatarFallback className="bg-neutral-100 text-base font-semibold text-forest">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-ink">{userName}</p>
              <p className="text-xs text-neutral-500">Post to your network</p>
            </div>
          </div>

          <div className="px-5 pb-2 pt-4">
            <textarea
              ref={textareaRef}
              placeholder="What do you want to talk about? Shifts you’re free for, venues you’ve worked, tips from the floor…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="block min-h-[160px] w-full resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-ink outline-none placeholder:text-neutral-400 focus:ring-0"
            />

            {showMediaInput && (
              <Input
                className="mt-2"
                placeholder="Paste an image URL (optional)"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-neutral-100 px-5 py-3">
            <div className="flex items-center gap-1">
              <IconButton
                label="Add photo"
                onClick={() => setShowMediaInput((v) => !v)}
              >
                <ImageIcon className="size-5 text-neutral-600" />
              </IconButton>
              <IconButton label="Add event" onClick={() => toast('Events coming soon')}>
                <Calendar className="size-5 text-neutral-600" />
              </IconButton>
            </div>
            <Button
              type="button"
              disabled={!canPost}
              className="rounded-full px-6"
              onClick={submit}
            >
              {posting ? 'Posting…' : 'Post'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ComposerShortcut({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-3 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 sm:text-sm"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-full p-2 text-neutral-600 transition hover:bg-neutral-100"
    >
      {children}
    </button>
  );
}
