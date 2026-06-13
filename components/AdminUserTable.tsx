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

const ROLE_LABELS: Record<Role, string> = { admin: "Admin", client: "Payant", user: "Gratuit" };
const ROLE_STYLES: Record<Role, string> = {
  admin:  "border-violet-500/40 bg-violet-500/15 text-violet-300",
  client: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  user:   "border-white/10 bg-white/5 text-white/50",
};

function IconBtn({ onClick, title, disabled, children, danger }: {
  onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 rounded-lg border grid place-items-center text-sm transition-colors disabled:opacity-40 ${
        danger
          ? "border-red-500/20 bg-red-500/5 text-red-400/60 hover:bg-red-500/15 hover:text-red-400"
          : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80"
      }`}
    >
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
      try {
        await createUser(email, password, role);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1117] p-6">
        <h2 className="mb-5 text-sm font-black">Ajouter un utilisateur</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
              placeholder="email@exemple.com" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Mot de passe</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60"
              placeholder="6 caractères minimum" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Rôle</label>
            <select value={role} onChange={e => setRole(e.target.value as Role)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none">
              <option value="user">Gratuit</option>
              <option value="client">Payant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button type="submit" disabled={pending}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50">
              {pending ? "Création…" : "Créer"}
            </button>
            <button type="button" onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/10">
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
    startTransition(async () => {
      await sendPasswordReset(email);
      flash(userId, "Email envoyé ✓");
    });
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
        <h2 className="text-xs font-black uppercase tracking-wide text-white/40">
          {rows.length} utilisateur{rows.length !== 1 ? "s" : ""}
        </h2>
        <button onClick={() => setShowCreate(true)}
          className="text-xs text-white/30 hover:text-violet-400 transition-colors underline underline-offset-2">
          + Ajouter manuellement
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/3">
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/40">Utilisateur</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/40">Rôle</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/40">Statut</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/40">Écrans</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/40">Inscrit le</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/40">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(u => (
              <tr key={u.id} className={`transition-colors ${u.blocked ? "bg-red-500/3" : "hover:bg-white/2"}`}>
                <td className="px-4 py-3.5">
                  <span className={`font-medium ${u.blocked ? "text-white/40 line-through" : "text-white/80"}`}>
                    {u.email ?? "—"}
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  <select value={u.role} disabled={pending}
                    onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                    className={`rounded-full border px-3 py-1 text-xs font-bold bg-transparent cursor-pointer outline-none ${ROLE_STYLES[u.role]}`}>
                    <option value="user"   className="bg-[#0b0e14] text-white">Gratuit</option>
                    <option value="client" className="bg-[#0b0e14] text-white">Payant</option>
                    <option value="admin"  className="bg-[#0b0e14] text-white">Admin</option>
                  </select>
                </td>

                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    u.blocked
                      ? "bg-red-500/10 text-red-400"
                      : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {u.blocked ? "Bloqué" : "Actif"}
                  </span>
                </td>

                <td className="px-4 py-3.5 text-white/40">{u.screens_count}</td>

                <td className="px-4 py-3.5 text-xs text-white/35">
                  {new Date(u.created_at).toLocaleDateString("fr-FR")}
                </td>

                <td className="px-4 py-3.5">
                  {confirmDelete === u.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400">Confirmer ?</span>
                      <button onClick={() => handleDelete(u.id)} disabled={pending} className="text-xs font-bold text-red-400 hover:text-red-300">Oui</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-white/40 hover:text-white">Non</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {feedback?.id === u.id ? (
                        <span className="text-xs text-emerald-400">{feedback.msg}</span>
                      ) : (
                        <>
                          <IconBtn onClick={() => handlePasswordReset(u.id, u.email)} title="Envoyer un email de réinitialisation" disabled={pending}>
                            ✉
                          </IconBtn>
                          <IconBtn onClick={() => handleToggleBlock(u.id, u.blocked)} title={u.blocked ? "Débloquer" : "Bloquer"} disabled={pending}>
                            {u.blocked ? "🔓" : "🔒"}
                          </IconBtn>
                          <IconBtn onClick={() => setConfirmDelete(u.id)} title="Supprimer" disabled={pending} danger>
                            ✕
                          </IconBtn>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="py-16 text-center text-sm text-white/30">Aucun utilisateur</div>
        )}
      </div>
    </>
  );
}
