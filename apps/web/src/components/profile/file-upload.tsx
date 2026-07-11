"use client";

import { resolveAvatarUrl } from "@/lib/avatars";
import { cn, getInitials } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

type FileUploadProps = {
  bucket: "avatars" | "resumes";
  userId: string;
  accept: string;
  label: string;
  fieldName: string;
  defaultUrl?: string | null;
  className?: string;
};

export function FileUpload({
  bucket,
  userId,
  accept,
  label,
  fieldName,
  defaultUrl,
  className,
}: FileUploadProps) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Upload failed");
        return;
      }
      setUrl(data.url ?? "");
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const previewSrc =
    bucket === "avatars" ? resolveAvatarUrl(url || null, userId) : url;

  return (
    <div className={cn("space-y-3", className)}>
      <label className="block text-sm font-semibold text-ink/80">{label}</label>

      {bucket === "avatars" && (
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-sage/40 text-xl font-bold text-forest">
            {previewSrc ? (
              <Image
                src={previewSrc}
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
          <div>
            <input type="hidden" name={fieldName} value={url} />
            <label className="cursor-pointer">
              <span className="inline-flex h-10 items-center rounded-full border border-ink/15 bg-white px-4 text-sm font-semibold">
                {uploading ? "Uploading…" : url ? "Replace photo" : "Upload photo"}
              </span>
              <input type="file" accept={accept} className="hidden" onChange={handleUpload} />
            </label>
            {!url && (
              <p className="mt-1.5 text-xs text-ink/55">
                No photo yet — we&apos;ll use kitchen art until you upload one.
              </p>
            )}
          </div>
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
