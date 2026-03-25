import dynamic from "next/dynamic";

// Admin screen: client-only to avoid SSR runtime issues in Vercel/Node environment.
const FaturamentoClient = dynamic(() => import("./ui"), { ssr: false });

export default function FaturamentoCompraPage() {
  return <FaturamentoClient />;
}

