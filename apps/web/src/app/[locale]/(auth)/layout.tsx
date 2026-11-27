import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

// Sign-up, sign-in, password and account pages: one narrow column, and the only
// routes that send the Auth messages (and, for the Account page's application
// flow, the Kyc messages) to the browser.
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider
      messages={{ Auth: messages.Auth, Kyc: messages.Kyc }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
