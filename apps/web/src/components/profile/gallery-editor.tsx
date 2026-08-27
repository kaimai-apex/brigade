"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";
import { avatarFileError } from "@/lib/avatars";
import { uploadMediaFile } from "@/lib/media-upload";
import { cn } from "@/lib/utils";

/**
 * The professional gallery — a chef's plated work, in the order they choose.
 *
 * Order is the whole point of the control, so it is explicit (move left/move
 * right) rather than drag-and-drop: this is edited on a phone more often than a
 * desktop, and dragging a thumbnail inside a scrolling page is a fight.
 */

export const GALLERY_MAX_PHOTOS = 24;

export function GalleryEditor({
  value,
  onChange,
  max = GALLERY_MAX_PHOTOS,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = max - value.length;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, Math.max(0, remaining));
    if (files.length === 0) {
      setError(`Galleries hold up to ${max} photos.`);
      return;
    }

    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: files.length });

    const uploaded: string[] = [];
    const failures: string[] = [];

    // Sequential rather than Promise.all: a chef selecting twelve photos on a
    // phone would otherwise open twelve concurrent multipart uploads on a
    // connection that cannot take them, and they would all time out together.
    for (const file of files) {
      const problem = avatarFileError(file);
      if (problem) {
        failures.push(problem);
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        continue;
      }
      try {
        uploaded.push(await uploadMediaFile(file, "gallery"));
      } catch (err) {
        failures.push(err instanceof Error ? err.message : "Upload failed");
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    // Keep whatever succeeded — losing nine good uploads because the tenth was
    // a HEIC would be a worse outcome than a partial gallery plus a message.
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
    if (failures.length > 0) {
      setError(
        failures.length === files.length
          ? failures[0]
          : `${failures.length} of ${files.length} photos didn't upload. ${failures[0]}`,
      );
    }

    setBusy(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, index) => (
            <li
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-ink/10 bg-sage/20"
            >
              <Image
                src={url}
                alt={`Gallery photo ${index + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, 25vw"
                className="object-cover"
                unoptimized
              />
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-forest/90 px-2 py-0.5 text-[10px] font-semibold text-paper">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink/70 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="size-3.5" aria-hidden />
                <span className="sr-only">Remove photo {index + 1}</span>
              </button>
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-ink/70 to-transparent p-1">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  className="flex size-6 items-center justify-center rounded-full text-white disabled:opacity-30"
                >
                  <ArrowLeft className="size-3.5" aria-hidden />
                  <span className="sr-only">Move photo {index + 1} earlier</span>
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === value.length - 1}
                  className="flex size-6 items-center justify-center rounded-full text-white disabled:opacity-30"
                >
                  <ArrowRight className="size-3.5" aria-hidden />
                  <span className="sr-only">Move photo {index + 1} later</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <label
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 bg-white px-4 py-5 text-sm font-semibold text-ink/70",
          (busy || remaining <= 0) && "pointer-events-none opacity-60",
        )}
      >
        <ImagePlus className="size-4" aria-hidden />
        {busy && progress
          ? `Uploading ${progress.done + 1} of ${progress.total}…`
          : remaining <= 0
            ? `Gallery full (${max} photos)`
            : value.length === 0
              ? "Add photos of your work"
              : `Add more (${remaining} left)`}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          disabled={busy || remaining <= 0}
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </label>

      <p className="text-xs text-ink/55">
        JPEG, PNG, or WebP. The first photo leads your profile. Shoot in landscape
        or portrait. We keep the shape you upload.
      </p>

      {error && <p className="text-sm text-rust">{error}</p>}
    </div>
  );
}
