/**
 * Profile photo processing — every upload becomes a 512×512 JPEG.
 *
 * Run: node --experimental-strip-types apps/web/spec/avatar-image.spec.ts
 */
import sharp from "sharp";
import { isSafeAvatarUrl } from "../src/lib/avatars.ts";
import { isSafeCoverUrl } from "../src/lib/banners.ts";
import {
  processAvatarImage,
  processCoverImage,
  AvatarImageError,
  AVATAR_OUTPUT_PX,
} from "../src/lib/server/avatar-image.ts";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const landscape = await sharp({
  create: {
    width: 800,
    height: 600,
    channels: 3,
    background: { r: 20, g: 80, b: 40 },
  },
})
  .png()
  .toBuffer();

const out = await processAvatarImage(landscape);
const meta = await sharp(out).metadata();

check("width is 512", meta.width === AVATAR_OUTPUT_PX, String(meta.width));
check("height is 512", meta.height === AVATAR_OUTPUT_PX, String(meta.height));
check("format is jpeg", meta.format === "jpeg", String(meta.format));

try {
  await processAvatarImage(Buffer.from("not-an-image"));
  check("rejects garbage", false);
} catch (err) {
  check("rejects garbage", err instanceof AvatarImageError);
}

const cover = await processCoverImage(landscape);
const coverMeta = await sharp(cover).metadata();
check("cover is jpeg", coverMeta.format === "jpeg", String(coverMeta.format));

const uid = "11111111-1111-1111-1111-111111111111";
const file = "22222222-2222-2222-2222-222222222222";
check("avatar jpg ok", isSafeAvatarUrl(`/uploads/${uid}/${file}.jpg`));
check("avatar gif rejected", !isSafeAvatarUrl(`/uploads/${uid}/${file}.gif`));
check("avatar traversal rejected", !isSafeAvatarUrl("/uploads/../etc/passwd"));
check("remote avatar rejected", !isSafeAvatarUrl("https://evil.example/x.jpg"));
check("cover jpg ok", isSafeCoverUrl(`/uploads/${uid}/${file}.jpg`));
check("cover gif rejected", !isSafeCoverUrl(`/uploads/${uid}/${file}.gif`));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
