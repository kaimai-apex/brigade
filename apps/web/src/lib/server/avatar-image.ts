import sharp from "sharp";

/** Must match `AVATAR_OUTPUT_SIZE` in lib/avatars.ts. */
export const AVATAR_OUTPUT_PX = 512;

export class AvatarImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarImageError";
  }
}

/**
 * Decode any supported photo, square-crop to 512×512, emit JPEG.
 * Sharp is the real type check — filename is not trusted.
 */
export async function processAvatarImage(input: Buffer): Promise<Buffer> {
  try {
    const image = sharp(input, {
      failOn: "error",
      limitInputPixels: 40_000_000,
      animated: false,
    }).rotate();

    const meta = await image.metadata();
    if (!meta.width || !meta.height) {
      throw new AvatarImageError("Use a JPEG, PNG, or WebP photo.");
    }

    return await image
      .resize(AVATAR_OUTPUT_PX, AVATAR_OUTPUT_PX, {
        fit: "cover",
        position: "centre",
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    if (err instanceof AvatarImageError) throw err;
    throw new AvatarImageError("Use a JPEG, PNG, or WebP photo.");
  }
}

const COVER_MAX_W = 1920;
const COVER_MAX_H = 640;

/** Decode, crop to a wide banner, emit JPEG — same type-check as avatars. */
export async function processCoverImage(input: Buffer): Promise<Buffer> {
  try {
    const image = sharp(input, {
      failOn: "error",
      limitInputPixels: 40_000_000,
      animated: false,
    }).rotate();

    const meta = await image.metadata();
    if (!meta.width || !meta.height) {
      throw new AvatarImageError("Use a JPEG, PNG, or WebP photo.");
    }

    return await image
      .resize(COVER_MAX_W, COVER_MAX_H, {
        fit: "cover",
        position: "centre",
        withoutEnlargement: true,
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    if (err instanceof AvatarImageError) throw err;
    throw new AvatarImageError("Use a JPEG, PNG, or WebP photo.");
  }
}

/** Longest edge of a stored gallery image. */
export const GALLERY_MAX_EDGE = 1600;

/**
 * Decode a portfolio photo and re-encode it as a bounded JPEG.
 *
 * Unlike avatars and covers this keeps the original aspect ratio — a plated
 * dish shot in portrait should not be centre-cropped into a square by the
 * upload pipeline. Re-encoding still does the real work of the type check, and
 * strips EXIF (which on a phone photo carries the GPS coordinates of the
 * client's house).
 */
export async function processGalleryImage(input: Buffer): Promise<Buffer> {
  try {
    const image = sharp(input, {
      failOn: "error",
      limitInputPixels: 40_000_000,
      animated: false,
    }).rotate();

    const meta = await image.metadata();
    if (!meta.width || !meta.height) {
      throw new AvatarImageError("Use a JPEG, PNG, or WebP photo.");
    }

    return await image
      .resize(GALLERY_MAX_EDGE, GALLERY_MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    if (err instanceof AvatarImageError) throw err;
    throw new AvatarImageError("Use a JPEG, PNG, or WebP photo.");
  }
}
