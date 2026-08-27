/**
 * Send one file to /api/media/upload and return the URL it will be served from.
 *
 * Images are shrunk in the browser first. The platform caps a serverless
 * request body at about 4.5 MB, well under our own 10 MB rule, and a photo
 * straight off a phone is routinely 5–12 MB — those uploads fail at the edge
 * with a 413 that never reaches our handler, so no friendly message is possible.
 * Shrinking client-side keeps ordinary phone photos under the cap.
 *
 * Nothing is lost by it: the server re-encodes every image anyway (512px for an
 * avatar, 1600px for a gallery shot), so the bytes trimmed here would have been
 * discarded server-side regardless.
 */

import { IMAGE_MATTE } from "@/lib/design/tokens";

export type UploadKind = "avatar" | "cover" | "gallery" | "resume";

/** Comfortably inside the platform's request-body cap. */
const SHRINK_ABOVE_BYTES = 3.5 * 1024 * 1024;

/** Longer than the largest edge the server keeps, so nothing visible is lost. */
const CLIENT_MAX_EDGE = 2400;

const IMAGE_KINDS = new Set<UploadKind>(["avatar", "cover", "gallery"]);

/**
 * Re-encode an oversized photo to a bounded JPEG.
 *
 * Returns the original file whenever anything is unavailable or goes wrong —
 * a browser without createImageBitmap, an image the canvas will not decode, a
 * result that somehow came out bigger. The server is still the real gate on
 * size and type, so failing open here only means the old behaviour.
 */
async function shrinkImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file;
  }

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, CLIENT_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    // Photos may carry transparency (a PNG export); the server flattens onto
    // white, so match that here rather than letting it composite to black.
    context.fillStyle = IMAGE_MATTE;
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.85);
    });
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

export async function uploadMediaFile(file: File, kind: UploadKind): Promise<string> {
  const payload =
    IMAGE_KINDS.has(kind) && file.size > SHRINK_ABOVE_BYTES
      ? await shrinkImage(file)
      : file;

  const formData = new FormData();
  formData.append("file", payload);
  formData.append("kind", kind);

  const res = await fetch("/api/media/upload", { method: "POST", body: formData });

  // A body rejected at the edge never reaches the route, so there is no JSON
  // to read and no message worth showing except the real cause.
  if (res.status === 413) {
    throw new Error("That file is too large to upload. Try a smaller one.");
  }

  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    message?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(data.message ?? "Upload failed");
  }
  return data.url;
}
