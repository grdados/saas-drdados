import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GR Dados",
  description: "SaaS CRM para gestão de leads, clientes e vendas."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={manrope.className}>{children}</body>
    </html>
  );
}
