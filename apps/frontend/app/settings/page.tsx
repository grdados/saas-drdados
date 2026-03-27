"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/AdminShell";
import { getAccessToken } from "@/lib/auth";
import {
  createBackupArchive,
  downloadBackupArchive,
  getBackupSchedule,
  getMe,
  isApiError,
  listBackupArchives,
  restoreBackupArchive,
  type BackupArchive,
  type BackupSchedule,
  updateBackupSchedule
} from "@/lib/api";

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function formatDateTime(value?: string | null) {
  if (!value) return "Ainda nao executado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SettingsPage() {
  const [me, setMe] = useState<{ name: string; email: string; company?: string; avatarUrl?: string }>({
    name: "Usuario",
    email: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [archives, setArchives] = useState<BackupArchive[]>([]);
  const [archivesLoading, setArchivesLoading] = useState(true);
  const [schedule, setSchedule] = useState<BackupSchedule>({
    enabled: false,
    frequency: "daily",
    weekday: 0,
    run_hour: 2,
    run_minute: 0,
    keep_last_n: 10,
    last_run_at: null,
    next_run_at: null
  });
  const [backupLoading, setBackupLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [activeArchiveId, setActiveArchiveId] = useState<number | null>(null);
  const [backupMessage, setBackupMessage] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    Promise.all([getMe(token), listBackupArchives(token), getBackupSchedule(token)])
      .then(([u, archiveList, scheduleResponse]) => {
        const url = ((u as unknown as { profile?: { avatar_url?: string } }).profile?.avatar_url as string) ?? "";
        setMe({ name: u.name, email: u.email, company: (u.company?.name as string) ?? "", avatarUrl: url });
        setArchives(archiveList);
        setSchedule(scheduleResponse);
      })
      .catch((err) => {
        if (isApiError(err) && err.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Falha ao carregar.");
      })
      .finally(() => {
        setLoading(false);
        setArchivesLoading(false);
      });
  }, []);

  async function refreshArchives() {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setArchivesLoading(true);
    try {
      const archiveList = await listBackupArchives(token);
      setArchives(archiveList);
    } finally {
      setArchivesLoading(false);
    }
  }

  async function handleCreateBackup() {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setBackupLoading(true);
    setBackupMessage("");
    try {
      const archive = await createBackupArchive(token);
      setArchives((current) => [archive, ...current.filter((item) => item.id !== archive.id)]);
      setBackupMessage(`Backup gerado com sucesso: ${archive.filename}`);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setBackupMessage(err instanceof Error ? err.message : "Falha ao gerar backup.");
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleDownloadBackup(archiveId: number) {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setActiveArchiveId(archiveId);
    setBackupMessage("");
    try {
      const { blob, filename } = await downloadBackupArchive(token, archiveId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setBackupMessage(`Download concluido: ${filename}`);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setBackupMessage(err instanceof Error ? err.message : "Falha ao baixar backup.");
    } finally {
      setActiveArchiveId(null);
    }
  }

  async function handleRestoreBackup(archive: BackupArchive) {
    const confirmed = window.confirm(
      `Restaurar o backup ${archive.filename}? Esta acao substitui os dados atuais da empresa por esse snapshot.`
    );
    if (!confirmed) return;

    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setActiveArchiveId(archive.id);
    setBackupMessage("");
    try {
      const restored = await restoreBackupArchive(token, archive.id);
      setArchives((current) => current.map((item) => (item.id === restored.id ? restored : item)));
      setBackupMessage(`Restauracao concluida: ${restored.filename}`);
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setBackupMessage(err instanceof Error ? err.message : "Falha ao restaurar backup.");
    } finally {
      setActiveArchiveId(null);
    }
  }

  async function handleScheduleSave() {
    const token = getAccessToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setScheduleSaving(true);
    setBackupMessage("");
    try {
      const nextSchedule = await updateBackupSchedule(token, schedule);
      setSchedule(nextSchedule);
      setBackupMessage("Agenda de backup atualizada com sucesso.");
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setBackupMessage(err instanceof Error ? err.message : "Falha ao salvar agenda.");
    } finally {
      setScheduleSaving(false);
    }
  }

  return (
    <AdminShell user={me}>
      <section className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Advanced</p>
          <h1 className="mt-1 text-3xl font-black text-white">Configuracoes</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-300">
            Painel de backup da empresa com geracao manual, historico, restauracao segura e agenda automatica.
          </p>
        </div>

        {loading ? <p className="text-sm font-semibold text-zinc-300">Carregando...</p> : null}
        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <p className="text-sm font-black text-white">Tema</p>
            <p className="mt-2 text-sm text-zinc-300">Padrao GR Dados (dark).</p>
            <p className="mt-1 text-xs text-zinc-500">No proximo passo, adicionamos selecao de tema e preferencias.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <p className="text-sm font-black text-white">Execucao automatica</p>
            <p className="mt-2 text-sm text-zinc-300">
              Para o backup agendado funcionar em producao, rode o comando de agenda no servidor.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Comando sugerido: <code>python manage.py run_backup_schedules</code> via cron, scheduler ou worker.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">Backup da base</p>
                <p className="mt-2 text-sm text-zinc-300">
                  Gera um arquivo <code>.zip</code> com manifesto, metadados e checksum SHA-256 do payload.
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  O backup e restrito a empresa autenticada, preservando o isolamento multiempresa.
                </p>
              </div>

              <button
                disabled={backupLoading}
                onClick={() => void handleCreateBackup()}
                className="rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:opacity-60"
              >
                {backupLoading ? "Gerando backup..." : "Gerar backup agora"}
              </button>
            </div>

            {backupMessage ? <p className="mt-4 text-sm font-semibold text-zinc-300">{backupMessage}</p> : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">Historico de backups</p>
                <p className="mt-1 text-xs text-zinc-500">Baixe, confira checksums e restaure snapshots anteriores.</p>
              </div>
              <button
                onClick={() => void refreshArchives()}
                className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-black text-zinc-200 hover:border-white/20 hover:bg-white/5"
              >
                Atualizar lista
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {archivesLoading ? <p className="text-sm font-semibold text-zinc-300">Carregando historico...</p> : null}

              {!archivesLoading && archives.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-400">
                  Nenhum backup encontrado ainda.
                </div>
              ) : null}

              {archives.map((archive) => {
                const sectionCount = Object.values(archive.manifest?.section_counts ?? {}).reduce(
                  (total, count) => total + count,
                  0
                );
                const busy = activeArchiveId === archive.id;

                return (
                  <div
                    key={archive.id}
                    className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{archive.filename}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {archive.source === "scheduled" ? "Agendado" : "Manual"} • {formatDateTime(archive.created_at)} •{" "}
                          {formatFileSize(archive.file_size)}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          Manifesto v{archive.manifest?.version ?? 1} • {sectionCount} registros exportados
                        </p>
                        <p className="mt-1 break-all text-[11px] text-zinc-500">SHA arquivo: {archive.checksum_sha256}</p>
                        <p className="mt-1 break-all text-[11px] text-zinc-500">
                          SHA payload: {archive.payload_checksum_sha256}
                        </p>
                        <p className="mt-2 text-xs text-zinc-400">
                          Restauracoes: {archive.restore_count} • Ultimo status: {archive.latest_restore_status}
                        </p>
                        {archive.latest_restore_message ? (
                          <p className="mt-1 text-xs text-zinc-500">{archive.latest_restore_message}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={busy}
                          onClick={() => void handleDownloadBackup(archive.id)}
                          className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-black text-zinc-100 hover:border-white/20 hover:bg-white/5 disabled:opacity-60"
                        >
                          {busy ? "Processando..." : "Baixar zip"}
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => void handleRestoreBackup(archive)}
                          className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-zinc-950 hover:bg-zinc-100 disabled:opacity-60"
                        >
                          Restaurar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
            <p className="text-sm font-black text-white">Agenda automatica</p>
            <p className="mt-2 text-sm text-zinc-300">
              Configure backups diarios ou semanais e mantenha apenas os snapshots mais recentes.
            </p>

            <div className="mt-5 space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950/20 px-4 py-3">
                <span>
                  <span className="block text-sm font-black text-white">Ativar agenda</span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Quando ativa, o sistema calcula a proxima execucao automaticamente.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={(event) => setSchedule((current) => ({ ...current, enabled: event.target.checked }))}
                  className="h-5 w-5 rounded border-white/20 bg-zinc-950 text-accent-500"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Frequencia</span>
                  <select
                    value={schedule.frequency}
                    onChange={(event) =>
                      setSchedule((current) => ({
                        ...current,
                        frequency: event.target.value as BackupSchedule["frequency"]
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm font-semibold text-white outline-none"
                  >
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Guardar ultimos</span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={schedule.keep_last_n}
                    onChange={(event) =>
                      setSchedule((current) => ({
                        ...current,
                        keep_last_n: Number(event.target.value || 1)
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm font-semibold text-white outline-none"
                  />
                </label>
              </div>

              {schedule.frequency === "weekly" ? (
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Dia da semana</span>
                  <select
                    value={schedule.weekday}
                    onChange={(event) =>
                      setSchedule((current) => ({
                        ...current,
                        weekday: Number(event.target.value)
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm font-semibold text-white outline-none"
                  >
                    {weekdayLabels.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Hora</span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={schedule.run_hour}
                    onChange={(event) =>
                      setSchedule((current) => ({
                        ...current,
                        run_hour: Number(event.target.value || 0)
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm font-semibold text-white outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Minuto</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={schedule.run_minute}
                    onChange={(event) =>
                      setSchedule((current) => ({
                        ...current,
                        run_minute: Number(event.target.value || 0)
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm font-semibold text-white outline-none"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950/20 px-4 py-3 text-xs text-zinc-400">
                <p>Ultima execucao: {formatDateTime(schedule.last_run_at)}</p>
                <p className="mt-1">Proxima execucao: {formatDateTime(schedule.next_run_at)}</p>
              </div>

              <button
                disabled={scheduleSaving}
                onClick={() => void handleScheduleSave()}
                className="w-full rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-zinc-950 hover:bg-accent-400 disabled:opacity-60"
              >
                {scheduleSaving ? "Salvando agenda..." : "Salvar agenda"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
