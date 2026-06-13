"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// ── Types ───────────────────────────────────────────────────────────────────
type WidgetType = "text" | "image" | "slideshow" | "menu";
type Plan = "free" | "client" | "admin";

interface WidgetData {
  headline?: string;
  text?: string;
  url?: string;
  images?: string[];
  holdMs?: number;
  fadeMs?: number;
  activeIndex?: number;
  items?: string;
}

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  x: number; y: number;
  w: number; h: number;
  data: WidgetData;
  z: number;
}

// ── Constants ───────────────────────────────────────────────────────────────
const COLS = 4;
const ROWS = 3;
const PRO_TYPES: WidgetType[] = ["image", "slideshow", "menu"];

// ── Helpers ─────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function snapGrid(x: number, y: number, w: number, h: number) {
  w = clamp(Math.round(w), 1, COLS);
  h = clamp(Math.round(h), 1, ROWS);
  x = clamp(Math.round(x), 0, COLS - w);
  y = clamp(Math.round(y), 0, ROWS - h);
  return { x, y, w, h };
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: Widget) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function collides(widgets: Widget[], id: string, candidate: { x: number; y: number; w: number; h: number }) {
  return widgets.some(w => w.id !== id && rectsOverlap(candidate, w));
}

function findFirstFit(widgets: Widget[], w: number, h: number) {
  const occ = new Set<string>();
  widgets.forEach(ww => {
    for (let yy = ww.y; yy < ww.y + ww.h; yy++)
      for (let xx = ww.x; xx < ww.x + ww.w; xx++)
        occ.add(`${xx},${yy}`);
  });
  for (let y = 0; y <= ROWS - h; y++)
    for (let x = 0; x <= COLS - w; x++) {
      let ok = true;
      outer: for (let yy = y; yy < y + h; yy++)
        for (let xx = x; xx < x + w; xx++)
          if (occ.has(`${xx},${yy}`)) { ok = false; break outer; }
      if (ok) return { x, y };
    }
  return null;
}

function makeWidget(type: WidgetType, widgets: Widget[], z: number): Widget {
  const base: Widget = { id: uid(), type, title: type, x: 0, y: 0, w: 1, h: 1, data: {}, z };
  if (type === "text")      { base.title = "Message";   base.w = 2; base.h = 1; base.data = { headline: "Bonjour 👋", text: "Offre du jour, info, ou punchline." }; }
  if (type === "image")     { base.title = "Visuel";    base.w = 2; base.h = 2; base.data = { url: "" }; }
  if (type === "slideshow") { base.title = "Slideshow"; base.w = 2; base.h = 2; base.data = { images: [], holdMs: 3000, fadeMs: 700, activeIndex: 0 }; }
  if (type === "menu")      { base.title = "Menu";      base.w = 2; base.h = 2; base.data = { items: "Plat du jour — 12€\nTarte flambée — 9€\nDessert — 5€" }; }
  const spot = findFirstFit(widgets, base.w, base.h);
  if (spot) { base.x = spot.x; base.y = spot.y; }
  return base;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ── Widget body ──────────────────────────────────────────────────────────────
function WidgetBody({ w, slideshowIdx, preview }: { w: Widget; slideshowIdx: number; preview: boolean }) {
  if (w.type === "text") return (
    <div className="p-3">
      <div className="text-[clamp(18px,4vw,42px)] font-black leading-[1.1] tracking-tight">{w.data.headline ?? w.title}</div>
      {w.data.text && <div className="mt-1.5 text-[clamp(10px,1.5vw,14px)] text-white/70">{w.data.text}</div>}
    </div>
  );

  if (w.type === "image") {
    const url = (w.data.url ?? "").trim();
    if (!url && preview) return null;
    return (
      <div className={`absolute ${preview ? "inset-0 rounded-[inherit]" : "inset-2.5 rounded-[14px]"} overflow-hidden`}>
        {url
          ? <img src={url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full grid place-items-center text-xs text-white/40">Aucune image — ouvre ⚙</div>
        }
      </div>
    );
  }

  if (w.type === "slideshow") {
    const images = w.data.images ?? [];
    if (!images.length && preview) return null;
    const idx = images.length ? slideshowIdx % images.length : 0;
    return (
      <div className={`absolute ${preview ? "inset-0 rounded-[inherit]" : "inset-2.5 rounded-[14px]"} overflow-hidden bg-black/12`}>
        {!images.length
          ? <div className="w-full h-full grid place-items-center text-xs text-white/40">Aucune image — ouvre ⚙</div>
          : images.map((src, i) => (
            <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0"}`}>
              <img src={src} alt="" className="w-full h-full object-cover" />
            </div>
          ))
        }
      </div>
    );
  }

  if (w.type === "menu") {
    const lines = (w.data.items ?? "").split("\n").map(s => s.trim()).filter(Boolean);
    if (!lines.length && preview) return null;
    return (
      <div className="p-3">
        <div className="font-black text-[clamp(14px,2vw,18px)] mb-2">{w.title || "Menu"}</div>
        <div className="flex flex-col gap-1.5">
          {lines.slice(0, 12).map((line, i) => (
            <div key={i} className="px-2.5 py-2 rounded-xl border border-white/10 bg-white/4 text-[clamp(10px,1.2vw,13px)]">{line}</div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// ── Config fields ────────────────────────────────────────────────────────────
function TypeConfig({ type, data, onChange }: { type: WidgetType; data: WidgetData; onChange: (d: WidgetData) => void }) {
  if (type === "text") return (
    <>
      <label className="block text-[11px] text-white/55 mb-1">Contenu</label>
      <textarea className="w-full rounded-xl border border-white/10 bg-black/25 text-white px-2.5 py-2 text-xs outline-none min-h-[70px] resize-y"
        value={data.text ?? ""} onChange={e => onChange({ ...data, text: e.target.value })} />
    </>
  );

  if (type === "image") return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="block text-[11px] text-white/55 mb-1">Importer</label>
        <input type="file" accept="image/*" className="text-xs text-white/50 w-full"
          onChange={async e => { const f = e.target.files?.[0]; if (f) onChange({ ...data, url: await fileToDataURL(f) }); }} />
      </div>
      <div>
        <label className="block text-[11px] text-white/55 mb-1">Ou URL</label>
        <input className="w-full rounded-xl border border-white/10 bg-black/25 text-white px-2.5 py-2 text-xs outline-none"
          placeholder="https://…"
          value={data.url?.startsWith("data:") ? "" : (data.url ?? "")}
          onChange={e => onChange({ ...data, url: e.target.value })} />
      </div>
    </div>
  );

  if (type === "slideshow") return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="block text-[11px] text-white/55 mb-1">Ajouter des images</label>
        <input type="file" accept="image/*" multiple className="text-xs text-white/50 w-full"
          onChange={async e => {
            const files = Array.from(e.target.files ?? []);
            if (!files.length) return;
            const urls = await Promise.all(files.map(fileToDataURL));
            onChange({ ...data, images: [...(data.images ?? []), ...urls] });
          }} />
        <p className="text-[11px] text-white/35 mt-1">{(data.images ?? []).length} image(s) chargée(s)</p>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-[11px] text-white/55 mb-1">Durée (ms)</label>
          <input type="number" min="500" step="100" className="w-full rounded-xl border border-white/10 bg-black/25 text-white px-2.5 py-2 text-xs outline-none"
            value={data.holdMs ?? 3000} onChange={e => onChange({ ...data, holdMs: Number(e.target.value) })} />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] text-white/55 mb-1">Fondu (ms)</label>
          <input type="number" min="100" step="50" className="w-full rounded-xl border border-white/10 bg-black/25 text-white px-2.5 py-2 text-xs outline-none"
            value={data.fadeMs ?? 700} onChange={e => onChange({ ...data, fadeMs: Number(e.target.value) })} />
        </div>
      </div>
      {(data.images ?? []).length > 0 && (
        <button className="text-[11px] text-red-400/70 hover:text-red-400 text-left"
          onClick={() => onChange({ ...data, images: [] })}>Supprimer toutes les images</button>
      )}
    </div>
  );

  if (type === "menu") return (
    <>
      <label className="block text-[11px] text-white/55 mb-1">Items (1 par ligne)</label>
      <textarea className="w-full rounded-xl border border-white/10 bg-black/25 text-white px-2.5 py-2 text-xs outline-none min-h-[70px] resize-y"
        value={data.items ?? ""} onChange={e => onChange({ ...data, items: e.target.value })} />
    </>
  );
  return null;
}

// ── WidgetItem ───────────────────────────────────────────────────────────────
interface WidgetItemProps {
  w: Widget;
  selected: boolean;
  preview: boolean;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  allWidgets: Widget[];
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Widget>) => void;
  onDelete: (id: string) => void;
  onFront: (id: string) => void;
}

function WidgetItem({ w, selected, preview, surfaceRef, allWidgets, onSelect, onUpdate, onDelete, onFront }: WidgetItemProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [localTitle, setLocalTitle] = useState(w.title);
  const [localW, setLocalW] = useState(String(w.w));
  const [localH, setLocalH] = useState(String(w.h));
  const [localData, setLocalData] = useState<WidgetData>({ ...w.data });
  const [slideshowIdx, setSlideshowIdx] = useState(w.data.activeIndex ?? 0);

  useEffect(() => { setLocalTitle(w.title); setLocalW(String(w.w)); setLocalH(String(w.h)); setLocalData({ ...w.data }); }, [w]);

  useEffect(() => {
    if (w.type !== "slideshow" || !(w.data.images ?? []).length) return;
    const holdMs = clamp(w.data.holdMs ?? 3000, 500, 600000);
    const t = setInterval(() => setSlideshowIdx(i => i + 1), holdMs);
    return () => clearInterval(t);
  }, [w.type, w.data.images?.length, w.data.holdMs]);

  function cellSize() {
    const r = surfaceRef.current?.getBoundingClientRect();
    return r ? { cw: r.width / COLS, ch: r.height / ROWS } : { cw: 0, ch: 0 };
  }

  // Drag
  const drag = useRef<{ startX: number; startY: number; origX: number; origY: number; cw: number; ch: number } | null>(null);
  function onDragDown(e: React.PointerEvent) {
    if (preview || (e.target as HTMLElement).closest(".resize-h,.config-panel,.iconbtn")) return;
    onSelect(w.id); onFront(w.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { cw, ch } = cellSize();
    drag.current = { startX: e.clientX, startY: e.clientY, origX: w.x, origY: w.y, cw, ch };
  }
  function onDragMove(e: React.PointerEvent) {
    const d = drag.current; if (!d) return;
    const s = snapGrid(d.origX + (e.clientX - d.startX) / d.cw, d.origY + (e.clientY - d.startY) / d.ch, w.w, w.h);
    if (!collides(allWidgets, w.id, s)) onUpdate(w.id, { x: s.x, y: s.y });
  }
  function onDragUp() { drag.current = null; }

  // Resize
  const resize = useRef<{ startX: number; startY: number; origW: number; origH: number; cw: number; ch: number } | null>(null);
  function onResizeDown(e: React.PointerEvent) {
    if (preview) return;
    e.stopPropagation(); e.preventDefault();
    onSelect(w.id); onFront(w.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { cw, ch } = cellSize();
    resize.current = { startX: e.clientX, startY: e.clientY, origW: w.w, origH: w.h, cw, ch };
  }
  function onResizeMove(e: React.PointerEvent) {
    const d = resize.current; if (!d) return;
    const s = snapGrid(w.x, w.y, d.origW + (e.clientX - d.startX) / d.cw, d.origH + (e.clientY - d.startY) / d.ch);
    if (!collides(allWidgets, w.id, { x: w.x, y: w.y, w: s.w, h: s.h })) onUpdate(w.id, { w: s.w, h: s.h });
  }
  function onResizeUp() { resize.current = null; }

  function applyConfig() {
    const nw = clamp(parseInt(localW) || w.w, 1, COLS);
    const nh = clamp(parseInt(localH) || w.h, 1, ROWS);
    const s = snapGrid(w.x, w.y, nw, nh);
    const patch: Partial<Widget> = { title: localTitle, data: { ...localData } };
    if (!collides(allWidgets, w.id, s)) { patch.w = s.w; patch.h = s.h; patch.x = s.x; patch.y = s.y; }
    if (w.type === "text") patch.data = { ...localData, headline: localTitle };
    onUpdate(w.id, patch);
    setConfigOpen(false);
  }

  const isMedia = w.type === "image" || w.type === "slideshow";

  return (
    <div
      className={`absolute touch-none select-none rounded-[18px] overflow-hidden ${
        isMedia
          ? "bg-transparent border-transparent"
          : "bg-white/8 border border-white/12 shadow-[0_6px_20px_rgba(0,0,0,.25)]"
      } ${selected ? "outline outline-2 outline-violet-500/80 shadow-[0_10px_30px_rgba(124,92,255,.18)]" : ""}`}
      style={{
        left: `${(w.x / COLS) * 100}%`,
        top: `${(w.y / ROWS) * 100}%`,
        width: `${(w.w / COLS) * 100}%`,
        height: `${(w.h / ROWS) * 100}%`,
        zIndex: w.z,
      }}
      onPointerDown={onDragDown}
      onPointerMove={e => { onDragMove(e); onResizeMove(e); }}
      onPointerUp={e => { onDragUp(); onResizeUp(); }}
    >
      {/* Header */}
      {!preview && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-black/16 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-1.5 overflow-hidden text-xs font-bold text-white/88 min-w-0">
            <span className="truncate">{w.title || w.type}</span>
            <span className="shrink-0 rounded-full border border-white/14 bg-white/6 px-1.5 py-0.5 text-[10px] text-white/60">{w.type}</span>
          </div>
          <button className="iconbtn shrink-0 w-7 h-7 rounded-[10px] border border-white/14 bg-white/6 text-xs grid place-items-center hover:bg-white/10"
            onClick={e => { e.stopPropagation(); setConfigOpen(o => !o); }}>
            {configOpen ? "✕" : "⚙"}
          </button>
        </div>
      )}

      {/* Body */}
      <div className={`relative overflow-hidden ${preview ? "absolute inset-0" : "absolute top-[44px] inset-x-0 bottom-0"}`}>
        <WidgetBody w={w} slideshowIdx={slideshowIdx} preview={preview} />
      </div>

      {/* Config panel */}
      {configOpen && !preview && (
        <div className="config-panel absolute inset-[54px_10px_10px_10px] rounded-[14px] bg-black/60 border border-white/14 backdrop-blur-[10px] p-3 overflow-auto z-10"
          onPointerDown={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-2 text-[11px] font-black text-white/80">
            <span>Options — {w.type}</span>
            <span className="text-white/35">{w.w}×{w.h}</span>
          </div>
          <div className="flex gap-2 flex-wrap mb-2">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[11px] text-white/55 mb-1">Titre</label>
              <input className="w-full rounded-xl border border-white/10 bg-black/25 text-white px-2.5 py-2 text-xs outline-none"
                value={localTitle} onChange={e => setLocalTitle(e.target.value)} />
            </div>
            <div className="flex gap-1.5">
              <div className="w-14"><label className="block text-[11px] text-white/55 mb-1">Larg.</label>
                <input type="number" min="1" max={COLS} className="w-full rounded-xl border border-white/10 bg-black/25 text-white px-2 py-2 text-xs outline-none"
                  value={localW} onChange={e => setLocalW(e.target.value)} /></div>
              <div className="w-14"><label className="block text-[11px] text-white/55 mb-1">Haut.</label>
                <input type="number" min="1" max={ROWS} className="w-full rounded-xl border border-white/10 bg-black/25 text-white px-2 py-2 text-xs outline-none"
                  value={localH} onChange={e => setLocalH(e.target.value)} /></div>
            </div>
          </div>
          <TypeConfig type={w.type} data={localData} onChange={setLocalData} />
          <div className="flex gap-2 flex-wrap mt-2.5">
            <button className="rounded-xl bg-violet-600/18 border border-violet-500/35 text-white px-3 py-1.5 text-xs font-bold hover:bg-violet-600/30" onClick={applyConfig}>Modifier</button>
            <button className="rounded-xl border border-white/12 bg-white/6 text-white px-3 py-1.5 text-xs hover:bg-white/10" onClick={() => setConfigOpen(false)}>Annuler</button>
            <button className="rounded-xl border border-red-500/35 bg-red-500/14 text-red-400 px-3 py-1.5 text-xs hover:bg-red-500/22" onClick={() => onDelete(w.id)}>Supprimer</button>
          </div>
        </div>
      )}

      {/* Resize handle */}
      {!preview && (
        <div className="resize-h absolute w-[18px] h-[18px] right-2 bottom-2 bg-white/16 border border-white/22 rounded-lg cursor-nwse-resize z-[6]"
          style={{ backgroundImage: "linear-gradient(135deg, transparent 40%, rgba(255,255,255,.55) 40%, rgba(255,255,255,.55) 55%, transparent 55%), linear-gradient(135deg, transparent 60%, rgba(255,255,255,.55) 60%)" }}
          onPointerDown={onResizeDown} onPointerMove={onResizeMove} onPointerUp={onResizeUp} />
      )}
    </div>
  );
}

// ── BentoComposer ────────────────────────────────────────────────────────────
export interface BentoComposerProps {
  screenId: string;
  screenName: string;
  initialLayout: { widgets: Widget[] };
  plan: Plan;
}

export default function BentoComposer({ screenId, screenName, initialLayout, plan }: BentoComposerProps) {
  const supabase = createClient();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [widgets, setWidgets] = useState<Widget[]>(initialLayout.widgets ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zCounter, setZCounter] = useState(() => Math.max(10, ...(initialLayout.widgets ?? []).map(w => w.z ?? 0)) + 1);
  const [preview, setPreview] = useState(false);
  const [name, setName] = useState(screenName);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPro = plan === "client" || plan === "admin";

  const scheduleSave = useCallback((next: Widget[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await supabase.from("screens").update({ layout: { widgets: next } }).eq("id", screenId);
      setSaving(false);
    }, 1000);
  }, [screenId, supabase]);

  function setAndSave(next: Widget[]) { setWidgets(next); scheduleSave(next); }

  function addWidget(type: WidgetType) {
    if (PRO_TYPES.includes(type) && !isPro) return;
    const w = makeWidget(type, widgets, zCounter);
    setZCounter(z => z + 1);
    setAndSave([...widgets, w]);
    setSelectedId(w.id);
  }

  function updateWidget(id: string, patch: Partial<Widget>) {
    setAndSave(widgets.map(w => w.id === id ? { ...w, ...patch } : w));
  }

  function deleteWidget(id: string) {
    const next = widgets.filter(w => w.id !== id);
    setSelectedId(next[0]?.id ?? null);
    setAndSave(next);
  }

  function bringToFront(id: string) {
    const z = zCounter; setZCounter(z + 1);
    updateWidget(id, { z });
  }

  async function saveName(n: string) {
    setName(n);
    await supabase.from("screens").update({ name: n }).eq("id", screenId);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreview(false);
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !preview) {
        const t = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        if (t === "input" || t === "textarea") return;
        deleteWidget(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, selectedId, widgets]);

  const WIDGET_DEFS: { type: WidgetType; label: string; icon: string }[] = [
    { type: "text",      label: "Texte",     icon: "T" },
    { type: "image",     label: "Image",     icon: "🖼" },
    { type: "slideshow", label: "Slideshow", icon: "▶" },
    { type: "menu",      label: "Menu",      icon: "≡" },
  ];

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Preview FAB */}
      {preview && (
        <div className="fixed left-3 top-3 z-[9999] flex items-center gap-2 bg-[#EDEAE4]/90 border border-black/10 rounded-2xl px-3 py-2.5 backdrop-blur-[10px] shadow-sm">
          <button className="rounded-xl bg-[#C8F15A] px-3 py-2 text-xs font-black text-[#141414]" onClick={() => setPreview(false)}>↩ Quitter preview</button>
          <span className="text-xs text-[#888880]">Échap</span>
        </div>
      )}

      {/* Sidebar */}
      {!preview && (
        <aside className="w-[270px] shrink-0 flex flex-col border-r border-black/8 bg-[#EDEAE4] overflow-y-auto">
          <div className="p-4 flex flex-col gap-3">
            <Link href="/dashboard" className="text-xs text-[#888880] hover:text-[#141414]">← Dashboard</Link>
            <input
              className="bg-transparent text-sm font-black text-[#141414] outline-none border-b border-black/10 pb-1 focus:border-black/30"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={e => saveName(e.target.value)}
            />
            <button className="w-full rounded-xl bg-[#C8F15A] py-2.5 text-sm font-black text-[#141414] hover:bg-[#B8E048]"
              onClick={() => setPreview(true)}>👁 Preview</button>

            {/* Widgets */}
            <div className="rounded-2xl bg-white border border-black/8 p-3">
              <h3 className="text-[11px] font-black text-[#888880] uppercase tracking-[.3px] mb-2.5">Widgets</h3>
              <div className="flex flex-wrap gap-2">
                {WIDGET_DEFS.map(({ type, label, icon }) => {
                  const locked = PRO_TYPES.includes(type) && !isPro;
                  return (
                    <button key={type}
                      onClick={() => addWidget(type)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                        locked
                          ? "border-black/8 bg-black/3 text-black/25 cursor-not-allowed"
                          : "border-black/10 bg-[#141414] text-white hover:bg-black"
                      }`}
                      title={locked ? "Disponible en Pro" : `Ajouter ${label}`}>
                      <span>{icon}</span><span>{label}</span>{locked && <span className="text-[10px]">🔒</span>}
                    </button>
                  );
                })}
              </div>
              {!isPro && <p className="mt-2 text-[11px] text-[#888880]">Image, Slideshow et Menu → Plan Pro</p>}
            </div>

            {/* Raccourcis */}
            <div className="rounded-2xl bg-white border border-black/8 p-3">
              <h3 className="text-[11px] font-black text-[#888880] uppercase tracking-[.3px] mb-2">Raccourcis</h3>
              <div className="text-[11px] text-[#888880] flex flex-col gap-1">
                <span><kbd className="font-mono px-1.5 py-0.5 rounded-lg border border-black/10 bg-[#EDEAE4]">Suppr</kbd> supprimer</span>
                <span><kbd className="font-mono px-1.5 py-0.5 rounded-lg border border-black/10 bg-[#EDEAE4]">Échap</kbd> quitter preview</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button className="rounded-xl border border-black/8 bg-white text-[#888880] px-3 py-2 text-xs hover:bg-black/5 hover:text-[#141414]"
                onClick={() => navigator.clipboard.writeText(JSON.stringify({ widgets }, null, 2)).catch(() => {}).then(() => alert("JSON copié !"))}>
                Export JSON
              </button>
              <button className="rounded-xl border border-red-200 bg-red-50 text-red-500 px-3 py-2 text-xs hover:bg-red-100"
                onClick={() => { if (confirm("Reset layout ?")) setAndSave([]); }}>Reset</button>
            </div>
          </div>

          <div className="mt-auto p-4 border-t border-black/8">
            <span className={`text-xs font-medium ${saving ? "text-[#141414]" : "text-[#888880]/40"}`}>
              {saving ? "Sauvegarde…" : "Sauvegardé"}
            </span>
          </div>
        </aside>
      )}

      {/* Canvas */}
      <main className={`flex-1 overflow-auto bg-[#1a1a1a] ${preview ? "p-0" : "p-4"}`}>
        {!preview && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-white/55">
              <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded-lg border border-white/14 bg-black/20 text-white/70">1920×1080</kbd>
              Grille <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded-lg border border-white/14 bg-black/20 text-white/70">4×3</kbd>
              Snap <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded-lg border border-white/14 bg-black/20 text-white/70">ON</kbd>
            </div>
          </div>
        )}

        <div className={preview ? "w-full h-screen" : "rounded-[22px] border border-white/10 bg-white/3 p-3.5 w-[min(1280px,100%)]"}>
          <div
            ref={surfaceRef}
            className={`relative w-full ${preview ? "h-screen" : "aspect-video rounded-[18px] overflow-hidden"}`}
            style={!preview ? {
              background: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02))",
              backgroundImage: `linear-gradient(to right,rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.08) 1px,transparent 1px)`,
              backgroundSize: `${100 / COLS}% ${100 / ROWS}%`,
            } : {}}
            onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}
          >
            {widgets.map(w => (
              <WidgetItem
                key={w.id}
                w={w}
                selected={w.id === selectedId}
                preview={preview}
                surfaceRef={surfaceRef}
                allWidgets={widgets}
                onSelect={setSelectedId}
                onUpdate={updateWidget}
                onDelete={deleteWidget}
                onFront={bringToFront}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
