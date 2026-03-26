import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { APP_LOCALE } from "@/lib/locale";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GR Dados",
  description: "Soluções sob medida para gestão, CRM e BI com Power BI."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={APP_LOCALE}>
      <body className={manrope.className}>
        {children}
        <FloatingWhatsAppButton />
      </body>
    </html>
  );
}
