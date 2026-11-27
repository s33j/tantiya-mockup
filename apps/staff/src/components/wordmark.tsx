import Link from "next/link";
import { paths } from "@/lib/paths";

export function Wordmark() {
  return (
    <Link href={paths.home} className="flex items-baseline gap-2 text-text">
      <span className="text-lg font-bold tracking-tight">Tantiya</span>
      <span className="text-sm font-semibold text-text-muted">Staff</span>
    </Link>
  );
}
