import { createHmac, timingSafeEqual } from "node:crypto";

/** Hex HMAC-SHA256 of the exact raw body, as Didit computes X-Signature. */
export function signDiditBody(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

/** Constant-time check of Didit's X-Signature header against the raw body. */
export function verifyDiditSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(signDiditBody(rawBody, secret), "hex");
  const given = Buffer.from(signature.trim(), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
