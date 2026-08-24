"use client";

import { Camera } from "lucide-react";
import { AVATAR_OUTPUT_SIZE, avatarFileError, resolveAvatarUrl } from "@/lib/avatars";
import { resolveBannerUrl } from "@/lib/banners";
import { uploadMediaFile } from "@/lib/media-upload";
import { cn, getInitials } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

type FileUploadProps = {
  bucket: "avatars" | "covers" | "resumes";
  userId: string;
  accept: string;
  label: string;
  fieldName: string;
  defaultUrl?: string | null;
  className?: string;
  onChange?: (url: string) => void;
};

export function FileUpload({
  bucket,
  userId,
  accept,
  label,
  fieldName,
  defaultUrl,
  className,
  onChange,
}: FileUploadProps) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(defaultUrl ?? "");
  }, [defaultUrl]);

  function updateUrl(next: string) {
    setUrl(next);
    onChange?.(next);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (bucket === "avatars") {
      const problem = avatarFileError(file);
      if (problem) {
        setError(problem);
        e.target.value = "";
        return;
      }
    }

    setUploading(true);
    setError(null);

    try {
      const uploaded = await uploadMediaFile(
        file,
        bucket === "avatars" ? "avatar" : bucket === "covers" ? "cover" : "resume",
      );
      updateUrl(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const inputId = `${fieldName}-file`;
  const avatarPreviewSrc =
    bucket === "avatars" ? resolveAvatarUrl(url || null, userId) : url;
  const coverPreviewSrc =
    bucket === "covers" ? resolveBannerUrl(url || null, userId) : url;

  return (
    <div className={cn("space-y-3", className)}>
      <p className="block text-sm font-semibold text-ink/80">{label}</p>

      {bucket === "avatars" && (
        <div className="flex items-center gap-4">
          <label
            htmlFor={inputId}
            className={cn(
              "relative size-20 shrink-0 cursor-pointer",
              uploading && "pointer-events-none opacity-70",
            )}
          >
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-sage/40 text-xl font-bold text-forest">
              {avatarPreviewSrc ? (
                <Image
                  src={avatarPreviewSrc}
                  alt="Profile"
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                getInitials()
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-white bg-forest text-paper shadow-sm">
              <Camera className="size-3.5" aria-hidden />
            </span>
          </label>
          <div>
            <input type="hidden" name={fieldName} value={url} />
            <input
              id={inputId}
              type="file"
              accept={accept}
              className="sr-only"
              disabled={uploading}
              onChange={handleUpload}
            />
            <label htmlFor={inputId} className="cursor-pointer">
              <span className="inline-flex h-10 items-center rounded-full border border-ink/15 bg-white px-4 text-sm font-semibold">
                {uploading ? "Uploading…" : url ? "Replace photo" : "Upload photo"}
              </span>
            </label>
            <p className="mt-1.5 text-xs text-ink/55">
              JPEG, PNG, or WebP. We&apos;ll square it to {AVATAR_OUTPUT_SIZE}×{AVATAR_OUTPUT_SIZE}.
            </p>
          </div>
        </div>
      )}

      {bucket === "covers" && (
        <div className="space-y-3">
          <div className="h-28 w-full overflow-hidden rounded-xl border border-neutral-200 bg-sage/30">
            {coverPreviewSrc ? (
              <Image
                src={coverPreviewSrc}
                alt="Cover banner preview"
                width={640}
                height={112}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-ink/50">
                No custom banner yet
              </div>
            )}
          </div>
          <input type="hidden" name={fieldName} value={url} />
          <label className="cursor-pointer">
            <span className="inline-flex h-10 items-center rounded-full border border-ink/15 bg-white px-4 text-sm font-semibold">
              {uploading ? "Uploading…" : url ? "Replace banner" : "Upload banner"}
            </span>
            <input type="file" accept={accept} className="hidden" onChange={handleUpload} />
          </label>
          <p className="text-xs text-ink/55">
            Wide images work best (roughly 3:1). JPG, PNG, or WebP up to 10 MB.
          </p>
        </div>
      )}

      {bucket === "resumes" && (
        <div className="space-y-2">
          <input type="hidden" name={fieldName} value={url} />
          <label className="cursor-pointer">
            <span className="inline-flex h-10 items-center rounded-full border border-ink/15 bg-white px-4 text-sm font-semibold">
              {uploading ? "Uploading…" : url ? "Replace resume" : "Upload resume"}
            </span>
            <input type="file" accept={accept} className="hidden" onChange={handleUpload} />
          </label>
          {url && <p className="text-xs text-forest">Resume uploaded successfully.</p>}
        </div>
      )}

      {error && <p className="text-sm text-rust">{error}</p>}
    </div>
  );
}
