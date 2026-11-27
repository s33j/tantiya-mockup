import { Wordmark } from "@/components/wordmark";

// S1–S3 and "not staff": the wordmark header and one centered card.
export default function EntryLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-border bg-surface-sunken">
        <div className="flex min-h-16 items-center px-6 py-3">
          <Wordmark />
        </div>
      </header>
      <main className="flex flex-1 justify-center px-6 py-24">
        <div className="flex w-full flex-col items-center gap-4">
          {children}
          <p className="text-center text-xs text-text-muted">
            Staff console · separate from the public app · staff accounts only
          </p>
        </div>
      </main>
    </>
  );
}
