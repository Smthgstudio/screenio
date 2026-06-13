"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  id: string;
  name: string;
  updatedAt: string;
}

export default function ScreenCard({ id, name, updatedAt }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    await supabase.from("screens").delete().eq("id", id);
    router.refresh();
  }

  function handleCopyBroadcast(e: React.MouseEvent) {
    e.preventDefault();
    const url = `${window.location.origin}/broadcast/screen/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border border-black/8 bg-white p-5 transition-all hover:border-black/20 hover:shadow-sm">
      <Link href={`/screen/${id}`} className="flex flex-col gap-3">
        <div className="aspect-video w-full rounded-xl border border-black/6 bg-[#EDEAE4] grid place-items-center">
          <span className="text-2xl opacity-20">⬜</span>
        </div>
        <div>
          <p className="font-bold text-[#141414]">{name}</p>
          <p className="mt-0.5 text-xs text-[#888880]">
            Modifié le {new Date(updatedAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-black/6">
        <button
          onClick={handleCopyBroadcast}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors flex-1 justify-center ${
            copied
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-black/8 bg-[#EDEAE4] text-[#888880] hover:text-[#141414]"
          }`}>
          {copied ? "Copié ✓" : "📡 Copier l'URL"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          onBlur={() => setTimeout(() => setConfirm(false), 200)}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            confirm
              ? "border-red-200 bg-red-50 text-red-500"
              : "border-black/8 bg-white text-[#888880] hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          }`}>
          {deleting ? "…" : confirm ? "Confirmer ?" : "Supprimer"}
        </button>
      </div>
    </div>
  );
}
