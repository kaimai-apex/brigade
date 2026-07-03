"use client";

import { createClient } from "@/lib/supabase/client";
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

    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const supabase = createClient();

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
    });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    if (bucket === "avatars") {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setUrl(data.publicUrl);
    } else {
      const { data, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedError) {
        setError(signedError.message);
        setUploading(false);
        return;
      }
      setUrl(data.signedUrl);
    }

    setUploading(false);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <label className="block text-sm font-semibold text-ink/80">{label}</label>

      {bucket === "avatars" && (
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-sage/40 text-xl font-bold text-forest">
            {url ? (
              <Image src={url} alt="Profile" width={80} height={80} className="h-full w-full object-cover" />
            ) : (
              getInitials()
            )}
          </div>
          <input type="hidden" name={fieldName} value={url} />
          <label className="cursor-pointer">
            <span className="inline-flex h-10 items-center rounded-full border border-ink/15 bg-paper px-4 text-sm font-semibold">
              {uploading ? "Uploading…" : "Upload photo"}
            </span>
            <input type="file" accept={accept} className="hidden" onChange={handleUpload} />
          </label>
        </div>
      )}

      {bucket === "resumes" && (
        <div className="space-y-2">
          <input type="hidden" name={fieldName} value={url} />
          <label className="cursor-pointer">
            <span className="inline-flex h-10 items-center rounded-full border border-ink/15 bg-paper px-4 text-sm font-semibold">
              {uploading ? "Uploading…" : url ? "Replace resume" : "Upload resume"}
            </span>
            <input type="file" accept={accept} className="hidden" onChange={handleUpload} />
          </label>
          {url && (
            <p className="text-xs text-forest">Resume uploaded successfully.</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-rust">{error}</p>}
    </div>
  );
}
