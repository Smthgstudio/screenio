import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import ScheduleManager from "@/components/ScheduleManager";

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: folder }, { data: schedules }, { data: screens }] = await Promise.all([
    supabase.from("folders").select("id, name, slug").eq("id", id).single(),
    supabase.from("schedules").select("id, days, start_time, end_time, all_day, screen_id, screens(id, name)").eq("folder_id", id).order("created_at"),
    supabase.from("screens").select("id, name").order("updated_at", { ascending: false }),
  ]);

  if (!folder) notFound();

  const broadcastUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/broadcast/${folder.slug}`;

  return (
    <div className="min-h-screen bg-[#EDEAE4] text-[#141414]">
      <header className="flex items-center justify-between border-b border-black/8 bg-[#EDEAE4] px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard"><Logo height={22} /></Link>
          <span className="text-black/20">/</span>
          <span className="text-sm font-black">{folder.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#888880]">URL de diffusion</span>
          <code className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-mono text-[#141414]">
            /broadcast/{folder.slug}
          </code>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <ScheduleManager
          folderId={id}
          folderName={folder.name}
          broadcastUrl={broadcastUrl}
          schedules={(schedules ?? []).map(s => ({
            id: s.id,
            days: s.days as number[],
            start_time: s.start_time,
            end_time: s.end_time,
            all_day: s.all_day,
            screen_id: s.screen_id,
            screen_name: (Array.isArray(s.screens) ? s.screens[0] : s.screens as { name: string } | null)?.name ?? "—",
          }))}
          screens={(screens ?? []).map(s => ({ id: s.id, name: s.name }))}
        />
      </main>
    </div>
  );
}
