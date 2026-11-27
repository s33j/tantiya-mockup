import { createClient } from "@tantiya/supabase/server";

// Applications waiting for a staff decision, on the KYC review menu item.
export async function WaitingCount() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("kyc_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");

  if (!count) return null;
  return (
    <span className="ml-auto min-w-6 rounded-full bg-accent/15 px-2 text-center text-xs font-semibold text-text">
      <span className="sr-only">, waiting: </span>
      {count}
    </span>
  );
}
