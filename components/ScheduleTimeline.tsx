"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { addSchedule, updateSchedule, deleteSchedule } from "@/app/folders/[id]/actions";
import Link from "next/link";

// ── Constants ──────────────────────────────────────────────────────────────────
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0..24
const TOTAL_MINUTES = 24 * 60;
const SNAP_MINUTES = 15;
const ROW_HEIGHT = 56; // px

const BLOCK_COLORS = [
  { bg: "bg-violet-500", border: "border-violet-400", text: "text-white", light: "bg-violet-100 border-violet-300 text-violet-700" },
  { bg: "bg-blue-500",   border: "border-blue-400",   text: "text-white", light: "bg-blue-100 border-blue-300 text-blue-700" },
  { bg: "bg-cyan-500",   border: "border-cyan-400",   text: "text-white", light: "bg-cyan-100 border-cyan-300 text-cyan-700" },
  { bg: "bg-emerald-500",border: "border-emerald-400",text: "text-white", light: "bg-emerald-100 border-emerald-300 text-emerald-700" },
  { bg: "bg-amber-500",  border: "border-amber-400",  text: "text-white", light: "bg-amber-100 border-amber-300 text-amber-700" },
  { bg: "bg-orange-500", border: "border-orange-400", text: "text-white", light: "bg-orange-100 border-orange-300 text-orange-700" },
  { bg: "bg-rose-500",   border: "border-rose-400",   text: "text-white", light: "bg-rose-100 border-rose-300 text-rose-700" },
  { bg: "bg-pink-500",   border: "border-pink-400",   text: "text-white", light: "bg-pink-100 border-pink-300 text-pink-700" },
];

// ── Types ──────────────────────────────────────────────────────────────────────
interface Schedule {
  id: string;
  screen_id: string;
  screen_name: string;
  days: number[];
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
}

interface LocalSchedule extends Schedule {
  startMin: number;
  endMin: number;
}

interface Folder {
  id: string;
  name: string;
  slug: string;
  schedules: Schedule[];
}

interface Screen { id: string; name: string; }

interface DragState {
  type: "move" | "resize";
  scheduleId: string;
  startX: number;
  origStartMin: number;
  origEndMin: number;
  dirty: boolean;
}

interface AddState {
  day: number;
  startMin: number;
  endMin: number;
}

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

function minToDisplay(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}h${min > 0 ? String(min).padStart(2, "0") : ""}`;
}

function snap(m: number): number {
  return Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
}

function toLocal(s: Schedule): LocalSchedule {
  if (s.all_day) return { ...s, startMin: 0, endMin: TOTAL_MINUTES };
  return { ...s, startMin: timeToMin(s.start_time), endMin: timeToMin(s.end_time) };
}

function screenColor(screens: Screen[], screenId: string) {
  const idx = screens.findIndex(s => s.id === screenId);
  return BLOCK_COLORS[(idx < 0 ? 0 : idx) % BLOCK_COLORS.length];
}

// ── Add Modal ──────────────────────────────────────────────────────────────────
function AddModal({ state, folderId, screens, onClose }: {
  state: AddState; folderId: string; screens: Screen[]; onClose: (s?: LocalSchedule) => void;
}) {
  const [screenId, setScreenId] = useState(screens[0]?.id ?? "");
  const [days, setDays] = useState<number[]>([state.day]);
  const [allDay, setAllDay] = useState(false);
  const [startMin, setStartMin] = useState(state.startMin);
  const [endMin, setEndMin] = useState(state.endMin);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: number) {
    setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!screenId || days.length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const id = await addSchedule(
          folderId, screenId, days, allDay,
          allDay ? null : minToTime(startMin),
          allDay ? null : minToTime(endMin),
        );
        const screen = screens.find(s => s.id === screenId);
        onClose(id ? {
          id, screen_id: screenId, screen_name: screen?.name ?? "—",
          days, start_time: minToTime(startMin), end_time: minToTime(endMin),
          all_day: allDay, startMin: allDay ? 0 : startMin, endMin: allDay ? TOTAL_MINUTES : endMin,
        } : undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  const startH = `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`;
  const endH = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-[#EDEAE4] p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-black text-[#141414]">Ajouter un créneau</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#888880] uppercase tracking-wide mb-1.5">Écran</label>
            <select value={screenId} onChange={e => setScreenId(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#141414] outline-none">
              {screens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#888880] uppercase tracking-wide">Jours</label>
              <button type="button" className="text-xs text-[#888880] hover:text-[#141414]"
                onClick={() => setDays(days.length === 7 ? [] : [0,1,2,3,4,5,6])}>
                {days.length === 7 ? "Aucun" : "Tous"}
              </button>
            </div>
            <div className="flex gap-1">
              {DAYS.map((d, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${days.includes(i) ? "bg-[#141414] text-white" : "border border-black/10 bg-white text-[#888880]"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />
              <span className="font-semibold text-[#141414]">Toute la journée</span>
            </label>
            {!allDay && (
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="block text-xs text-[#888880] mb-1">Début</label>
                  <input type="time" value={startH}
                    onChange={e => { const [h,m] = e.target.value.split(":").map(Number); setStartMin(snap(h*60+m)); }}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none" />
                </div>
                <span className="mt-4 text-[#888880]">→</span>
                <div className="flex-1">
                  <label className="block text-xs text-[#888880] mb-1">Fin</label>
                  <input type="time" value={endH}
                    onChange={e => { const [h,m] = e.target.value.split(":").map(Number); setEndMin(snap(h*60+m)); }}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none" />
                </div>
              </div>
            )}
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 mt-1">
            <button type="submit" disabled={pending || days.length === 0}
              className="flex-1 rounded-xl bg-[#C8F15A] py-2.5 text-sm font-black text-[#141414] hover:bg-[#B8E048] disabled:opacity-50">
              {pending ? "Ajout…" : "Ajouter →"}
            </button>
            <button type="button" onClick={() => onClose()}
              className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-[#888880] hover:bg-black/5">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Timeline Block ─────────────────────────────────────────────────────────────
function TimelineBlock({ schedule, dayIndex, color, isSelected, onDragStart, onResizeStart, onClick }: {
  schedule: LocalSchedule;
  dayIndex: number;
  color: typeof BLOCK_COLORS[0];
  isSelected: boolean;
  onDragStart: (e: React.PointerEvent, scheduleId: string) => void;
  onResizeStart: (e: React.PointerEvent, scheduleId: string) => void;
  onClick: (scheduleId: string) => void;
}) {
  const leftPct = (schedule.startMin / TOTAL_MINUTES) * 100;
  const widthPct = Math.max(((schedule.endMin - schedule.startMin) / TOTAL_MINUTES) * 100, 0.5);

  if (!schedule.days.includes(dayIndex)) return null;

  return (
    <div
      className={`absolute top-1.5 bottom-1.5 rounded-xl border flex items-center overflow-hidden select-none cursor-grab active:cursor-grabbing transition-shadow ${color.bg} ${color.border} ${color.text} ${isSelected ? "ring-2 ring-white ring-offset-1 shadow-lg z-10" : "shadow-sm z-0"}`}
      style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 4 }}
      onPointerDown={e => { e.stopPropagation(); onDragStart(e, schedule.id); }}
      onClick={e => { e.stopPropagation(); onClick(schedule.id); }}
    >
      <div className="flex-1 px-2.5 min-w-0">
        <p className="text-xs font-bold truncate leading-none">{schedule.screen_name}</p>
        {widthPct > 5 && (
          <p className="text-[10px] opacity-70 truncate mt-0.5">
            {schedule.all_day ? "Toute la journée" : `${minToDisplay(schedule.startMin)} → ${minToDisplay(schedule.endMin)}`}
          </p>
        )}
      </div>
      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/20 rounded-r-xl flex items-center justify-center"
        onPointerDown={e => { e.stopPropagation(); onResizeStart(e, schedule.id); }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ScheduleTimeline({ folders, screens }: {
  folders: Folder[];
  screens: Screen[];
}) {
  const [activeFolderId, setActiveFolderId] = useState<string>(folders[0]?.id ?? "");
  const [schedulesByFolder, setSchedulesByFolder] = useState<Record<string, LocalSchedule[]>>(
    Object.fromEntries(folders.map(f => [f.id, f.schedules.map(toLocal)]))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addState, setAddState] = useState<AddState | null>(null);
  const [, startTransition] = useTransition();

  const dragRef = useRef<DragState | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const schedulesRef = useRef(schedulesByFolder);
  useEffect(() => { schedulesRef.current = schedulesByFolder; }, [schedulesByFolder]);

  const activeFolder = folders.find(f => f.id === activeFolderId);
  const schedules = schedulesByFolder[activeFolderId] ?? [];

  // ── Pointer handlers ─────────────────────────────────────────────────────────
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const deltaX = e.clientX - drag.startX;
    const deltaMin = snap((deltaX / rect.width) * TOTAL_MINUTES);

    setSchedulesByFolder(prev => {
      const list = prev[activeFolderId] ?? [];
      return {
        ...prev,
        [activeFolderId]: list.map(s => {
          if (s.id !== drag.scheduleId) return s;
          if (drag.type === "move") {
            const dur = drag.origEndMin - drag.origStartMin;
            let newStart = drag.origStartMin + deltaMin;
            newStart = Math.max(0, Math.min(newStart, TOTAL_MINUTES - dur));
            newStart = snap(newStart);
            return { ...s, startMin: newStart, endMin: newStart + dur };
          } else {
            const newEnd = Math.max(drag.origStartMin + SNAP_MINUTES, Math.min(drag.origEndMin + deltaMin, TOTAL_MINUTES));
            return { ...s, endMin: snap(newEnd) };
          }
        }),
      };
    });
  }, [activeFolderId]);

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    if (!drag.dirty) return;

    const list = schedulesRef.current[activeFolderId] ?? [];
    const s = list.find(sc => sc.id === drag.scheduleId);
    if (!s || !activeFolderId) return;

    startTransition(() =>
      updateSchedule(activeFolderId, s.id, s.days, s.all_day, minToTime(s.startMin), minToTime(s.endMin))
    );
  }, [activeFolderId]);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  function startDrag(e: React.PointerEvent, scheduleId: string) {
    const s = schedules.find(sc => sc.id === scheduleId);
    if (!s || s.all_day) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      type: "move", scheduleId,
      startX: e.clientX,
      origStartMin: s.startMin, origEndMin: s.endMin,
      dirty: false,
    };
    // mark dirty on first movement in pointermove — we use a flag
    const onFirst = () => { if (dragRef.current) dragRef.current.dirty = true; };
    window.addEventListener("pointermove", onFirst, { once: true });
    setSelectedId(scheduleId);
  }

  function startResize(e: React.PointerEvent, scheduleId: string) {
    const s = schedules.find(sc => sc.id === scheduleId);
    if (!s || s.all_day) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      type: "resize", scheduleId,
      startX: e.clientX,
      origStartMin: s.startMin, origEndMin: s.endMin,
      dirty: false,
    };
    const onFirst = () => { if (dragRef.current) dragRef.current.dirty = true; };
    window.addEventListener("pointermove", onFirst, { once: true });
    setSelectedId(scheduleId);
  }

  function handleRowClick(e: React.MouseEvent, dayIndex: number) {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rawMin = (x / rect.width) * TOTAL_MINUTES;
    const startMin = Math.min(snap(rawMin), TOTAL_MINUTES - 60);
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
    if (!activeFolderId) return;
    setSchedulesByFolder(prev => ({
      ...prev,
      [activeFolderId]: (prev[activeFolderId] ?? []).filter(s => s.id !== scheduleId),
    }));
    setSelectedId(null);
    startTransition(() => deleteSchedule(activeFolderId, scheduleId));
  }

  const selected = schedules.find(s => s.id === selectedId);
  const selectedColor = selected ? screenColor(screens, selected.screen_id) : null;

  if (folders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-lg font-bold text-[#888880]">Aucun dossier</p>
        <p className="text-sm text-[#888880]/60 max-w-sm">Créez un dossier depuis le Dashboard pour commencer à programmer des diffusions.</p>
        <Link href="/dashboard" className="rounded-xl bg-[#C8F15A] px-5 py-2.5 text-sm font-black text-[#141414] hover:bg-[#B8E048]">
          Aller au Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Add modal */}
      {addState && activeFolderId && (
        <AddModal state={addState} folderId={activeFolderId} screens={screens} onClose={handleAddClose} />
      )}

      {/* Left sidebar */}
      <aside className="w-56 shrink-0 border-r border-black/8 bg-[#EDEAE4] flex flex-col overflow-y-auto">
        {/* Folders */}
        <div className="p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#888880] mb-2 px-1">Dossiers</p>
          <div className="flex flex-col gap-1">
            {folders.map(f => (
              <button key={f.id} onClick={() => { setActiveFolderId(f.id); setSelectedId(null); }}
                className={`text-left rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  f.id === activeFolderId
                    ? "bg-[#141414] text-white font-bold"
                    : "text-[#141414] hover:bg-black/6 font-medium"
                }`}>
                <span className="truncate block">{f.name}</span>
                <span className={`text-[10px] ${f.id === activeFolderId ? "text-white/50" : "text-[#888880]"}`}>
                  {f.schedules.length} créneau{f.schedules.length !== 1 ? "x" : ""}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Screen legend */}
        <div className="p-3 border-t border-black/8 mt-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#888880] mb-2 px-1">Écrans</p>
          <div className="flex flex-col gap-1.5">
            {screens.map((s, i) => {
              const c = BLOCK_COLORS[i % BLOCK_COLORS.length];
              return (
                <div key={s.id} className="flex items-center gap-2 px-1">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.bg}`} />
                  <span className="text-xs text-[#141414] truncate">{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected block info */}
        {selected && selectedColor && (
          <div className="p-3 border-t border-black/8 mt-auto">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#888880] mb-2 px-1">Créneau sélectionné</p>
            <div className={`rounded-xl border p-3 ${selectedColor.light}`}>
              <p className="text-xs font-bold truncate mb-1">{selected.screen_name}</p>
              <p className="text-[11px] opacity-70">
                {selected.days.sort().map(d => DAYS[d]).join(", ")}
              </p>
              <p className="text-[11px] font-mono mt-0.5">
                {selected.all_day ? "Toute la journée" : `${minToDisplay(selected.startMin)} → ${minToDisplay(selected.endMin)}`}
              </p>
            </div>
            <button onClick={() => handleDelete(selected.id)}
              className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-100">
              Supprimer ce créneau
            </button>
          </div>
        )}
      </aside>

      {/* Main timeline area */}
      <div className="flex-1 overflow-auto bg-white">
        {/* Folder header */}
        <div className="sticky top-0 z-20 bg-white border-b border-black/8 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-black text-[#141414]">{activeFolder?.name}</h2>
            <p className="text-xs text-[#888880] mt-0.5">
              URL : <code className="font-mono">/broadcast/{activeFolder?.slug}</code>
            </p>
          </div>
          <button
            onClick={() => setAddState({ day: 0, startMin: 9 * 60, endMin: 10 * 60 })}
            className="rounded-xl bg-[#C8F15A] px-4 py-2 text-sm font-black text-[#141414] hover:bg-[#B8E048]">
            + Créneau
          </button>
        </div>

        {/* Hour axis */}
        <div className="flex border-b border-black/6 bg-[#FAFAF9]">
          <div className="w-14 shrink-0" />
          <div ref={timelineRef} className="flex-1 relative h-7">
            {HOURS.map(h => (
              <div key={h} className="absolute top-0 bottom-0 flex flex-col"
                style={{ left: `${(h / 24) * 100}%` }}>
                <div className="w-px flex-1 bg-black/8" />
                <span className="absolute top-1 left-1 text-[10px] text-[#888880] font-mono">
                  {h < 24 ? `${String(h).padStart(2, "0")}h` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Day rows */}
        {DAYS.map((dayLabel, dayIndex) => {
          const daySchedules = schedules.filter(s => s.days.includes(dayIndex));
          return (
            <div key={dayIndex}
              className={`flex border-b border-black/5 ${dayIndex % 2 === 0 ? "bg-white" : "bg-[#FAFAF9]"}`}
              style={{ height: ROW_HEIGHT }}>
              {/* Day label */}
              <div className="w-14 shrink-0 flex items-center justify-center border-r border-black/5">
                <span className="text-xs font-black text-[#888880]">{dayLabel}</span>
              </div>

              {/* Timeline row */}
              <div className="flex-1 relative cursor-crosshair"
                onClick={e => handleRowClick(e, dayIndex)}>
                {/* Hour grid lines */}
                {HOURS.slice(0, 24).map(h => (
                  <div key={h} className="absolute top-0 bottom-0"
                    style={{ left: `${(h / 24) * 100}%` }}>
                    <div className="w-px h-full bg-black/6" />
                    {h % 6 === 0 && <div className="w-px h-full bg-black/12 absolute top-0" />}
                  </div>
                ))}
                {/* Half-hour lines */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="absolute top-0 bottom-0 w-px bg-black/3"
                    style={{ left: `${((h + 0.5) / 24) * 100}%` }} />
                ))}

                {/* Schedule blocks */}
                {daySchedules.map(s => (
                  <TimelineBlock
                    key={s.id}
                    schedule={s}
                    dayIndex={dayIndex}
                    color={screenColor(screens, s.screen_id)}
                    isSelected={s.id === selectedId}
                    onDragStart={startDrag}
                    onResizeStart={startResize}
                    onClick={setSelectedId}
                  />
                ))}

                {/* Empty hint */}
                {daySchedules.length === 0 && (
                  <div className="absolute inset-0 flex items-center pointer-events-none">
                    <span className="text-[10px] text-black/15 ml-3 select-none">Cliquer pour ajouter</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
