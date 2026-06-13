"use client";

import { useState, useTransition } from "react";
import { updateUserRole, sendPasswordReset, toggleBlockUser, deleteUser, createUser } from "@/app/admin/actions";

type Role = "user" | "client" | "admin";

interface UserRow {
  id: string;
  email: string | null;
  role: Role;
  created_at: string;
  screens_count: number;
  blocked: boolean;
}

const ROLE_STYLES: Record<Role, string> = {
  admin:  "border-black/10 bg-[#C8F15A] text-[#141414]",
  client: "border-black/10 bg-[#141414] text-white",
  user:   "border-black/8 bg-white text-[#888880]",
};
const ROLE_LABELS: Record<Role, string> = { admin: "Admin", client: "Payant", user: "Gratuit" };

function IconBtn({ onClick, title, disabled, children, danger }: {
  onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`w-8 h-8 rounded-lg border grid place-items-center text-sm transition-colors disabled:opacity-30 ${
        danger
          ? "border-red-200 bg-red-50 text-red-400 hover:bg-red-100"
          : "border-black/8 bg-white text-[#888880] hover:bg-black/5 hover:text-[#141414]"
      }`}>
      {children}
    </button>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try { await createUser(email, password, role); onClose(); }
      catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-[#EDEAE4] p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-black text-[#141414]">Ajouter un utilisateur</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#888880] uppercase tracking-wide mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#141414] outline-none focus:border-black/25"
              placeholder="email@exemple.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#888880] uppercase tracking-wide mb-1">Mot de passe</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#141414] outline-none focus:border-black/25"
              placeholder="6 caractères minimum" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#888880] uppercase tracking-wide mb-1">Rôle</label>
            <select value={role} onChange={e => setRole(e.target.value as Role)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-[#141414] outline-none">
              <option value="user">Gratuit</option>
              <option value="client">Payant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button type="submit" disabled={pending}
              className="flex-1 rounded-xl bg-[#C8F15A] py-2.5 text-sm font-black text-[#141414] hover:bg-[#B8E048] disabled:opacity-50">
              {pending ? "Création…" : "Créer →"}
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

export default function AdminUserTable({ users }: { users: UserRow[] }) {
  const [rows, setRows] = useState(users);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function flash(id: string, msg: string) {
    setFeedback({ id, msg });
    setTimeout(() => setFeedback(null), 2500);
  }

  function handleRoleChange(userId: string, role: Role) {
    setRows(r => r.map(u => u.id === userId ? { ...u, role } : u));
    startTransition(() => updateUserRole(userId, role));
  }

  function handlePasswordReset(userId: string, email: string | null) {
    if (!email) return;
    startTransition(async () => { await sendPasswordReset(email); flash(userId, "Email envoyé ✓"); });
  }

  function handleToggleBlock(userId: string, blocked: boolean) {
    setRows(r => r.map(u => u.id === userId ? { ...u, blocked: !blocked } : u));
    startTransition(() => toggleBlockUser(userId, !blocked));
  }

  function handleDelete(userId: string) {
    startTransition(async () => {
      await deleteUser(userId);
      setRows(r => r.filter(u => u.id !== userId));
      setConfirmDelete(null);
    });
  }

  return (
    <>
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-wide text-[#888880]">
          {rows.length} utilisateur{rows.length !== 1 ? "s" : ""}
        </h2>
        <button onClick={() => setShowCreate(true)}
          className="text-xs text-[#888880] hover:text-[#141414] transition-colors underline underline-offset-2">
          + Ajouter manuellement
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/8 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/6 bg-black/2">
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-[#888880]">Utilisateur</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-[#888880]">Rôle</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-[#888880]">Statut</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-[#888880]">Écrans</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-[#888880]">Inscrit le</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-[#888880]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/4">
            {rows.map(u => (
              <tr key={u.id} className={`transition-colors ${u.blocked ? "bg-red-50/50" : "hover:bg-black/1"}`}>
                <td className="px-4 py-3.5">
                  <span className={`font-medium ${u.blocked ? "text-black/30 line-through" : "text-[#141414]"}`}>
                    {u.email ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <select value={u.role} disabled={pending}
                    onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                    className={`rounded-full border px-3 py-1 text-xs font-bold cursor-pointer outline-none ${ROLE_STYLES[u.role]}`}>
                    <option value="user">Gratuit</option>
                    <option value="client">Payant</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
                    u.blocked ? "border-red-200 bg-red-50 text-red-500" : "border-green-200 bg-green-50 text-green-600"
                  }`}>
                    {u.blocked ? "Bloqué" : "Actif"}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[#888880]">{u.screens_count}</td>
                <td className="px-4 py-3.5 text-xs text-[#888880]">
                  {new Date(u.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3.5">
                  {confirmDelete === u.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-500">Confirmer ?</span>
                      <button onClick={() => handleDelete(u.id)} disabled={pending} className="text-xs font-bold text-red-500 hover:text-red-700">Oui</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-[#888880] hover:text-[#141414]">Non</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {feedback?.id === u.id ? (
                        <span className="text-xs text-green-600">{feedback.msg}</span>
                      ) : (
                        <>
                          <IconBtn onClick={() => handlePasswordReset(u.id, u.email)} title="Réinitialiser le mot de passe" disabled={pending}>✉</IconBtn>
                          <IconBtn onClick={() => handleToggleBlock(u.id, u.blocked)} title={u.blocked ? "Débloquer" : "Bloquer"} disabled={pending}>
                            {u.blocked ? "🔓" : "🔒"}
                          </IconBtn>
                          <IconBtn onClick={() => setConfirmDelete(u.id)} title="Supprimer" disabled={pending} danger>✕</IconBtn>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="py-16 text-center text-sm text-[#888880]">Aucun utilisateur</div>}
      </div>
    </>
  );
}
