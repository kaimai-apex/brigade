"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/lib/api/client";
import {
  AVATAR_UPLOAD_ACCEPT,
  avatarFileError,
  resolveAvatarUrl,
} from "@/lib/avatars";
import { uploadMediaFile } from "@/lib/media-upload";
import { cn } from "@/lib/utils";

type ProfileAvatarEditorProps = {
  userId: string;
  src: string;
  alt: string;
  initials: string;
  className?: string;
};

export function ProfileAvatarEditor({
  userId,
  src,
  alt,
  initials,
  className,
}: ProfileAvatarEditorProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(src);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = avatarFileError(file);
    if (problem) {
      toast.error(problem);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadMediaFile(file, "avatar");
      await api.updateProfile(userId, { avatarUrl: url });
      setPreview(resolveAvatarUrl(url, userId));
      toast.success("Profile photo updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <label
      className={cn(
        "group relative inline-block cursor-pointer",
        uploading && "pointer-events-none",
      )}
    >
      <span className="sr-only">
        {uploading ? "Uploading profile photo" : "Change profile photo"}
      </span>
      <Avatar className={className}>
        <AvatarImage src={preview} alt={alt} className="object-cover" />
        <AvatarFallback className="bg-secondary text-3xl font-bold text-forest">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full border-2 border-white bg-forest text-paper shadow-sm",
          uploading && "opacity-70",
        )}
      >
        <Camera className="size-3.5" aria-hidden />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_UPLOAD_ACCEPT}
        className="sr-only"
        disabled={uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </label>
  );
}
