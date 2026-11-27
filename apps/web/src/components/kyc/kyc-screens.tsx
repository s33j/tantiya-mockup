import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STARTING_GRANT_COINS } from "@tantiya/core/coins";
import { isFixable, type KycView } from "@/lib/kyc/view-state";
import { ConfirmDeclarationsForm } from "./confirm-declarations-form";
import { StartButton } from "./kyc-start";
import {
  AccountHeading,
  buttonClass,
  Divider,
  icons,
  KycCard,
  KycSteps,
  ProviderLanguageNote,
} from "./kyc-ui";

// The application screens on the Account page (Gantt Task 9), numbered as on the
// "Tantiya — Task 9 Application Flow" canvas. 06 and 11 live in kyc-start.tsx.
// Proposal, Features > Sign-up and KYC: a staff reviewer approves every account
// and the user sees "Under review" until then.

export type StartingGrant = { coins: number; addedAt: string };

export function KycScreen({
  view,
  grant,
}: {
  view: KycView;
  grant?: StartingGrant;
}) {
  switch (view.screen) {
    case "verify":
      return <VerifyIdentity />;
    case "underReview":
      return <UnderReview />;
    case "notFinished":
      return <NotFinished />;
    case "notApproved":
      return <NotApproved view={view} />;
    case "approved":
      return <Approved grant={grant} />;
    case "receiving":
      return <Receiving />;
    case "confirmDeclarations":
      return <ConfirmDeclarations />;
    case "accountClosed":
      return <AccountHeading />;
  }
}

function BrowseMarkets({ label }: { label: "browseMarkets" | "browseFirst" }) {
  const t = useTranslations("Kyc");
  return label === "browseFirst" ? (
    <Link href="/" className={buttonClass.text}>
      {t("verify.browseFirst")}
    </Link>
  ) : (
    <Link href="/" className={buttonClass.outline}>
      {t("browseMarkets")}
    </Link>
  );
}

// 03 · no application yet
function VerifyIdentity() {
  const t = useTranslations("Kyc.verify");
  const needs = [
    { icon: icons.idCard, text: t("needId") },
    { icon: icons.selfie, text: t("needSelfie") },
    { icon: icons.light, text: t("needLight") },
  ];

  return (
    <>
      <KycSteps />
      <div className="flex flex-col gap-2">
        <h1 className="text-xl leading-tight font-semibold">{t("title")}</h1>
        <p className="text-text-secondary">{t("intro")}</p>
      </div>
      <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
        <h2 className="font-semibold">{t("needTitle")}</h2>
        <ul className="flex flex-col gap-3">
          {needs.map(({ icon, text }) => (
            <li
              key={text}
              className="flex items-start gap-3 text-sm text-text-secondary"
            >
              <span className="flex pt-px text-accent-text">{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <span className="flex text-accent-text">{icons.shield}</span>
          <h2 className="font-semibold">{t("dataTitle")}</h2>
        </div>
        <p className="text-sm text-text-secondary">{t("dataProvider")}</p>
        <p className="text-sm text-text-secondary">{t("dataMinimal")}</p>
      </section>
      <div className="flex flex-col gap-2">
        <ProviderLanguageNote withIcon />
        <StartButton label={t("start")} />
        <p className="text-center text-xs text-text-muted">
          {t("continueNote")}
        </p>
        <BrowseMarkets label="browseFirst" />
      </div>
    </>
  );
}

// 04 · submitted
function UnderReview() {
  const t = useTranslations("Kyc.underReview");
  const done = [t("stepAccount"), t("stepSubmitted")];

  return (
    <>
      <AccountHeading />
      <KycCard icon={icons.clock()} tone="accent" title={t("title")}>
        <p className="text-text-secondary">{t("body")}</p>
        <Divider />
        <ol className="flex flex-col gap-3">
          {done.map((step) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-bg">
                {icons.check}
              </span>
              <span className="text-sm text-text-secondary">{step}</span>
            </li>
          ))}
          <li aria-current="step" className="flex items-start gap-3">
            <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border border-accent-text text-accent-text">
              {icons.clock(14)}
            </span>
            <span className="text-sm">
              {t("stepReview")}
              <span className="block text-xs text-text-muted">
                {t("reviewTime")}
              </span>
            </span>
          </li>
        </ol>
        <p className="text-sm text-text-muted">
          {t("grantNote", { coins: STARTING_GRANT_COINS })}
        </p>
      </KycCard>
      <BrowseMarkets label="browseMarkets" />
    </>
  );
}

// 05 · abandoned
function NotFinished() {
  const t = useTranslations("Kyc.notFinished");

  return (
    <>
      <AccountHeading />
      <KycSteps />
      <KycCard icon={icons.info()} tone="neutral" title={t("title")}>
        <p className="text-text-secondary">{t("body")}</p>
        <StartButton label={t("continue")} />
        <ProviderLanguageNote />
      </KycCard>
    </>
  );
}

// 07 · rejected. Re-applying is tentative (Task 7 handoff); "Apply again" shows
// only for reasons the applicant can fix.
function NotApproved({
  view,
}: {
  view: Extract<KycView, { screen: "notApproved" }>;
}) {
  const t = useTranslations("Kyc.notApproved");
  const reason = view.reason;

  return (
    <>
      <AccountHeading />
      <KycCard icon={icons.info()} tone="neutral" title={t("title")}>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-text-muted">
            {t("reasonLabel")}
          </span>
          <p className="text-text-secondary">{t(`reasons.${reason}`)}</p>
        </div>
        {isFixable(reason) && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-text-muted">
                {t("actionLabel")}
              </span>
              <p className="text-text-secondary">{t(`actions.${reason}`)}</p>
            </div>
            <Divider />
            <div className="flex flex-col gap-2">
              <StartButton label={t("applyAgain")} />
              <p className="text-center text-xs text-text-muted">
                {t("applyAgainNote")}
              </p>
            </div>
          </>
        )}
      </KycCard>
      <p className="text-sm text-text-secondary">
        {t.rich("support", {
          address: t("supportEmail"),
          email: (chunks) => <span className="text-text">{chunks}</span>,
        })}
      </p>
    </>
  );
}

// 08 · approved. Calm on purpose: no confetti or celebration (proposal,
// Safer play and Branding).
function Approved({ grant }: { grant?: StartingGrant }) {
  const t = useTranslations("Kyc.approved");
  const tKyc = useTranslations("Kyc");
  const format = useFormatter();

  return (
    <>
      <AccountHeading />
      <KycCard icon={icons.approved} tone="open" title={t("title")}>
        <p className="text-text-secondary">{t("body")}</p>
        {grant && (
          <div className="flex flex-col gap-1 rounded-input bg-surface-sunken px-4 py-3">
            <span className="text-sm text-text-muted">{t("grantLabel")}</span>
            <span className="flex items-baseline gap-2">
              <span className="text-xl leading-tight font-semibold tabular-nums">
                {format.number(grant.coins)}
              </span>
              <span className="text-text-secondary">{t("coins")}</span>
            </span>
            <span className="text-xs text-text-muted">
              {t("grantAdded", {
                date: format.dateTime(new Date(grant.addedAt), {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  timeZone: "Asia/Manila",
                }),
              })}
            </span>
          </div>
        )}
        <p className="text-sm text-text-muted">{t("playMoney")}</p>
      </KycCard>
      <Link href="/" className={buttonClass.primary}>
        {tKyc("browseMarkets")}
      </Link>
    </>
  );
}

// 09 · started: back from Didit, the webhook is not in yet.
function Receiving() {
  const t = useTranslations("Kyc.receiving");

  return (
    <>
      {/* The webhook usually lands within seconds of the redirect. */}
      <meta httpEquiv="refresh" content="3" />
      <AccountHeading />
      <KycSteps />
      <KycCard icon={icons.clock()} tone="accent" title={t("title")}>
        <p role="status" className="text-text-secondary">
          {t("body")}
        </p>
        <Divider />
        <p className="text-sm text-text-muted">{t("leave")}</p>
      </KycCard>
    </>
  );
}

// 10 · declarations_missing
function ConfirmDeclarations() {
  const t = useTranslations("Kyc.declarations");

  return (
    <>
      <AccountHeading />
      <KycSteps />
      <KycCard icon={icons.info()} tone="neutral" title={t("title")}>
        <p className="text-text-secondary">{t("body")}</p>
        <ConfirmDeclarationsForm />
      </KycCard>
    </>
  );
}
