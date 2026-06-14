import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import ScheduleTimeline from "@/components/ScheduleTimeline";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: folders }, { data: screens }, { data: profile }] = await Promise.all([
    supabase.from("folders").select("id, name, slug, schedules(id, screen_id, days, start_time, end_time, all_day, screens(id, name))").order("created_at"),
    supabase.from("screens").select("id, name").order("updated_at", { ascending: false }),
    supabase.from("profiles").select("role").single(),
  ]);

  const isAdmin = profile?.role === "admin";

  type RawSchedule = {
    id: string;
    screen_id: string;
    days: number[];
    start_time: string | null;
    end_time: string | null;
    all_day: boolean;
    screens: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  const foldersData = (folders ?? []).map(f => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    schedules: ((f.schedules ?? []) as RawSchedule[]).map(s => ({
      id: s.id,
      screen_id: s.screen_id,
      days: s.days as number[],
      start_time: s.start_time,
      end_time: s.end_time,
      all_day: s.all_day,
      screen_name: (Array.isArray(s.screens) ? s.screens[0] : s.screens)?.name ?? "—",
    })),
  }));

  return (
    <div className="flex flex-col h-screen bg-[#EDEAE4] text-[#141414] overflow-hidden">
      <header className="flex items-center justify-between border-b border-black/8 bg-[#EDEAE4] px-6 py-3 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard"><Logo height={22} /></Link>
          <span className="text-black/20">/</span>
          <span className="text-sm font-black">Programmation</span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link href="/admin" className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#141414] hover:bg-black/5">
              Admin
            </Link>
          )}
          <LogoutButton />
        </div>
      </header>

      <ScheduleTimeline
        folders={foldersData}
        screens={(screens ?? []).map(s => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
