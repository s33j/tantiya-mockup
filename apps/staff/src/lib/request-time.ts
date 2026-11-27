import { connection } from "next/server";

// The current time, read at request time (never during prerendering), for
// waiting times on the KYC pages.
export async function requestTime() {
  await connection();
  return Date.now();
}
