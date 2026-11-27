import type { ReactNode } from "react";

// Stroke icons from the Task 9/10 mockup canvas (24-unit grid).
function Icon({ size = 20, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const ShieldIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
  </Icon>
);

export const ShieldCheckIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
);

export const PhoneIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <rect x="7" y="2.5" width="10" height="19" rx="2" />
    <path d="M11 18.5h2" />
  </Icon>
);

export const SignOutIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10" />
  </Icon>
);

export const ListIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
  </Icon>
);

export const AlertIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.01" />
  </Icon>
);

export const CheckCircleIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.7 2.5L16 9.5" />
  </Icon>
);

export const XCircleIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </Icon>
);

export const ClockIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const WarningIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17v.01" />
  </Icon>
);

export const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M20 6L9 17l-5-5" />
  </Icon>
);

export const ChevronRightIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);

export const ChevronLeftIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);

export const ExternalIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icon>
);

export const UsersIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c1-3.5 3.6-5.5 6.5-5.5s5.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.7.7 2.9 2.4 3.5 5.2" />
  </Icon>
);

export const LogIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </Icon>
);

export const FlagIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Icon>
);
