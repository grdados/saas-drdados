import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GR Dados",
  description: "Solucoes sob medida para gestao, CRM e BI com Power BI."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={manrope.className}>
        {children}
        <FloatingWhatsAppButton />
      </body>
    </html>
  );
}
