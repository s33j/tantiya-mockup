import type { ReactNode } from "react";
import { formatDuration, urgency, type DuplicateFace } from "@/lib/kyc";
import {
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  WarningIcon,
  XCircleIcon,
} from "./icons";

// Status always pairs a color with an icon and text (proposal, Branding).
function Status({
  icon,
  tone,
  strong = false,
  children,
}: {
  icon: ReactNode;
  tone: "open" | "closing" | "closed" | "plain";
  strong?: boolean;
  children: ReactNode;
}) {
  const color = {
    open: "text-open-text",
    closing: "text-closing-text",
    closed: "text-closed-text",
    plain: "text-text-secondary",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap ${color} ${strong ? "font-semibold" : ""}`}
    >
      {icon}
      {children}
    </span>
  );
}

// Didit's own result: advice for the reviewer, never the decision.
export function VerdictLabel({ status }: { status: string | null }) {
  switch (status) {
    case "Approved":
      return (
        <Status icon={<CheckCircleIcon />} tone="open">
          Approved
        </Status>
      );
    case "Declined":
      return (
        <Status icon={<XCircleIcon />} tone="closed" strong>
          Declined
        </Status>
      );
    case "In Review":
      return (
        <Status icon={<ClockIcon />} tone="closing">
          In Review
        </Status>
      );
    case null:
      return <span className="text-text-muted">—</span>;
    default:
      return <span className="text-text-secondary">{status}</span>;
  }
}

export function DuplicateLabel({ value }: { value: DuplicateFace | null }) {
  switch (value) {
    case "none":
      return (
        <Status icon={<CheckIcon />} tone="plain">
          None found
        </Status>
      );
    case "possible":
      return (
        <Status icon={<WarningIcon />} tone="closing">
          Possible match
        </Status>
      );
    case "strong":
      return (
        <Status icon={<WarningIcon />} tone="closing" strong>
          Strong match
        </Status>
      );
    default:
      return <span className="text-text-muted">Not reported</span>;
  }
}

export function Waiting({ ms }: { ms: number }) {
  const level = urgency(ms);
  return (
    <span className="flex flex-col">
      <span className="font-semibold whitespace-nowrap">
        {formatDuration(ms)}
      </span>
      {level === "over" ? (
        <Status icon={<WarningIcon />} tone="closing" strong>
          Over 24 h
        </Status>
      ) : level === "dueSoon" ? (
        <Status icon={<ClockIcon />} tone="closing">
          Due soon
        </Status>
      ) : (
        <Status icon={<ClockIcon />} tone="open">
          On track
        </Status>
      )}
    </span>
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg leading-snug font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Details({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</dl>;
}

export function Detail({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-sm text-text-muted">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}
