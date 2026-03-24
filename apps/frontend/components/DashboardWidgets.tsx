"use client";

import Image from "next/image";

function Card({
  title,
  subtitle,
  children,
  right
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-zinc-400">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function KeyMetrics() {
  const items = [
    { label: "Revenue Growth", value: "12%", note: "+2% last month", color: "from-emerald-400/25 to-emerald-400/0" },
    { label: "Total Orders", value: "2,345", note: "+0.2% last month", color: "from-indigo-400/25 to-indigo-400/0" },
    { label: "Total Sales", value: "$125,000", note: "+3% last month", color: "from-pink-400/25 to-pink-400/0" },
    { label: "Conversion Rate", value: "4.5%", note: "-0.2% last month", color: "from-sky-400/25 to-sky-400/0" }
  ];

  return (
    <Card
      title="Key Metrics"
      right={<span className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-1.5 text-xs font-black text-zinc-200">Monthly</span>}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 hover:bg-zinc-950/55"
          >
            <div className={`h-10 w-10 rounded-2xl bg-gradient-to-b ${m.color} ring-1 ring-white/10`} />
            <p className="mt-3 text-2xl font-black text-white">{m.value}</p>
            <p className="mt-1 text-xs font-bold text-zinc-300">{m.label}</p>
            <p className="mt-2 text-[11px] text-zinc-500">{m.note}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LineChart() {
  const a = [12, 10, 14, 11, 15, 13, 16];
  const b = [10, 12, 11, 13, 12, 14, 13];
  const w = 640;
  const h = 160;
  const pad = 10;
  const max = 18;
  const toPoints = (arr: number[]) =>
    arr
      .map((v, i) => {
        const x = pad + (i * (w - pad * 2)) / (arr.length - 1);
        const y = pad + (1 - v / max) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full">
        <defs>
          <linearGradient id="grid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="fillA" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(223,152,48,0.22)" />
            <stop offset="1" stopColor="rgba(223,152,48,0)" />
          </linearGradient>
          <linearGradient id="fillB" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(52,211,153,0.20)" />
            <stop offset="1" stopColor="rgba(52,211,153,0)" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={w} height={h} fill="url(#grid)" opacity="0.35" />
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <line key={t} x1="0" x2={w} y1={h * t} y2={h * t} stroke="rgba(255,255,255,0.06)" />
        ))}

        <polyline points={toPoints(a)} fill="none" stroke="rgba(223,152,48,0.95)" strokeWidth="3" />
        <polyline points={toPoints(b)} fill="none" stroke="rgba(52,211,153,0.85)" strokeWidth="3" />

        <polygon
          points={`${toPoints(a)} ${w - pad},${h - pad} ${pad},${h - pad}`}
          fill="url(#fillA)"
        />
        <polygon
          points={`${toPoints(b)} ${w - pad},${h - pad} ${pad},${h - pad}`}
          fill="url(#fillB)"
        />
      </svg>

      <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-4 text-[11px] font-bold text-zinc-300">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent-400" />
          Last Week
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          This Week
        </div>
      </div>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 74;
  const cx = 90;
  const cy = 90;
  const circumference = Math.PI * r;
  const stroke = 16;
  const dash = (pct / 100) * circumference;

  return (
    <div className="grid place-items-center rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
      <svg viewBox="0 0 180 110" className="h-28 w-full">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(223,152,48,0.95)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <p className="-mt-6 text-3xl font-black text-white">{pct}%</p>
      <p className="mt-1 text-xs text-zinc-400">Completed</p>
      <p className="mt-2 text-[11px] font-bold text-zinc-500">$125,000/$173,000</p>
    </div>
  );
}

export function RevenueAndSales() {
  const sales = [
    { name: "Nike Adrenaline", value: "$340.00", when: "Just now" },
    { name: "Adidas Energy", value: "$250.00", when: "5 min ago" },
    { name: "Puma Speed", value: "$180.00", when: "15 min ago" }
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card
        title="Revenue Analytics"
        right={<span className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-1.5 text-xs font-black text-zinc-200">Weekly</span>}
      >
        <LineChart />
      </Card>

      <div className="grid gap-6">
        <Card title="Your Goal">
          <Gauge value={72} />
        </Card>

        <Card title="Recent Sales" subtitle="Ultimas vendas e pagamentos">
          <div className="space-y-2">
            {sales.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/40 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <Image
                      src="/service-card-powerbi.svg"
                      alt=""
                      fill
                      className="object-cover opacity-70"
                    />
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-black text-white">{s.name}</p>
                    <p className="text-[11px] text-zinc-500">{s.when}</p>
                  </div>
                </div>
                <p className="text-sm font-black text-zinc-100">{s.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function TransactionHistory() {
  const rows = [
    { id: "#00812", date: "Mar 22", customer: "Rogajo", status: "Incomplete", total: "$1,890.00" },
    { id: "#00346", date: "Mar 21", customer: "Valor Agro", status: "Success", total: "$2,340.00" },
    { id: "#00977", date: "Mar 20", customer: "Irineu Cassol", status: "Success", total: "$980.00" }
  ];

  const pill = (status: string) => {
    const base = "rounded-full px-3 py-1 text-[11px] font-black ring-1";
    if (status === "Success") return `${base} bg-emerald-500/12 text-emerald-200 ring-emerald-500/20`;
    return `${base} bg-pink-500/12 text-pink-200 ring-pink-500/20`;
  };

  return (
    <Card title="Transaction History" subtitle="Resumo de transacoes recentes">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/60 text-zinc-300">
            <tr>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.2em]">No.</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.2em]">Date</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.2em]">Customers</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.2em]">Status</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.2em]">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-4 py-3 font-black text-zinc-100">{r.id}</td>
                <td className="px-4 py-3 text-zinc-300">{r.date}</td>
                <td className="px-4 py-3 text-zinc-200">{r.customer}</td>
                <td className="px-4 py-3">
                  <span className={pill(r.status)}>{r.status}</span>
                </td>
                <td className="px-4 py-3 font-black text-zinc-100">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

