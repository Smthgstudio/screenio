"use client";

import { useState, useTransition } from "react";
import { updateUserRole, deleteUser } from "@/app/admin/actions";

type Role = "user" | "client" | "admin";

interface UserRow {
  id: string;
  email: string | null;
  role: Role;
  created_at: string;
  screens_count: number;
}

const ROLE_STYLES: Record<Role, string> = {
  admin:  "border-violet-500/40 bg-violet-500/15 text-violet-300",
  client: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  user:   "border-white/10 bg-white/5 text-white/50",
};

export default function AdminUserTable({ users }: { users: UserRow[] }) {
  const [rows, setRows] = useState(users);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function handleRoleChange(userId: string, role: Role) {
    setRows(r => r.map(u => u.id === userId ? { ...u, role } : u));
    startTransition(() => updateUserRole(userId, role));
  }

  function handleDelete(userId: string) {
    startTransition(async () => {
      await deleteUser(userId);
      setRows(r => r.filter(u => u.id !== userId));
      setConfirmDelete(null);
    });
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/8">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8 bg-white/3">
            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/40">Utilisateur</th>
            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/40">Rôle</th>
            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/40">Écrans</th>
            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/40">Inscrit le</th>
            <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/40">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(u => (
            <tr key={u.id} className="hover:bg-white/2 transition-colors">
              <td className="px-4 py-3.5 text-white/80 font-medium">{u.email ?? "—"}</td>

              <td className="px-4 py-3.5">
                <select
                  value={u.role}
                  disabled={pending}
                  onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold bg-transparent cursor-pointer outline-none ${ROLE_STYLES[u.role]}`}
                >
                  <option value="user"   className="bg-[#0b0e14] text-white">Utilisateur</option>
                  <option value="client" className="bg-[#0b0e14] text-white">Client</option>
                  <option value="admin"  className="bg-[#0b0e14] text-white">Admin</option>
                </select>
              </td>

              <td className="px-4 py-3.5 text-white/50">{u.screens_count}</td>

              <td className="px-4 py-3.5 text-white/40 text-xs">
                {new Date(u.created_at).toLocaleDateString("fr-FR")}
              </td>

              <td className="px-4 py-3.5">
                {confirmDelete === u.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Confirmer ?</span>
                    <button onClick={() => handleDelete(u.id)} disabled={pending}
                      className="text-xs font-bold text-red-400 hover:text-red-300">Oui</button>
                    <button onClick={() => setConfirmDelete(null)}
                      className="text-xs text-white/40 hover:text-white/70">Non</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(u.id)}
                    className="text-xs text-white/30 hover:text-red-400 transition-colors">
                    Supprimer
                  </button>
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
  );
}
