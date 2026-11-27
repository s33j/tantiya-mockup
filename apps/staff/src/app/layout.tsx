import type { Metadata } from "next";
import { plexSans } from "@tantiya/ui/fonts";
import { QueryProvider } from "@tantiya/ui/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tantiya Staff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
