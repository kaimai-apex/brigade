"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

const MAX_PHOTOS = 5;

type WorkPhotosUploadProps = {
  userId: string;
  defaultUrls?: string[];
  className?: string;
};

export function WorkPhotosUpload({
  defaultUrls = [],
  className,
}: WorkPhotosUploadProps) {
  const [urls, setUrls] = useState<string[]>(defaultUrls.slice(0, MAX_PHOTOS));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = MAX_PHOTOS - urls.length;
    if (remaining <= 0) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    setUploading(true);
    setError(null);

    const uploaded: string[] = [];

    for (const file of files.slice(0, remaining)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/media/upload", { method: "POST", body: formData });
        const data = (await res.json()) as { url?: string; message?: string };
        if (!res.ok) {
          setError(data.message ?? "Upload failed");
          break;
        }
        if (data.url) uploaded.push(data.url);
      } catch {
        setError("Upload failed");
        break;
      }
    }

    setUrls((prev) => [...prev, ...uploaded].slice(0, MAX_PHOTOS));
    setUploading(false);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-ink/80">Work showcase photos</label>
        <span className="text-xs text-ink/50">
          {urls.length}/{MAX_PHOTOS}
        </span>
      </div>
      <p className="text-sm text-ink/60">
        Add 3–5 photos of dishes, events, or work you are proud of. They appear on your public profile.
      </p>

      {urls.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urls.map((url, index) => (
            <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-ink/10">
              <Image src={url} alt={`Work photo ${index + 1}`} fill className="object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-xs font-semibold text-paper"
              >
                Remove
              </button>
              <input type="hidden" name="work_photo_url" value={url} />
            </div>
          ))}
        </div>
      )}

      {urls.length < MAX_PHOTOS && (
        <label className="cursor-pointer">
          <span className="inline-flex h-10 items-center rounded-full border border-ink/15 bg-paper px-4 text-sm font-semibold">
            {uploading ? "Uploading…" : urls.length === 0 ? "Add photos" : "Add more photos"}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      )}

      {error && <p className="text-sm text-rust">{error}</p>}
    </div>
  );
}
