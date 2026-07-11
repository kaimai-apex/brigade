import { createHmac } from 'crypto';

/** Minimal RFC 6238 TOTP (SHA-1, 30s step, 6 digits) with ±1 window. */
export function verifyTotp(
  secretBase32: string,
  code: string,
  window = 1,
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secretBase32);
  if (!key) return false;
  const now = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    if (generateHotp(key, now + w) === code) return true;
  }
  return false;
}

function generateHotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter & 0xffffffff, 4);
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(bin % 1_000_000).padStart(6, '0');
}

function base32Decode(input: string): Buffer | null {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = input.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  if (!cleaned || /[^A-Z2-7]/.test(cleaned)) return null;
  let bits = '';
  for (const c of cleaned) {
    const val = alphabet.indexOf(c);
    if (val < 0) return null;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}
