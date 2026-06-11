"use client";

import { CourseTimetablingResult, ScheduledCourseSession } from "@/lib/course-timetabling";

interface CourseTimetableCalendarProps {
  result: CourseTimetablingResult | null;
}

const WEEKDAYS = [
  { day: 1, label: "Senin" },
  { day: 2, label: "Selasa" },
  { day: 3, label: "Rabu" },
  { day: 4, label: "Kamis" },
  { day: 5, label: "Jumat" },
];

function sessionsForDay(day: number, scheduled: ScheduledCourseSession[]) {
  return scheduled
    .filter((session) => session.slot.day === day)
    .sort((a, b) => a.slot.start.localeCompare(b.slot.start) || a.code.localeCompare(b.code));
}

function sessionLabel(session: ScheduledCourseSession) {
  const room = session.room?.name ?? "Ruang TBA";
  const sessionInfo = session.sessionCount > 1 ? ` S${session.sessionIndex}` : "";
  return `${session.slot.start}-${session.slot.end} ${session.code}${sessionInfo} ${session.name} (${room})`;
}

export default function CourseTimetableCalendar({ result }: CourseTimetableCalendarProps) {
  const scheduled = result?.scheduled ?? [];

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white text-slate-950 shadow-xl">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-2xl font-light text-[#00427e] sm:text-3xl">Jadwal Perkuliahan Mahasiswa</h3>
        <p className="mt-1 text-sm text-slate-500">Jadwal mingguan reguler, berlaku sama untuk setiap minggu perkuliahan.</p>
      </div>

      <div className="px-4 py-4">
        <div className="grid overflow-hidden rounded border border-slate-300 md:grid-cols-5">
          {WEEKDAYS.map((weekday) => {
            const events = sessionsForDay(weekday.day, scheduled);

            return (
              <section key={weekday.day} className="min-h-[340px] border-b border-slate-300 md:border-b-0 md:border-r md:last:border-r-0">
                <div className="border-b border-slate-300 bg-white px-3 py-2 text-center text-sm font-bold">
                  {weekday.label}
                </div>
                <div className="space-y-2 p-2">
                  {events.length > 0 ? (
                    events.map((session) => (
                      <div key={session.id} className="rounded border border-sky-100 bg-sky-50 px-2 py-2 leading-5 text-[#176fc5]">
                        <span className="font-medium">{sessionLabel(session)}</span>
                        {session.lecturer && session.lecturer !== "Belum diisi" && (
                          <span className="block text-[11px] text-slate-500">{session.lecturer}</span>
                        )}
                        <span className="block text-[11px] text-slate-500">
                          {session.className} - {session.cohort}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                      Belum ada kelas terjadwal
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#176fc5]">
          <span>
            {scheduled.length > 0
              ? `${scheduled.length} sesi per minggu ditampilkan dalam pola Senin sampai Jumat.`
              : "Klik Run Timetabling untuk membuat jadwal mingguan."}
          </span>
          <span>Jadwal minggu berikutnya mengikuti susunan yang sama.</span>
        </div>
      </div>
    </div>
  );
}
