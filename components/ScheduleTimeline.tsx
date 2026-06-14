"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { addSchedule, updateSchedule, deleteSchedule, splitSchedule } from "@/app/folders/[id]/actions";
import Link from "next/link";

// ── Constants ──────────────────────────────────────────────────────────────────
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const TOTAL_MINUTES = 24 * 60;
const SNAP_MINUTES = 15;
const LABEL_W = 80; // px, day label column width

const COLORS = [
  { bg: "#7C3AED", light: "#EDE9FE", text: "#fff", dark: "#5B21B6" },
  { bg: "#2563EB", light: "#DBEAFE", text: "#fff", dark: "#1D4ED8" },
  { bg: "#0891B2", light: "#CFFAFE", text: "#fff", dark: "#0E7490" },
  { bg: "#059669", light: "#D1FAE5", text: "#fff", dark: "#047857" },
  { bg: "#D97706", light: "#FEF3C7", text: "#fff", dark: "#B45309" },
  { bg: "#DC2626", light: "#FEE2E2", text: "#fff", dark: "#B91C1C" },
  { bg: "#DB2777", light: "#FCE7F3", text: "#fff", dark: "#BE185D" },
  { bg: "#7C3AED", light: "#EDE9FE", text: "#fff", dark: "#5B21B6" },
];

// ── Types ──────────────────────────────────────────────────────────────────────
interface Schedule {
  id: string; screen_id: string; screen_name: string;
  days: number[]; start_time: string | null; end_time: string | null; all_day: boolean;
}
interface LocalSchedule extends Schedule { startMin: number; endMin: number; }
interface Folder { id: string; name: string; slug: string; schedules: Schedule[]; }
interface Screen { id: string; name: string; }
interface DragState {
  type: "move" | "resize"; scheduleId: string;
  dayIndex: number; // which day row was dragged
  startX: number; origStartMin: number; origEndMin: number;
  moved: boolean; // true once pointer has actually moved
}
interface AddState { day: number; startMin: number; endMin: number; }

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeToMin(t: string | null): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function minToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
}
function minToLabel(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}h${min ? String(min).padStart(2, "0") : ""}`;
}
function snapMin(m: number): number {
  return Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
}
function toLocal(s: Schedule): LocalSchedule {
  if (s.all_day) return { ...s, startMin: 0, endMin: TOTAL_MINUTES };
  return { ...s, startMin: timeToMin(s.start_time), endMin: timeToMin(s.end_time) };
}
function colorOf(screens: Screen[], screenId: string) {
  const idx = screens.findIndex(s => s.id === screenId);
  return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
}
function pct(min: number) { return `${(min / TOTAL_MINUTES) * 100}%`; }
function widthPct(start: number, end: number) {
  return `${Math.max(((end - start) / TOTAL_MINUTES) * 100, 0.4)}%`;
}

// ── Add Modal ──────────────────────────────────────────────────────────────────
function AddModal({ state, folderId, screens, onClose }: {
  state: AddState; folderId: string; screens: Screen[];
  onClose: (s?: LocalSchedule) => void;
}) {
  const [screenId, setScreenId] = useState(screens[0]?.id ?? "");
  const [days, setDays] = useState<number[]>([state.day]);
  const [allDay, setAllDay] = useState(false);
  const [startMin, setStartMin] = useState(state.startMin);
  const [endMin, setEndMin] = useState(Math.min(state.endMin, TOTAL_MINUTES));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(d: number) {
    setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d].sort());
  }
  function toHM(m: number) {
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!screenId || days.length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const id = await addSchedule(folderId, screenId, days, allDay,
          allDay ? null : minToTime(startMin), allDay ? null : minToTime(endMin));
        const screen = screens.find(s => s.id === screenId);
        onClose(id ? {
          id, screen_id: screenId, screen_name: screen?.name ?? "—",
          days, start_time: minToTime(startMin), end_time: minToTime(endMin),
          all_day: allDay, startMin: allDay ? 0 : startMin, endMin: allDay ? TOTAL_MINUTES : endMin,
        } : undefined);
      } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-[#EDEAE4] p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-black text-[#141414]">Nouveau créneau</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[#888880] uppercase tracking-wider mb-1.5">Écran</label>
            <select value={screenId} onChange={e => setScreenId(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#141414] outline-none">
              {screens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#888880] uppercase tracking-wider">Jours</label>
              <button type="button" className="text-xs text-[#888880] hover:text-[#141414] underline"
                onClick={() => setDays(days.length === 7 ? [] : [0,1,2,3,4,5,6])}>
                {days.length === 7 ? "Aucun" : "Tous"}
              </button>
            </div>
            <div className="flex gap-1">
              {DAYS_SHORT.map((d, i) => (
                <button key={i} type="button" onClick={() => toggle(i)}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${days.includes(i) ? "bg-[#141414] text-white" : "border border-black/10 bg-white text-[#888880] hover:bg-black/5"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="font-semibold text-[#141414]">Toute la journée</span>
            </label>
            {!allDay && (
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <label className="block text-xs text-[#888880] mb-1">Début</label>
                  <input type="time" value={toHM(startMin)}
                    onChange={e => { const [h,m] = e.target.value.split(":").map(Number); setStartMin(snapMin(h*60+m)); }}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none" />
                </div>
                <span className="mt-4 text-[#888880] font-bold">→</span>
                <div className="flex-1">
                  <label className="block text-xs text-[#888880] mb-1">Fin</label>
                  <input type="time" value={toHM(endMin)}
                    onChange={e => { const [h,m] = e.target.value.split(":").map(Number); setEndMin(snapMin(h*60+m)); }}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none" />
                </div>
              </div>
            )}
          </div>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button type="submit" disabled={pending || days.length === 0}
              className="flex-1 rounded-xl bg-[#C8F15A] py-3 text-sm font-black text-[#141414] hover:bg-[#B8E048] disabled:opacity-50">
              {pending ? "Ajout…" : "Ajouter →"}
            </button>
            <button type="button" onClick={() => onClose()}
              className="rounded-xl border border-black/10 bg-white px-4 text-sm text-[#888880] hover:bg-black/5">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ScheduleTimeline({ folders, screens }: {
  folders: Folder[]; screens: Screen[];
}) {
  const [activeFolderId, setActiveFolderId] = useState(folders[0]?.id ?? "");
  const [schedulesByFolder, setSchedulesByFolder] = useState<Record<string, LocalSchedule[]>>(
    Object.fromEntries(folders.map(f => [f.id, f.schedules.map(toLocal)]))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addState, setAddState] = useState<AddState | null>(null);
  const [, startTransition] = useTransition();

  const dragRef = useRef<DragState | null>(null);
  // One ref per day row for accurate x-position during drag
  const rowRefs = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null));
  const schedulesRef = useRef(schedulesByFolder);
  useEffect(() => { schedulesRef.current = schedulesByFolder; }, [schedulesByFolder]);

  const activeFolder = folders.find(f => f.id === activeFolderId);
  const schedules = schedulesByFolder[activeFolderId] ?? [];

  // ── Pointer events ───────────────────────────────────────────────────────────
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    // Use first row ref for width measurement
    const rowEl = rowRefs.current.find(r => r !== null);
    if (!rowEl) return;
    const rect = rowEl.getBoundingClientRect();
    const deltaX = e.clientX - drag.startX;
    const deltaMin = snapMin((deltaX / rect.width) * TOTAL_MINUTES);

    if (!dragRef.current!.moved) dragRef.current!.moved = true;

    setSchedulesByFolder(prev => {
      const list = prev[activeFolderId] ?? [];
      return {
        ...prev,
        [activeFolderId]: list.map(s => {
          if (s.id !== drag.scheduleId) return s;
          if (drag.type === "move") {
            const dur = drag.origEndMin - drag.origStartMin;
            const newStart = Math.max(0, Math.min(snapMin(drag.origStartMin + deltaMin), TOTAL_MINUTES - dur));
            return { ...s, startMin: newStart, endMin: newStart + dur };
          } else {
            const newEnd = Math.max(drag.origStartMin + SNAP_MINUTES, Math.min(snapMin(drag.origEndMin + deltaMin), TOTAL_MINUTES));
            return { ...s, endMin: newEnd };
          }
        }),
      };
    });
  }, [activeFolderId]);

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !drag.moved) return;

    const list = schedulesRef.current[activeFolderId] ?? [];
    const s = list.find(sc => sc.id === drag.scheduleId);
    if (!s) return;

    const isMultiDay = s.days.length > 1;

    if (isMultiDay) {
      // Detach dragged day into its own independent schedule
      const remainingDays = s.days.filter(d => d !== drag.dayIndex);
      const newStart = minToTime(s.startMin);
      const newEnd = minToTime(s.endMin);

      // Optimistic: update local state immediately
      setSchedulesByFolder(prev => {
        const cur = prev[activeFolderId] ?? [];
        return {
          ...prev,
          [activeFolderId]: cur.map(sc =>
            sc.id === s.id ? { ...sc, days: remainingDays } : sc
          ).concat([{
            ...s,
            id: `temp-${Date.now()}`, // temp id, will be replaced on refresh
            days: [drag.dayIndex],
            start_time: newStart,
            end_time: newEnd,
          }]),
        };
      });

      startTransition(async () => {
        await splitSchedule(activeFolderId, s.id, drag.dayIndex, newStart, newEnd);
      });
    } else {
      // Single day — simple update
      startTransition(() =>
        updateSchedule(activeFolderId, s.id, s.days, s.all_day, minToTime(s.startMin), minToTime(s.endMin))
      );
    }
  }, [activeFolderId]);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  function startDrag(e: React.PointerEvent, scheduleId: string, type: "move" | "resize", dayIndex: number) {
    e.stopPropagation();
    const s = schedules.find(sc => sc.id === scheduleId);
    if (!s || s.all_day) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { type, scheduleId, dayIndex, startX: e.clientX, origStartMin: s.startMin, origEndMin: s.endMin, moved: false };
    setSelectedId(scheduleId);
  }

  function handleRowClick(e: React.MouseEvent, dayIndex: number) {
    const row = rowRefs.current[dayIndex];
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rawMin = (x / rect.width) * TOTAL_MINUTES;
    const startMin = Math.max(0, Math.min(snapMin(rawMin), TOTAL_MINUTES - 60));
    setAddState({ day: dayIndex, startMin, endMin: startMin + 60 });
    setSelectedId(null);
  }

  function handleAddClose(newSchedule?: LocalSchedule) {
    setAddState(null);
    if (newSchedule) {
      setSchedulesByFolder(prev => ({
        ...prev,
        [activeFolderId]: [...(prev[activeFolderId] ?? []), newSchedule],
      }));
    }
  }

  function handleDelete(scheduleId: string) {
    setSchedulesByFolder(prev => ({
      ...prev,
      [activeFolderId]: (prev[activeFolderId] ?? []).filter(s => s.id !== scheduleId),
    }));
    setSelectedId(null);
    startTransition(() => deleteSchedule(activeFolderId, scheduleId));
  }

  const selected = schedules.find(s => s.id === selectedId) ?? null;

  if (folders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-2xl font-black text-[#141414]">Aucun dossier</p>
        <p className="text-sm text-[#888880] max-w-sm">Créez un dossier depuis le Dashboard pour programmer des diffusions.</p>
        <Link href="/dashboard" className="rounded-xl bg-[#C8F15A] px-5 py-2.5 text-sm font-black text-[#141414] hover:bg-[#B8E048]">
          Aller au Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {addState && activeFolderId && (
        <AddModal state={addState} folderId={activeFolderId} screens={screens} onClose={handleAddClose} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 border-r border-black/8 bg-[#EDEAE4] flex flex-col overflow-y-auto">
        {/* Folders */}
        <div className="p-3 border-b border-black/8">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#888880] mb-2 px-1">Dossiers</p>
          <div className="flex flex-col gap-1">
            {folders.map(f => (
              <button key={f.id} onClick={() => { setActiveFolderId(f.id); setSelectedId(null); }}
                className={`text-left rounded-xl px-3 py-2.5 transition-colors ${f.id === activeFolderId ? "bg-[#141414] text-white" : "hover:bg-black/6 text-[#141414]"}`}>
                <p className={`text-sm font-bold truncate`}>{f.name}</p>
                <p className={`text-[10px] mt-0.5 ${f.id === activeFolderId ? "text-white/50" : "text-[#888880]"}`}>
                  {(schedulesByFolder[f.id] ?? []).length} créneau{(schedulesByFolder[f.id] ?? []).length !== 1 ? "x" : ""}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Screen legend */}
        <div className="p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#888880] mb-2 px-1">Écrans</p>
          <div className="flex flex-col gap-2">
            {screens.map((s, i) => {
              const c = COLORS[i % COLORS.length];
              return (
                <div key={s.id} className="flex items-center gap-2 px-1">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.bg }} />
                  <span className="text-xs text-[#141414] truncate font-medium">{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected info */}
        {selected && (
          <div className="p-3 border-t border-black/8 mt-auto">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#888880] mb-2 px-1">Sélectionné</p>
            <div className="rounded-xl border p-3" style={{ background: colorOf(screens, selected.screen_id).light, borderColor: colorOf(screens, selected.screen_id).bg + "40" }}>
              <p className="text-xs font-bold truncate" style={{ color: colorOf(screens, selected.screen_id).dark }}>{selected.screen_name}</p>
              <p className="text-[11px] text-[#555] mt-0.5">{selected.days.map(d => DAYS_SHORT[d]).join(", ")}</p>
              <p className="text-[11px] font-mono mt-0.5 text-[#333]">
                {selected.all_day ? "Toute la journée" : `${minToLabel(selected.startMin)} → ${minToLabel(selected.endMin)}`}
              </p>
            </div>
            <button onClick={() => handleDelete(selected.id)}
              className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-100">
              Supprimer
            </button>
          </div>
        )}
      </aside>

      {/* ── Timeline ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white">
        {/* Folder header + add button */}
        <div className="shrink-0 border-b border-black/8 px-5 py-3 flex items-center justify-between bg-[#FAFAF9]">
          <div>
            <p className="font-black text-[#141414] text-base">{activeFolder?.name}</p>
            <p className="text-xs text-[#888880] font-mono mt-0.5">/broadcast/{activeFolder?.slug}</p>
          </div>
          <button onClick={() => setAddState({ day: 0, startMin: 9 * 60, endMin: 10 * 60 })}
            className="rounded-xl bg-[#C8F15A] px-4 py-2 text-sm font-black text-[#141414] hover:bg-[#B8E048]">
            + Créneau
          </button>
        </div>

        {/* Hour axis */}
        <div className="shrink-0 flex border-b border-black/8 bg-[#F5F4F2]" style={{ height: 28 }}>
          <div style={{ width: LABEL_W }} className="shrink-0 border-r border-black/8" />
          <div className="flex-1 relative">
            {Array.from({ length: 25 }, (_, h) => (
              <div key={h} className="absolute top-0 bottom-0 flex items-center"
                style={{ left: `${(h / 24) * 100}%` }}>
                <div className="w-px h-3 bg-black/15 mt-1" />
                {h < 24 && (
                  <span className="absolute top-1 left-1 text-[9px] text-[#888880] font-mono whitespace-nowrap">
                    {String(h).padStart(2, "0")}h
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Day rows — flex-1 so they fill all remaining height */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {DAYS.map((dayLabel, dayIndex) => {
            const daySchedules = schedules.filter(s => s.days.includes(dayIndex));
            const isWeekend = dayIndex >= 5;
            return (
              <div key={dayIndex}
                className={`flex flex-1 border-b border-black/5 last:border-0 min-h-0 ${isWeekend ? "bg-[#FAFAF9]" : "bg-white"}`}>
                {/* Day label */}
                <div className="shrink-0 border-r border-black/8 flex items-center justify-center"
                  style={{ width: LABEL_W }}>
                  <div className="text-center">
                    <p className="text-xs font-black text-[#888880]">{DAYS_SHORT[dayIndex]}</p>
                    {isWeekend && <p className="text-[9px] text-[#C8B89A] font-medium mt-0.5">WE</p>}
                  </div>
                </div>

                {/* Row content */}
                <div
                  ref={el => { rowRefs.current[dayIndex] = el; }}
                  className="flex-1 relative cursor-crosshair select-none overflow-hidden"
                  onClick={e => handleRowClick(e, dayIndex)}>

                  {/* Hour grid */}
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="absolute top-0 bottom-0" style={{ left: `${(h / 24) * 100}%` }}>
                      <div className={`w-px h-full ${h % 6 === 0 ? "bg-black/12" : h % 3 === 0 ? "bg-black/8" : "bg-black/4"}`} />
                    </div>
                  ))}
                  {/* Half-hour lines */}
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="absolute top-0 bottom-0 w-px bg-black/[0.025]"
                      style={{ left: `${((h + 0.5) / 24) * 100}%` }} />
                  ))}

                  {/* Schedule blocks */}
                  {daySchedules.map(s => {
                    const c = colorOf(screens, s.screen_id);
                    const isSelected = s.id === selectedId;
                    const dur = s.endMin - s.startMin;
                    const narrow = dur < 60;
                    return (
                      <div key={s.id}
                        className={`absolute top-[5px] bottom-[5px] rounded-xl flex items-center overflow-hidden cursor-grab active:cursor-grabbing transition-all select-none ${isSelected ? "z-10 ring-2 ring-white ring-offset-1 shadow-lg" : "z-0 shadow-sm hover:shadow-md hover:brightness-110"}`}
                        style={{ left: pct(s.startMin), width: widthPct(s.startMin, s.endMin), background: c.bg, border: `1px solid ${c.dark}` }}
                        onPointerDown={e => startDrag(e, s.id, "move", dayIndex)}
                        onClick={e => { e.stopPropagation(); setSelectedId(s.id); }}>

                        {/* Content */}
                        <div className="flex-1 min-w-0 px-2.5">
                          <div className="flex items-center gap-1">
                            <p className="text-white font-bold truncate" style={{ fontSize: narrow ? 9 : 11 }}>
                              {s.screen_name}
                            </p>
                            {s.days.length > 1 && !narrow && (
                              <span className="shrink-0 rounded-full bg-white/20 px-1 text-white/80" style={{ fontSize: 8 }}>
                                ×{s.days.length}j
                              </span>
                            )}
                          </div>
                          {!narrow && (
                            <p className="text-white/70 font-mono truncate" style={{ fontSize: 9 }}>
                              {s.all_day ? "Toute la journée" : `${minToLabel(s.startMin)} → ${minToLabel(s.endMin)}`}
                            </p>
                          )}
                        </div>

                        {/* Resize handle */}
                        {!s.all_day && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize hover:bg-white/20 rounded-r-xl"
                            onPointerDown={e => { e.stopPropagation(); startDrag(e, s.id, "resize", dayIndex); }}
                            onClick={e => e.stopPropagation()}>
                            <div className="w-0.5 h-4 rounded-full bg-white/50" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Empty hint */}
                  {daySchedules.length === 0 && (
                    <div className="absolute inset-0 flex items-center pointer-events-none">
                      <span className="text-[10px] text-black/20 ml-4 select-none italic">Cliquer pour ajouter un créneau</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
