import { buttonClass } from "@/components/kyc/kyc-ui";
import { Link } from "@/i18n/navigation";

// What My bets and Wallet show to guests and to accounts still in review.
export function AccountGate({
  message,
  link,
  href,
}: {
  message: string;
  link: string;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-text-secondary">{message}</p>
      <Link href={href} className={`${buttonClass.outline} self-start`}>
        {link}
      </Link>
    </div>
  );
}
