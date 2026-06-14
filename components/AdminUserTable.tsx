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

export default function AdminUserTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [rows, setRows] = useState(users);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingRole, setPendingRole] = useState<{ userId: string; role: Role } | null>(null);

  function flash(id: string, msg: string, ok = true) {
    setFeedback({ id, msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  }

  function handleRoleSelect(userId: string, role: Role) {
    if (userId === currentUserId) return;
    setPendingRole({ userId, role });
  }

  function confirmRoleChange() {
    if (!pendingRole) return;
    const { userId, role } = pendingRole;
    setRows(r => r.map(u => u.id === userId ? { ...u, role } : u));
    setPendingRole(null);
    startTransition(async () => {
      try { await updateUserRole(userId, role); }
      catch (err) { flash(userId, err instanceof Error ? err.message : "Erreur", false); }
    });
  }

  function handlePasswordReset(userId: string, email: string | null) {
    if (!email) return;
    startTransition(async () => {
      try { await sendPasswordReset(email); flash(userId, "Email envoyé ✓"); }
      catch (err) { flash(userId, err instanceof Error ? err.message : "Erreur", false); }
    });
  }

  function handleToggleBlock(userId: string, blocked: boolean) {
    if (userId === currentUserId) return;
    setRows(r => r.map(u => u.id === userId ? { ...u, blocked: !blocked } : u));
    startTransition(async () => {
      try { await toggleBlockUser(userId, !blocked); }
      catch (err) {
        setRows(r => r.map(u => u.id === userId ? { ...u, blocked } : u));
        flash(userId, err instanceof Error ? err.message : "Erreur", false);
      }
    });
  }

  function handleDelete(userId: string) {
    startTransition(async () => {
      try {
        await deleteUser(userId);
        setRows(r => r.filter(u => u.id !== userId));
        setConfirmDelete(null);
      } catch (err) {
        flash(userId, err instanceof Error ? err.message : "Erreur", false);
        setConfirmDelete(null);
      }
    });
  }

  const isSelf = (id: string) => id === currentUserId;

  return (
    <>
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}

      {/* Role change confirmation modal */}
      {pendingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4">
          <div className="w-full max-w-xs rounded-2xl border border-black/10 bg-[#EDEAE4] p-6 shadow-xl">
            <p className="text-sm font-bold text-[#141414] mb-1">Modifier le rôle ?</p>
            <p className="text-xs text-[#888880] mb-5">
              Nouveau rôle : <strong>{ROLE_LABELS[pendingRole.role]}</strong>
            </p>
            <div className="flex gap-2">
              <button onClick={confirmRoleChange}
                className="flex-1 rounded-xl bg-[#141414] py-2.5 text-sm font-black text-white hover:bg-black">
                Confirmer
              </button>
              <button onClick={() => setPendingRole(null)}
                className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-[#888880] hover:bg-black/5">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

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
              <tr key={u.id} className={`transition-colors ${u.blocked ? "bg-red-50/50" : isSelf(u.id) ? "bg-[#C8F15A]/10" : "hover:bg-black/1"}`}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${u.blocked ? "text-black/30 line-through" : "text-[#141414]"}`}>
                      {u.email ?? "—"}
                    </span>
                    {isSelf(u.id) && (
                      <span className="rounded-full border border-black/10 bg-[#C8F15A] px-2 py-0.5 text-[10px] font-bold text-[#141414]">Vous</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {isSelf(u.id) ? (
                    <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${ROLE_STYLES[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  ) : (
                    <select value={u.role} disabled={pending}
                      onChange={e => handleRoleSelect(u.id, e.target.value as Role)}
                      className={`rounded-full border px-3 py-1 text-xs font-bold cursor-pointer outline-none ${ROLE_STYLES[u.role]}`}>
                      <option value="user">Gratuit</option>
                      <option value="client">Payant</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
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
                        <span className={`text-xs ${feedback.ok ? "text-green-600" : "text-red-500"}`}>{feedback.msg}</span>
                      ) : (
                        <>
                          <IconBtn onClick={() => handlePasswordReset(u.id, u.email)} title="Réinitialiser le mot de passe" disabled={pending}>✉</IconBtn>
                          {!isSelf(u.id) && (
                            <>
                              <IconBtn onClick={() => handleToggleBlock(u.id, u.blocked)} title={u.blocked ? "Débloquer" : "Bloquer"} disabled={pending}>
                                {u.blocked ? "🔓" : "🔒"}
                              </IconBtn>
                              <IconBtn onClick={() => setConfirmDelete(u.id)} title="Supprimer" disabled={pending} danger>✕</IconBtn>
                            </>
                          )}
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
