import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

// Where Didit (or the dev mock) sends the user after the hosted flow. The
// Account page shows every application state (Gantt Task 9), so this only
// forwards there. It drops the ?status= Didit appends: the Account page reads
// our own record, since anyone can type a query string.
export default async function KycReturnPage() {
  redirect({ href: "/account", locale: await getLocale() });
}
