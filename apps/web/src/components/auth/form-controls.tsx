"use client";

import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";
import type { AuthErrorKey } from "@/lib/auth/errors";

// Validation messages arrive as keys under Auth.errors (see lib/auth/schemas.ts).
function useErrorText(errorKey: string | undefined) {
  const t = useTranslations("Auth.errors");
  return errorKey ? t(errorKey as AuthErrorKey) : undefined;
}

type FieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
};

export function FormField({ label, error, ...props }: FieldProps) {
  const errorText = useErrorText(error);
  const errorId = `${props.name}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={props.name} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={props.name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="min-h-11 rounded-input border border-border-strong bg-surface px-3 text-base text-text"
        {...props}
      />
      {errorText && (
        <p id={errorId} className="text-sm text-closing-text">
          {errorText}
        </p>
      )}
    </div>
  );
}

type CheckboxProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
};

export function CheckboxField({ label, error, ...props }: CheckboxProps) {
  const errorText = useErrorText(error);
  const errorId = `${props.name}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="size-5 shrink-0 accent-accent"
          {...props}
        />
        {label}
      </label>
      {errorText && (
        <p id={errorId} className="text-sm text-closing-text">
          {errorText}
        </p>
      )}
    </div>
  );
}

export function SubmitButton(props: ComponentProps<"button">) {
  return (
    <button
      type="submit"
      className="min-h-11 rounded-input bg-accent px-4 font-semibold text-bg disabled:opacity-60"
      {...props}
    />
  );
}

export function FormError({ errorKey }: { errorKey: string | undefined }) {
  const errorText = useErrorText(errorKey);

  return errorText ? (
    <p role="alert" className="text-sm text-closing-text">
      {errorText}
    </p>
  ) : null;
}

export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="text-text-secondary">
      {children}
    </p>
  );
}
