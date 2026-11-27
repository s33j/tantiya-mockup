"use client";

import { useMutation } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { createContext, use, useState, type ReactNode } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import type { StartKycResult } from "@/lib/kyc/start";
import {
  AccountHeading,
  buttonClass,
  icons,
  KycCard,
  KycSteps,
} from "./kyc-ui";

// Starting (or resuming) the Didit ID check from the Account page. Every start
// button calls POST /api/kyc/session (README "KYC"):
//   redirect             go to Didit's hosted flow
//   cap_reached          screen 06, applications full, with the reset date
//   provider_error/error screen 11, couldn't start the ID check
//   anything else        the server already knows better: reload the page
// 06 and 11 exist only in this response, not in the database, so they replace
// the screen here instead of having a URL. A reload shows the saved state again.

type Outcome = { screen: "full"; resetsOn: string } | { screen: "error" };

type KycStartContext = { start: () => void; pending: boolean };

const Context = createContext<KycStartContext | null>(null);

export function useKycStart() {
  const value = use(Context);
  if (!value) throw new Error("useKycStart needs <KycStart>");
  return value;
}

async function postStart(): Promise<StartKycResult> {
  const response = await fetch("/api/kyc/session", { method: "POST" });
  return (await response.json()) as StartKycResult;
}

export function KycStart({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<Outcome>();
  const mutation = useMutation({
    mutationFn: postStart,
    onSuccess(result) {
      switch (result.state) {
        case "redirect":
          window.location.assign(result.url);
          return;
        case "cap_reached":
          setOutcome({ screen: "full", resetsOn: result.resetsOn });
          return;
        case "provider_error":
        case "error":
          setOutcome({ screen: "error" });
          return;
        default:
          setOutcome(undefined);
          router.refresh();
      }
    },
    onError: () => setOutcome({ screen: "error" }),
  });
  // Stay disabled while the browser leaves for Didit.
  const pending = mutation.isPending || mutation.data?.state === "redirect";

  return (
    <Context value={{ start: () => mutation.mutate(), pending }}>
      {outcome?.screen === "full" ? (
        <ApplicationsFull resetsOn={outcome.resetsOn} />
      ) : outcome?.screen === "error" ? (
        <CouldNotStart />
      ) : (
        children
      )}
    </Context>
  );
}

export function StartButton({
  label,
  external = true,
}: {
  label: string;
  external?: boolean;
}) {
  const { start, pending } = useKycStart();

  return (
    <button
      type="button"
      onClick={start}
      disabled={pending}
      aria-busy={pending || undefined}
      className={buttonClass.primary}
    >
      {label}
      {external && icons.external}
    </button>
  );
}

function BrowseMeanwhile() {
  const t = useTranslations("Kyc");
  return (
    <Link href="/" className={buttonClass.outline}>
      {t("browseMarketsMeanwhile")}
    </Link>
  );
}

// 06 · cap_reached
function ApplicationsFull({ resetsOn }: { resetsOn: string }) {
  const t = useTranslations("Kyc.full");
  const format = useFormatter();
  // resetsOn is a calendar date (YYYY-MM-DD), the 1st of next month in PHT.
  const date = format.dateTime(new Date(`${resetsOn}T00:00:00Z`), {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <AccountHeading />
      <KycSteps />
      <KycCard icon={icons.calendar} tone="neutral" title={t("title")}>
        <p className="text-text-secondary">
          {t.rich("body", {
            date,
            nowrap: (chunks) => (
              <span className="whitespace-nowrap">{chunks}</span>
            ),
          })}
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-input bg-surface-sunken p-3">
          <span className="text-sm text-text-muted">{t("reopens")}</span>
          <span className="font-semibold">{date}</span>
        </div>
        <p className="text-sm text-text-secondary">{t("saved")}</p>
      </KycCard>
      <BrowseMeanwhile />
    </>
  );
}

// 11 · provider_error / error
function CouldNotStart() {
  const t = useTranslations("Kyc.startError");

  return (
    <>
      <AccountHeading />
      <KycSteps />
      <KycCard icon={icons.info()} tone="neutral" title={t("title")}>
        <p className="text-text-secondary">{t("body")}</p>
        <p className="text-sm text-text-muted">{t("saved")}</p>
        <StartButton label={t("retry")} external={false} />
      </KycCard>
      <BrowseMeanwhile />
    </>
  );
}
