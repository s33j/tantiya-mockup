import type { ComponentProps } from "react";

type FieldProps = ComponentProps<"input"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, ...props }: FieldProps) {
  const hintId = `${props.name}-hint`;
  const errorId = `${props.name}-error`;
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={props.name} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={props.name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="min-h-11 rounded-input border border-border-strong bg-surface-sunken px-3 text-base text-text"
        {...props}
      />
      {hint && (
        <span id={hintId} className="text-xs text-text-muted">
          {hint}
        </span>
      )}
      {error && (
        <p id={errorId} className="text-sm text-closing-text">
          {error}
        </p>
      )}
    </div>
  );
}

export function PrimaryButton(props: ComponentProps<"button">) {
  return (
    <button
      type="submit"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-input bg-accent px-4 font-semibold text-bg disabled:opacity-60"
      {...props}
    />
  );
}

export function FormError({ message }: { message: string | undefined }) {
  return message ? (
    <p role="alert" className="text-sm text-closing-text">
      {message}
    </p>
  ) : null;
}
