import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { iconProps } from "@/components/app-shell/nav-items";

// Shared pieces of the application screens (Gantt Task 9), used by both the
// server-rendered screens and the client-side ones (06, 10, 11). No hooks that
// need the browser, so they render on either side.

export const buttonClass = {
  primary:
    "flex min-h-11 items-center justify-center gap-2 rounded-input bg-accent px-4 text-center font-semibold text-bg disabled:opacity-60",
  outline:
    "flex min-h-11 items-center justify-center rounded-input border border-border-strong px-4 text-center font-semibold text-text",
  text: "flex min-h-11 items-center self-center font-semibold text-accent-text",
};

function Icon({ size = 24, children }: { size?: number; children: ReactNode }) {
  return (
    <svg {...iconProps} width={size} height={size}>
      {children}
    </svg>
  );
}

// 24px stroke icons from the canvas.
export const icons = {
  check: (
    <svg {...iconProps} width={14} height={14} strokeWidth={3}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  clock: (size?: number) => (
    <Icon size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  ),
  info: (size?: number) => (
    <Icon size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" />
    </Icon>
  ),
  calendar: (
    <Icon>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
  ),
  approved: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.5L16 9.5" />
    </Icon>
  ),
  external: (
    <Icon size={18}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Icon>
  ),
  idCard: (
    <Icon size={20}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M14 10h4M14 13h3" />
    </Icon>
  ),
  selfie: (
    <Icon size={20}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="11" r="3" />
      <path d="M8.5 17c.8-1.3 2-2 3.5-2s2.7.7 3.5 2" />
    </Icon>
  ),
  light: (
    <Icon size={20}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />
    </Icon>
  ),
  shield: (
    <Icon size={20}>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
    </Icon>
  ),
};

// "Account · Identity · Review", on step 2 for every screen before submission.
export function KycSteps() {
  const t = useTranslations("Kyc.steps");
  const steps = [t("account"), t("identity"), t("review")];

  return (
    <nav aria-label={t("label", { current: 2, total: 3 })}>
      <ol className="flex gap-5">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={i === 1 ? "step" : undefined}
            className={`flex items-center gap-2 text-xs whitespace-nowrap ${
              i === 0
                ? "text-text-secondary"
                : i === 1
                  ? "font-semibold text-text"
                  : "text-text-muted"
            }`}
          >
            {i === 0 ? (
              <span className="flex size-6 items-center justify-center rounded-full bg-accent text-bg">
                {icons.check}
              </span>
            ) : (
              <span
                className={`flex size-[22px] items-center justify-center rounded-full border text-xs font-semibold ${
                  i === 1
                    ? "border-accent-text text-accent-text"
                    : "border-border-strong text-text-muted"
                }`}
              >
                {i + 1}
              </span>
            )}
            <span>{label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const iconTone = {
  accent: "text-accent-text",
  neutral: "text-text-secondary",
  open: "text-open",
};

// The status card every screen is built around: icon, title, then content.
export function KycCard({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode;
  tone: keyof typeof iconTone;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className={`flex pt-0.5 ${iconTone[tone]}`}>{icon}</span>
        <h2 className="text-lg leading-snug font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function AccountHeading() {
  const t = useTranslations("Auth");
  return (
    <h1 className="text-xl leading-tight font-semibold">{t("accountTitle")}</h1>
  );
}

// Didit's hosted flow is English only, so Filipino screens say so.
export function ProviderLanguageNote({ withIcon }: { withIcon?: boolean }) {
  const t = useTranslations("Kyc");
  if (useLocale() === "en") return null;

  return (
    <p className="flex items-start gap-2 text-sm text-text-secondary">
      {withIcon && (
        <span className="flex text-text-muted">{icons.info(18)}</span>
      )}
      <span>{t("providerInEnglish")}</span>
    </p>
  );
}

export function Divider() {
  return <div className="border-t border-border" />;
}
