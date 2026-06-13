"use client";

import { useState, useTransition } from "react";
import { createFolder } from "@/app/dashboard/actions";

export default function NewFolderButton() {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("Nouveau dossier");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => createFolder(name.trim() || "Nouveau dossier"));
  }

  if (!showModal) return (
    <button onClick={() => setShowModal(true)}
      className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#141414] hover:bg-black/5">
      + Nouveau dossier
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-[#EDEAE4] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-black text-[#141414]">Créer un dossier</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#141414] outline-none focus:border-black/25" />
          <div className="flex gap-2">
            <button type="submit" disabled={pending}
              className="flex-1 rounded-xl bg-[#C8F15A] py-2.5 text-sm font-black text-[#141414] hover:bg-[#B8E048] disabled:opacity-50">
              {pending ? "Création…" : "Créer →"}
            </button>
            <button type="button" onClick={() => setShowModal(false)}
              className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-[#888880] hover:bg-black/5">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
