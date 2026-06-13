"use client";

import { useState, useEffect } from "react";

type WidgetType = "text" | "image" | "slideshow" | "menu" | "video" | "clock";

interface WidgetData {
  headline?: string;
  text?: string;
  url?: string;
  images?: string[];
  holdMs?: number;
  fadeMs?: number;
  items?: string;
  videoUrl?: string;
  fontFamily?: string;
  showSeconds?: boolean;
  fontSize?: number;
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

const COLS = 4;
const ROWS = 3;

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function ClockWidget({ fontFamily, showSeconds, fontSize }: { fontFamily: string; showSeconds: boolean; fontSize: number }) {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!fontFamily || fontFamily === "Inter") return;
    const id = `gf-${fontFamily.replace(/\s+/g, "-")}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id; link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}&display=swap`;
      document.head.appendChild(link);
    }
  }, [fontFamily]);
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  const ss = String(time.getSeconds()).padStart(2, "0");
  return (
    <div className="w-full h-full flex items-center justify-center p-3">
      <span style={{ fontFamily: `'${fontFamily}', sans-serif`, fontSize: `clamp(24px, ${fontSize / 10}vw, ${fontSize}px)`, lineHeight: 1 }} className="font-bold text-white tabular-nums">
        {hh}:{mm}{showSeconds && <span className="opacity-60">:{ss}</span>}
      </span>
    </div>
  );
}

function SlideshowWidget({ images, holdMs, fadeMs }: { images: string[]; holdMs: number; fadeMs: number }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!images.length) return;
    const t = setInterval(() => setIdx(i => i + 1), clamp(holdMs, 500, 600000));
    return () => clearInterval(t);
  }, [images.length, holdMs]);
  const current = images.length ? idx % images.length : 0;
  return (
    <div className="absolute inset-0 rounded-[inherit] overflow-hidden">
      {images.map((src, i) => (
        <div key={i} className="absolute inset-0 transition-opacity" style={{ opacity: i === current ? 1 : 0, transitionDuration: `${fadeMs}ms` }}>
          <img src={src} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

function WidgetContent({ w }: { w: Widget }) {
  if (w.type === "text") return (
    <div className="p-3">
      <div className="text-[clamp(18px,4vw,42px)] font-black leading-[1.1] tracking-tight">{w.data.headline ?? w.title}</div>
      {w.data.text && <div className="mt-1.5 text-[clamp(10px,1.5vw,14px)] text-white/70">{w.data.text}</div>}
    </div>
  );
  if (w.type === "image") {
    const url = (w.data.url ?? "").trim();
    if (!url) return null;
    return <div className="absolute inset-0 rounded-[inherit] overflow-hidden"><img src={url} alt="" className="w-full h-full object-cover" /></div>;
  }
  if (w.type === "slideshow") {
    const images = w.data.images ?? [];
    if (!images.length) return null;
    return <SlideshowWidget images={images} holdMs={w.data.holdMs ?? 3000} fadeMs={w.data.fadeMs ?? 700} />;
  }
  if (w.type === "menu") {
    const lines = (w.data.items ?? "").split("\n").map(s => s.trim()).filter(Boolean);
    if (!lines.length) return null;
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
  if (w.type === "video") {
    const url = (w.data.videoUrl ?? "").trim();
    if (!url) return null;
    return (
      <div className="absolute inset-0 rounded-[inherit] overflow-hidden bg-black">
        <video src={url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
      </div>
    );
  }
  if (w.type === "clock") {
    return <ClockWidget fontFamily={w.data.fontFamily ?? "Inter"} showSeconds={w.data.showSeconds ?? true} fontSize={w.data.fontSize ?? 48} />;
  }
  return null;
}

export default function BentoDisplay({ widgets }: { widgets: Widget[] }) {
  const isMedia = (type: WidgetType) => type === "image" || type === "slideshow" || type === "video";
  return (
    <div className="relative w-full h-full bg-[#1a1a1a]">
      {widgets.map(w => (
        <div
          key={w.id}
          className={`absolute overflow-hidden rounded-[18px] ${isMedia(w.type) ? "" : "bg-white/8 border border-white/12 shadow-[0_6px_20px_rgba(0,0,0,.25)]"}`}
          style={{
            left: `${(w.x / COLS) * 100}%`,
            top: `${(w.y / ROWS) * 100}%`,
            width: `${(w.w / COLS) * 100}%`,
            height: `${(w.h / ROWS) * 100}%`,
            zIndex: w.z,
          }}
        >
          <WidgetContent w={w} />
        </div>
      ))}
    </div>
  );
}
