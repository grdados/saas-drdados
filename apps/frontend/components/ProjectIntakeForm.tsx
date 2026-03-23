"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { submitProjectIntake } from "@/lib/api";

type Solution = "erp" | "crm" | "power_bi" | "landing_page";
type DataLocation = "excel" | "database" | "erp" | "api" | "unknown";
type DataAccess = "direct_db" | "export" | "api" | "integration" | "unknown";
type UpdateFrequency = "real_time" | "hourly" | "daily" | "manual";
type DataStructure = "structured" | "partial" | "not_organized";

type Temperature = "cold" | "warm" | "hot";

type IntakePayload = {
  name: string;
  company: string;
  email: string;
  whatsapp: string;
  solution: Solution | "";
  start_date: string;
  company_size: string;
  description: string;
  has_system: boolean | null;
  data_location: DataLocation | "";
  data_access: DataAccess | "";
  update_frequency: UpdateFrequency | "";
  data_structure: DataStructure | "";
  objective: string;
  budget_range: string;
  needs_data_help: boolean | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeScore(p: IntakePayload): { score: number; temperature: Temperature } {
  let score = 0;
  if (p.solution === "power_bi") score += 25;
  if (p.solution === "erp" || p.solution === "crm") score += 20;
  if (p.solution === "landing_page") score += 10;

  if (p.budget_range.startsWith("Acima")) score += 35;
  else if (p.budget_range.startsWith("De 5.000")) score += 25;
  else if (p.budget_range.startsWith("De 2.000 a 5.000")) score += 15;
  else if (p.budget_range.startsWith("Até 2.000") || p.budget_range.startsWith("Ate 2.000")) score += 10;

  if (p.update_frequency === "real_time" || p.update_frequency === "hourly") score += 10;
  if (p.data_structure === "structured") score += 10;
  if (p.data_structure === "partial") score += 5;
  if (p.has_system) score += 5;
  if (p.needs_data_help) score += 10;

  score = clamp(score, 0, 100);
  const temperature: Temperature = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
  return { score, temperature };
}

function TempPill({ temperature, score }: { temperature: Temperature; score: number }) {
  const label = temperature === "hot" ? "Quente" : temperature === "warm" ? "Morno" : "Frio";
  const cls =
    temperature === "hot"
      ? "bg-red-500/15 text-red-200 border-red-500/30"
      : temperature === "warm"
        ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
        : "bg-sky-500/15 text-sky-200 border-sky-500/30";
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${cls}`}>
      <span>{label}</span>
      <span className="text-white/70">{score}/100</span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">{children}</p>;
}

function InputBase(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={[
        "w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm font-semibold text-zinc-100",
        "placeholder:text-zinc-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/20",
        className ?? ""
      ].join(" ")}
    />
  );
}

function TextAreaBase(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={[
        "min-h-[120px] w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm font-semibold text-zinc-100",
        "placeholder:text-zinc-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/20",
        className ?? ""
      ].join(" ")}
    />
  );
}

function SelectBase(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select
      {...rest}
      className={[
        "w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm font-semibold text-zinc-100",
        "focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/20",
        className ?? ""
      ].join(" ")}
    />
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options
}: {
  value: T | "";
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string; hint?: string }>;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={[
              "group rounded-2xl border p-4 text-left transition",
              active
                ? "border-accent-500/60 bg-accent-500/10 shadow-[0_0_0_1px_rgba(223,152,48,0.35),0_16px_50px_rgba(0,0,0,0.45)]"
                : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/70"
            ].join(" ")}
          >
            <p className="text-sm font-black text-white">{o.label}</p>
            {o.hint ? <p className="mt-1 text-xs font-semibold text-zinc-400">{o.hint}</p> : null}
          </button>
        );
      })}
    </div>
  );
}

function formatWhatsAppLink(message: string) {
  const phone = "5567998698159";
  const text = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${text}`;
}

export function ProjectIntakeForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [whatsMessage, setWhatsMessage] = useState("");
  const [resultTemp, setResultTemp] = useState<Temperature>("cold");
  const [resultScore, setResultScore] = useState(0);
  const [autoWhatsApp, setAutoWhatsApp] = useState(true);

  const [form, setForm] = useState<IntakePayload>({
    name: "",
    company: "",
    email: "",
    whatsapp: "",
    solution: "",
    start_date: "",
    company_size: "",
    description: "",
    has_system: null,
    data_location: "",
    data_access: "",
    update_frequency: "",
    data_structure: "",
    objective: "",
    budget_range: "",
    needs_data_help: null
  });

  const dataQuestionsEnabled = form.solution !== "landing_page";

  const scorePreview = useMemo(() => computeScore(form), [form]);

  const requiredOk =
    form.name.trim() &&
    form.company.trim() &&
    form.email.trim() &&
    form.whatsapp.trim() &&
    form.solution &&
    form.has_system !== null &&
    form.description.trim() &&
    form.objective.trim() &&
    form.budget_range.trim() &&
    form.needs_data_help !== null &&
    (!dataQuestionsEnabled ||
      (form.data_location && form.data_access && form.update_frequency && form.data_structure));

  async function onSubmit() {
    setError("");
    setSuccessMessage("");
    setWhatsMessage("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        start_date: form.start_date || null
      };
      const res = await submitProjectIntake(payload);
      setSuccessMessage("Recebemos suas informacoes. Retornaremos seu contato.");
      setWhatsMessage(res.whatsapp_message ?? "");
      setResultScore(res.score ?? scorePreview.score);
      setResultTemp((res.temperature as Temperature) ?? scorePreview.temperature);
      setStep(4);

      if (autoWhatsApp && res.whatsapp_message) {
        // Open WhatsApp in a user-initiated flow (submit click). Some browsers may still block.
        window.open(formatWhatsAppLink(res.whatsapp_message), "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 p-7">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl" />

              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-accent-300">
                  Formulario inteligente
                </p>
                <h1 className="mt-3 text-3xl font-black leading-[1.08] tracking-tight text-white md:text-4xl">
                  Iniciar um projeto com a GR Dados
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
                  Responda em poucos minutos. O formulario adapta as perguntas conforme sua necessidade, calcula um score
                  do lead e ja deixa um resumo pronto para WhatsApp.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <TempPill temperature={scorePreview.temperature} score={scorePreview.score} />
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/50 px-3 py-1 text-xs font-black text-zinc-200">
                    Etapa {step}/4
                  </div>
                  <Link
                    href="/#inicio"
                    className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400 hover:text-zinc-200"
                  >
                    Voltar ao site
                  </Link>
                </div>

                {step === 1 ? (
                  <div className="mt-8 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel>Nome</FieldLabel>
                        <InputBase
                          value={form.name}
                          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                          placeholder="Seu nome"
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>Empresa</FieldLabel>
                        <InputBase
                          value={form.company}
                          onChange={(e) => setForm((s) => ({ ...s, company: e.target.value }))}
                          placeholder="Nome da empresa"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel>Email</FieldLabel>
                        <InputBase
                          value={form.email}
                          onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                          placeholder="voce@empresa.com"
                          type="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>Whatsapp</FieldLabel>
                        <InputBase
                          value={form.whatsapp}
                          onChange={(e) => setForm((s) => ({ ...s, whatsapp: e.target.value }))}
                          placeholder="(67) 99869-8159"
                          inputMode="tel"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Qual solucao precisa?</FieldLabel>
                      <SelectBase
                        value={form.solution}
                        onChange={(e) => setForm((s) => ({ ...s, solution: e.target.value as Solution }))}
                      >
                        <option value="" disabled>
                          Selecione uma opcao
                        </option>
                        <option value="erp">Solucao ERP</option>
                        <option value="crm">Solucao CRM</option>
                        <option value="power_bi">Dashboard Power BI</option>
                        <option value="landing_page">Landing Page</option>
                      </SelectBase>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="rounded-2xl bg-accent-500 px-6 py-4 text-sm font-black text-zinc-950 hover:bg-accent-400"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="mt-8 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel>Quando deseja iniciar?</FieldLabel>
                        <InputBase
                          value={form.start_date}
                          onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))}
                          type="date"
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>Qual tamanho da empresa?</FieldLabel>
                        <SelectBase
                          value={form.company_size}
                          onChange={(e) => setForm((s) => ({ ...s, company_size: e.target.value }))}
                        >
                          <option value="">Selecione</option>
                          <option value="1-5">1-5 pessoas</option>
                          <option value="6-20">6-20 pessoas</option>
                          <option value="21-50">21-50 pessoas</option>
                          <option value="51-200">51-200 pessoas</option>
                          <option value="200+">200+ pessoas</option>
                        </SelectBase>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Sobre o projeto</FieldLabel>
                      <TextAreaBase
                        value={form.description}
                        onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                        placeholder="Descreva o que voce precisa..."
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Qual o objetivo com essa solucao?</FieldLabel>
                      <TextAreaBase
                        value={form.objective}
                        onChange={(e) => setForm((s) => ({ ...s, objective: e.target.value }))}
                        placeholder="Ex.: centralizar informacoes, reduzir erros, ganhar velocidade, controlar financeiro..."
                        className="min-h-[96px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Ja possui sistema?</FieldLabel>
                      <Segmented
                        value={form.has_system === null ? "" : form.has_system ? "yes" : "no"}
                        onChange={(v) => setForm((s) => ({ ...s, has_system: v === "yes" }))}
                        options={[
                          { value: "yes", label: "Sim", hint: "Tem ERP/CRM/Sistema rodando" },
                          { value: "no", label: "Nao", hint: "Tudo na mao / planilhas" }
                        ]}
                      />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-6 py-4 text-sm font-black text-zinc-100 hover:bg-zinc-900"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="rounded-2xl bg-accent-500 px-6 py-4 text-sm font-black text-zinc-950 hover:bg-accent-400"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="mt-8 space-y-6">
                    {dataQuestionsEnabled ? (
                      <>
                        <div className="space-y-2">
                          <FieldLabel>Onde estao seus dados hoje?</FieldLabel>
                          <SelectBase
                            value={form.data_location}
                            onChange={(e) => setForm((s) => ({ ...s, data_location: e.target.value as DataLocation }))}
                          >
                            <option value="">Selecione</option>
                            <option value="excel">Excel/Planilhas</option>
                            <option value="database">Banco de Dados (SQL Server, MySQL)</option>
                            <option value="erp">Sistema ERP</option>
                            <option value="api">API / Sistema online</option>
                            <option value="unknown">Nao sei / nao organizado</option>
                          </SelectBase>
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>Como os dados podem ser acessados?</FieldLabel>
                          <SelectBase
                            value={form.data_access}
                            onChange={(e) => setForm((s) => ({ ...s, data_access: e.target.value as DataAccess }))}
                          >
                            <option value="">Selecione</option>
                            <option value="direct_db">Acesso direto ao banco de dados</option>
                            <option value="export">Exportacao (Excel/CSV)</option>
                            <option value="api">API</option>
                            <option value="integration">Integracao com sistema existente</option>
                            <option value="unknown">Nao sei</option>
                          </SelectBase>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <FieldLabel>Frequencia de atualizacao</FieldLabel>
                            <SelectBase
                              value={form.update_frequency}
                              onChange={(e) =>
                                setForm((s) => ({ ...s, update_frequency: e.target.value as UpdateFrequency }))
                              }
                            >
                              <option value="">Selecione</option>
                              <option value="real_time">Tempo Real</option>
                              <option value="hourly">A cada hora</option>
                              <option value="daily">Diario</option>
                              <option value="manual">Manual</option>
                            </SelectBase>
                          </div>
                          <div className="space-y-2">
                            <FieldLabel>Estrutura dos dados</FieldLabel>
                            <SelectBase
                              value={form.data_structure}
                              onChange={(e) =>
                                setForm((s) => ({ ...s, data_structure: e.target.value as DataStructure }))
                              }
                            >
                              <option value="">Selecione</option>
                              <option value="structured">Sim, bem estruturados</option>
                              <option value="partial">Parcialmente</option>
                              <option value="not_organized">Nao, precisa organizar</option>
                            </SelectBase>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
                        <p className="text-sm font-black text-white">Formulario inteligente</p>
                        <p className="mt-2 text-sm leading-7 text-zinc-300">
                          Como voce selecionou <span className="font-black">Landing Page</span>, vamos focar no essencial
                          para acelerar o orcamento e a entrega.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <FieldLabel>Faixa de investimento (R$)</FieldLabel>
                      <SelectBase
                        value={form.budget_range}
                        onChange={(e) => setForm((s) => ({ ...s, budget_range: e.target.value }))}
                      >
                        <option value="">Selecione</option>
                        <option value="Até 2.000">Ate 2.000</option>
                        <option value="De 2.000 a 5.000">De 2.000 a 5.000</option>
                        <option value="De 5.000 a 10.000">De 5.000 a 10.000</option>
                        <option value="Acima de 10.000">Acima de 10.000</option>
                      </SelectBase>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>Precisa de ajuda para organizar os dados antes?</FieldLabel>
                      <Segmented
                        value={form.needs_data_help === null ? "" : form.needs_data_help ? "yes" : "no"}
                        onChange={(v) => setForm((s) => ({ ...s, needs_data_help: v === "yes" }))}
                        options={[
                          { value: "yes", label: "Sim", hint: "Podemos organizar e padronizar antes" },
                          { value: "no", label: "Nao", hint: "Ja esta ok, pode implementar direto" }
                        ]}
                      />
                    </div>

                    {error ? (
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
                        {error}
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-6 py-4 text-sm font-black text-zinc-100 hover:bg-zinc-900"
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          disabled={!requiredOk || loading}
                          onClick={onSubmit}
                          className={[
                            "rounded-2xl px-6 py-4 text-sm font-black transition",
                            requiredOk && !loading
                              ? "bg-accent-500 text-zinc-950 hover:bg-accent-400"
                              : "cursor-not-allowed bg-zinc-800 text-zinc-400"
                          ].join(" ")}
                        >
                          {loading ? "Enviando..." : "Enviar e solicitar contato"}
                        </button>
                      </div>
                      <label className="flex items-center gap-3 text-xs font-semibold text-zinc-400">
                        <input
                          type="checkbox"
                          checked={autoWhatsApp}
                          onChange={(e) => setAutoWhatsApp(e.target.checked)}
                          className="h-4 w-4 accent-[rgb(223_152_48)]"
                        />
                        Enviar resumo automaticamente no WhatsApp
                      </label>
                    </div>
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="mt-8 space-y-6">
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6">
                      <p className="text-sm font-black text-white">Tudo certo.</p>
                      <p className="mt-2 text-sm leading-7 text-zinc-300">
                        {successMessage || "Recebemos suas informacoes. Retornaremos seu contato."}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <TempPill temperature={resultTemp} score={resultScore} />
                        {whatsMessage ? (
                          <a
                            href={formatWhatsAppLink(whatsMessage)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl bg-zinc-950 px-6 py-3 text-sm font-black text-white hover:bg-zinc-900"
                          >
                            Enviar resumo no WhatsApp
                          </a>
                        ) : null}
                        <Link
                          href="/"
                          className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-6 py-3 text-sm font-black text-zinc-100 hover:bg-zinc-900"
                        >
                          Voltar para o inicio
                        </Link>
                      </div>
                    </div>

                    {whatsMessage ? (
                      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">
                          Resumo do cliente (WhatsApp)
                        </p>
                        <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-xs font-semibold text-zinc-200">
                          {whatsMessage}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="sticky top-6 space-y-4">
              <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40">
                <div className="relative p-6">
                  <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl" />
                  <p className="relative text-xs font-black uppercase tracking-[0.22em] text-zinc-300">
                    Preview do lead
                  </p>
                  <div className="relative mt-4 space-y-2 text-sm">
                    <p className="font-black text-white">{form.name || "Seu nome"}</p>
                    <p className="text-zinc-300">{form.company || "Sua empresa"}</p>
                    <p className="text-zinc-400">{form.email || "voce@empresa.com"}</p>
                    <p className="text-zinc-400">{form.whatsapp || "(00) 00000-0000"}</p>
                  </div>
                  <div className="relative mt-5 flex flex-wrap items-center gap-2">
                    <TempPill temperature={scorePreview.temperature} score={scorePreview.score} />
                    <span className="rounded-full border border-zinc-800 bg-zinc-950/50 px-3 py-1 text-xs font-black text-zinc-200">
                      {form.solution ? `Solução: ${form.solution}` : "Selecione a solução"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">O que acontece ao enviar</p>
                <div className="mt-4 space-y-3 text-sm text-zinc-300">
                  <p className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-accent-300">
                      ✓
                    </span>
                    Integra no CRM automaticamente (Lead criado no painel).
                  </p>
                  <p className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-accent-300">
                      ✓
                    </span>
                    Resumo pronto para enviar no WhatsApp com 1 clique.
                  </p>
                  <p className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-accent-300">
                      ✓
                    </span>
                    Score do lead (quente/morno/frio) para priorizar atendimento.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">Dicas</p>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  Se voce selecionar <span className="font-black text-zinc-200">Power BI</span>, o formulario pede
                  detalhes de dados/acesso para acelerar a proposta e estimativa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
