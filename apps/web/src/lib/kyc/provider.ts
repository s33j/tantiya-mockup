import { randomUUID } from "node:crypto";
import type { DiditCreateSessionResponse } from "./didit-types";

export interface CreateSessionInput {
  applicationId: string;
  userId: string;
  callbackUrl: string;
}

export interface CreatedSession {
  sessionId: string;
  url: string;
}

export interface KycProvider {
  name: "mock" | "didit";
  createSession(input: CreateSessionInput): Promise<CreatedSession>;
}

export class KycProviderError extends Error {}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new KycProviderError(`${name} is not set`);
  return v;
}

/** Real Didit: hosted flow, POST /v3/session/. */
export const diditProvider: KycProvider = {
  name: "didit",
  async createSession({ applicationId, userId, callbackUrl }) {
    const base = process.env.DIDIT_API_BASE ?? "https://verification.didit.me";
    const res = await fetch(`${base}/v3/session/`, {
      method: "POST",
      headers: {
        "x-api-key": required("DIDIT_API_KEY"),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        workflow_id: required("DIDIT_WORKFLOW_ID"),
        vendor_data: userId,
        callback: callbackUrl,
        metadata: { application_id: applicationId },
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      // 429 = free-plan rate limit (10/min); 402/403 can mean the credit ran out.
      throw new KycProviderError(
        `Didit create session failed: HTTP ${res.status}`,
      );
    }
    const body = (await res.json()) as DiditCreateSessionResponse;
    return { sessionId: body.session_id, url: body.url };
  },
};

/** Mock Didit, dev only: no network. Its "hosted flow" is /dev/mock-didit?session=…. */
export const mockProvider: KycProvider = {
  name: "mock",
  async createSession() {
    const sessionId = randomUUID();
    return {
      sessionId,
      url: `${appUrl()}/dev/mock-didit?session=${sessionId}`,
    };
  },
};

export function getKycProvider(): KycProvider {
  const which = process.env.KYC_PROVIDER ?? "mock";
  if (which === "didit") return diditProvider;
  if (which === "mock") {
    if (process.env.VERCEL_ENV === "production") {
      throw new KycProviderError(
        "KYC_PROVIDER=mock is not allowed in production",
      );
    }
    return mockProvider;
  }
  throw new KycProviderError(`Unknown KYC_PROVIDER "${which}"`);
}

/** The mock page exists only when KYC_PROVIDER=mock, and never in production. */
export function mockEnabled(): boolean {
  return (
    (process.env.KYC_PROVIDER ?? "mock") === "mock" &&
    process.env.VERCEL_ENV !== "production"
  );
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
