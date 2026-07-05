import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN, SCRYPT_PARAMS).toString("hex");
  return `scrypt$${SCRYPT_PARAMS.N}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const salt = parts[2]!;
  const expected = Buffer.from(parts[3]!, "hex");
  const actual = scryptSync(password, salt, expected.length, { ...SCRYPT_PARAMS, N: n });
  return timingSafeEqual(actual, expected);
}
