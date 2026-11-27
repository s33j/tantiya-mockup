import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SubmitButton } from "@/components/auth/form-controls";
import { MOCK_DOCUMENT_TYPES, MOCK_SCENARIOS } from "@/lib/kyc/mock-scenarios";
import { mockEnabled } from "@/lib/kyc/provider";
import { createAdminClient } from "@/lib/supabase/admin";
import { simulate } from "./actions";

// Stand-in for Didit's hosted verification page, for development only. It checks
// nothing: you pick what Didit "decided", then it behaves like Didit afterwards
// (signed webhooks, then a redirect to the callback). English only: it is a dev
// tool, not a user screen.
async function MockDidit({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/dev/mock-didit">["searchParams"];
}) {
  if (!mockEnabled()) notFound();
  const { session: sessionId } = await searchParams;
  if (typeof sessionId !== "string") notFound();

  const { data: application } = await createAdminClient()
    .from("kyc_applications")
    .select("status, provider_status")
    .eq("didit_session_id", sessionId)
    .maybeSingle();
  if (!application) notFound();

  return (
    <>
      <p
        role="note"
        className="rounded-card border border-dashed border-border-strong p-3 text-sm"
      >
        MOCK VENDOR · dev only · no real identity check happens here
      </p>
      <div>
        <h1 className="text-xl font-semibold">Mock Didit verification</h1>
        <p className="text-sm text-text-muted">
          Session {sessionId.slice(0, 8)} · application: {application.status} ·
          vendor: {application.provider_status ?? "—"}
        </p>
      </div>

      <form
        action={simulate.bind(null, sessionId)}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Document</span>
          <select
            name="documentType"
            className="min-h-11 rounded-input border border-border-strong bg-surface px-3 text-base text-text"
          >
            {MOCK_DOCUMENT_TYPES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">
            What should Didit decide?
          </legend>
          {Object.entries(MOCK_SCENARIOS).map(([id, label], i) => (
            <label key={id} className="flex items-start gap-3 text-sm">
              <input
                type="radio"
                name="scenario"
                value={id}
                defaultChecked={i === 0}
                className="mt-0.5 size-5 shrink-0 accent-accent"
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="sendTwice"
            className="size-5 shrink-0 accent-accent"
          />
          Send every webhook twice (retry test)
        </label>

        <SubmitButton>Finish verification</SubmitButton>
      </form>
    </>
  );
}

export default function MockDiditPage({
  searchParams,
}: PageProps<"/[locale]/dev/mock-didit">) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <Suspense>
        <MockDidit searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
