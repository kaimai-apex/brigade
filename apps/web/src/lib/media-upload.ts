export async function uploadMediaFile(
  file: File,
  kind: "avatar" | "cover" | "resume",
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);
  const res = await fetch("/api/media/upload", { method: "POST", body: formData });
  const data = (await res.json()) as { url?: string; message?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.message ?? "Upload failed");
  }
  return data.url;
}
