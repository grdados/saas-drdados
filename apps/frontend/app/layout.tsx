import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

const manrope = Manrope({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale);

  return {
    title: "GR Dados",
    description: messages.meta.description
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale);

  return (
    <html lang={locale}>
      <body className={manrope.className}>
        <LocaleProvider locale={locale} messages={messages}>
          {children}
          <FloatingWhatsAppButton />
        </LocaleProvider>
      </body>
    </html>
  );
}
