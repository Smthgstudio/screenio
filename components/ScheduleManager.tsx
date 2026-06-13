"use client";

import { useState, useTransition } from "react";
import { addSchedule, deleteSchedule, updateFolderName, deleteFolder } from "@/app/folders/[id]/actions";
import { useRouter } from "next/navigation";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-cyan-500", "bg-emerald-500",
  "bg-yellow-500", "bg-orange-500", "bg-rose-500",
];

interface Schedule {
  id: string;
  days: number[];
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  screen_id: string;
  screen_name: string;
}

interface Screen { id: string; name: string; }

function formatTime(t: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

function AddModal({ screens, folderId, onClose }: { screens: Screen[]; folderId: string; onClose: () => void }) {
  const [screenId, setScreenId] = useState(screens[0]?.id ?? "");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [pending, startTransition] = useTransition();

  function toggleDay(d: number) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!screenId || days.length === 0) return;
    startTransition(async () => {
      await addSchedule(folderId, screenId, days, allDay, allDay ? null : startTime + ":00", allDay ? null : endTime + ":00");
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-[#EDEAE4] p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-black text-[#141414]">Ajouter un créneau</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* Screen */}
          <div>
            <label className="block text-xs font-semibold text-[#888880] uppercase tracking-wide mb-1.5">Écran</label>
            <select value={screenId} onChange={e => setScreenId(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#141414] outline-none">
              {screens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Days */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#888880] uppercase tracking-wide">Jours</label>
              <button type="button" className="text-xs text-[#888880] hover:text-[#141414]"
                onClick={() => setDays(days.length === 7 ? [] : [0,1,2,3,4,5,6])}>
                {days.length === 7 ? "Aucun" : "Tous"}
              </button>
            </div>
            <div className="flex gap-1.5">
              {DAYS.map((d, i) => (
                <button key={i} type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                    days.includes(i) ? "bg-[#141414] text-white" : "border border-black/10 bg-white text-[#888880]"
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)}
                className="rounded" />
              <span className="text-sm font-semibold text-[#141414]">Toute la journée</span>
            </label>
            {!allDay && (
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="block text-xs text-[#888880] mb-1">Début</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none" />
                </div>
                <span className="mt-4 text-[#888880]">→</span>
                <div className="flex-1">
                  <label className="block text-xs text-[#888880] mb-1">Fin</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-1">
            <button type="submit" disabled={pending || days.length === 0}
              className="flex-1 rounded-xl bg-[#C8F15A] py-2.5 text-sm font-black text-[#141414] hover:bg-[#B8E048] disabled:opacity-50">
              {pending ? "Ajout…" : "Ajouter →"}
            </button>
            <button type="button" onClick={onClose}
              className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-[#888880] hover:bg-black/5">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ScheduleManager({ folderId, folderName, broadcastUrl, schedules, screens }: {
  folderId: string;
  folderName: string;
  broadcastUrl: string;
  schedules: Schedule[];
  screens: Screen[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(schedules);
  const [name, setName] = useState(folderName);
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete(scheduleId: string) {
    setRows(r => r.filter(s => s.id !== scheduleId));
    startTransition(() => deleteSchedule(folderId, scheduleId));
  }

  function handleCopy() {
    navigator.clipboard.writeText(broadcastUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDeleteFolder() {
    if (!confirm(`Supprimer le dossier "${name}" et tous ses créneaux ?`)) return;
    startTransition(async () => {
      await deleteFolder(folderId);
      router.push("/dashboard");
    });
  }

  // Timeline: 7 day rows × 24 hours
  const HOUR_LABELS = Array.from({ length: 25 }, (_, i) => i);

  function timeToPercent(t: string) {
    const [h, m] = t.split(":").map(Number);
    return ((h * 60 + m) / (24 * 60)) * 100;
  }

  // Group schedules by day
  const byDay: Record<number, Schedule[]> = {};
  for (let d = 0; d < 7; d++) byDay[d] = [];
  rows.forEach(s => s.days.forEach(d => {
    if (byDay[d]) byDay[d].push(s);
  }));

  return (
    <>
      {showAdd && (
        <AddModal screens={screens} folderId={folderId} onClose={() => { setShowAdd(false); router.refresh(); }} />
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <input
            className="bg-transparent text-3xl font-black text-[#141414] outline-none border-b-2 border-transparent focus:border-black/20 pb-0.5 mb-1 w-full max-w-sm"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={e => startTransition(() => updateFolderName(folderId, e.target.value))}
          />
          <p className="text-sm text-[#888880]">{rows.length} créneau{rows.length !== 1 ? "x" : ""} programmé{rows.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#888880]">URL de diffusion</span>
            <button onClick={handleCopy}
              className={`rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors ${copied ? "border-green-200 bg-green-50 text-green-700" : "border-black/10 bg-white text-[#141414] hover:bg-black/5"}`}>
              {copied ? "Copié ✓" : broadcastUrl.replace(/^https?:\/\/[^/]+/, "")}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(true)}
              className="rounded-xl bg-[#C8F15A] px-4 py-2 text-sm font-black text-[#141414] hover:bg-[#B8E048]">
              + Créneau
            </button>
            <button onClick={handleDeleteFolder} disabled={pending}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-500 hover:bg-red-100 disabled:opacity-40">
              Supprimer le dossier
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-black/8 bg-white overflow-hidden">
        <div className="p-4 border-b border-black/6">
          <h2 className="text-xs font-black uppercase tracking-wide text-[#888880]">Programmation — semaine type</h2>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Hour labels */}
            <div className="flex border-b border-black/6">
              <div className="w-14 shrink-0" />
              <div className="flex-1 relative h-6">
                {[0, 6, 12, 18, 24].map(h => (
                  <span key={h} className="absolute top-1 text-[10px] text-[#888880] -translate-x-1/2"
                    style={{ left: `${(h / 24) * 100}%` }}>
                    {String(h).padStart(2, "0")}h
                  </span>
                ))}
              </div>
            </div>

            {/* Day rows */}
            {DAYS.map((day, d) => (
              <div key={d} className={`flex border-b border-black/4 last:border-0 ${d % 2 === 0 ? "bg-white" : "bg-black/[0.015]"}`}>
                <div className="w-14 shrink-0 flex items-center px-3 py-3">
                  <span className="text-xs font-bold text-[#888880]">{day}</span>
                </div>
                <div className="flex-1 relative h-12 my-1.5">
                  {/* Hour grid lines */}
                  {[6, 12, 18].map(h => (
                    <div key={h} className="absolute top-0 bottom-0 w-px bg-black/6"
                      style={{ left: `${(h / 24) * 100}%` }} />
                  ))}

                  {/* Schedule blocks */}
                  {byDay[d].map(s => {
                    const left = s.all_day ? 0 : timeToPercent(s.start_time ?? "00:00:00");
                    const right = s.all_day ? 100 : timeToPercent(s.end_time ?? "24:00:00");
                    const width = right - left;
                    const colorIdx = screens.findIndex(sc => sc.id === s.screen_id) % DAY_COLORS.length;
                    return (
                      <div key={s.id}
                        className={`absolute top-0.5 bottom-0.5 rounded-lg ${DAY_COLORS[colorIdx < 0 ? 0 : colorIdx]} opacity-80 hover:opacity-100 flex items-center px-2 overflow-hidden group transition-opacity`}
                        style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}>
                        <span className="text-white text-[10px] font-bold truncate flex-1">{s.screen_name}</span>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="opacity-0 group-hover:opacity-100 shrink-0 w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 text-white text-[10px] grid place-items-center ml-1 transition-opacity">
                          ✕
                        </button>
                      </div>
                    );
                  })}

                  {byDay[d].length === 0 && (
                    <div className="absolute inset-0 flex items-center">
                      <span className="text-[10px] text-black/20 ml-2">Aucun contenu</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule list */}
      {rows.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-wide text-[#888880] mb-3">Détail des créneaux</h2>
          <div className="flex flex-col gap-2">
            {rows.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-4 rounded-xl border border-black/8 bg-white px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 w-2 h-2 rounded-full ${DAY_COLORS[screens.findIndex(sc => sc.id === s.screen_id) % DAY_COLORS.length] ?? "bg-gray-400"}`} />
                  <span className="font-semibold text-sm text-[#141414] truncate">{s.screen_name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[#888880]">
                    {s.days.sort().map(d => DAYS[d]).join(", ")}
                  </span>
                  <span className="text-xs font-mono text-[#141414]">
                    {s.all_day ? "Toute la journée" : `${formatTime(s.start_time)} → ${formatTime(s.end_time)}`}
                  </span>
                  <button onClick={() => handleDelete(s.id)}
                    className="w-7 h-7 rounded-lg border border-red-200 bg-red-50 text-red-400 text-xs grid place-items-center hover:bg-red-100">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
