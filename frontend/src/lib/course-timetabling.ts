export interface CourseOffering {
  id: string;
  code: string;
  name: string;
  credits: number;
  lecturer: string;
  className: string;
  cohort: string;
  students: number;
  roomType: string;
}

export interface CourseRoom {
  id: string;
  name: string;
  capacity: number;
  type: string;
}

export interface CourseTimeslot {
  id: string;
  day: number;
  dayName: string;
  start: string;
  end: string;
}

export interface ScheduledCourseSession {
  id: string;
  courseId: string;
  code: string;
  name: string;
  credits: number;
  lecturer: string;
  className: string;
  cohort: string;
  students: number;
  roomType: string;
  sessionIndex: number;
  sessionCount: number;
  slot: CourseTimeslot;
  room?: CourseRoom;
  conflictReasons: string[];
}

export interface CourseTimetablingResult {
  success: true;
  scheduled: ScheduledCourseSession[];
  unscheduled: ScheduledCourseSession[];
  rooms: CourseRoom[];
  timeslots: CourseTimeslot[];
  conflictEdges: { from: string; to: string; reasons: string[] }[];
  hardConflictCount: number;
  roomOverflowCount: number;
  lecturerGapScore: number;
  dailyLoad: Record<string, number>;
  method: "dsatur_course_coloring";
}

export interface CourseTimetablingConfig {
  courses: CourseOffering[];
  rooms: CourseRoom[];
}

export const DEFAULT_COURSE_ROOMS: CourseRoom[] = [
  { id: "ruang-7602", name: "Ruang 7602", capacity: 90, type: "Reguler" },
  { id: "ruang-7609", name: "Ruang 7609", capacity: 90, type: "Reguler" },
  { id: "ruang-cas-9521", name: "Ruang CAS 9521", capacity: 120, type: "Reguler" },
  { id: "ruang-9302", name: "Ruang 9302", capacity: 80, type: "Reguler" },
];

export const DEFAULT_COURSE_TIMESLOTS: CourseTimeslot[] = [
  { id: "mon-0715", day: 1, dayName: "Senin", start: "07:15", end: "09:15" },
  { id: "mon-0915", day: 1, dayName: "Senin", start: "09:15", end: "12:15" },
  { id: "mon-1230", day: 1, dayName: "Senin", start: "12:30", end: "15:30" },
  { id: "tue-0715", day: 2, dayName: "Selasa", start: "07:15", end: "09:15" },
  { id: "tue-0915", day: 2, dayName: "Selasa", start: "09:15", end: "12:15" },
  { id: "tue-1230", day: 2, dayName: "Selasa", start: "12:30", end: "15:30" },
  { id: "wed-0715", day: 3, dayName: "Rabu", start: "07:15", end: "09:15" },
  { id: "wed-0915", day: 3, dayName: "Rabu", start: "09:15", end: "12:15" },
  { id: "wed-1230", day: 3, dayName: "Rabu", start: "12:30", end: "15:30" },
  { id: "thu-0715", day: 4, dayName: "Kamis", start: "07:15", end: "09:15" },
  { id: "thu-0915", day: 4, dayName: "Kamis", start: "09:15", end: "12:15" },
  { id: "thu-1230", day: 4, dayName: "Kamis", start: "12:30", end: "15:30" },
  { id: "fri-0715", day: 5, dayName: "Jumat", start: "07:15", end: "09:15" },
  { id: "fri-0915", day: 5, dayName: "Jumat", start: "09:15", end: "11:15" },
  { id: "fri-1230", day: 5, dayName: "Jumat", start: "13:30", end: "15:30" },
];

export const IF_SEMESTER_4_COURSES: CourseOffering[] = [
  { id: "if2010-k01", code: "IF2010", name: "Pemrograman Berorientasi Objek", credits: 3, lecturer: "Belum diisi", className: "K01", cohort: "IF 2024", students: 75, roomType: "Kuliah" },
  { id: "if2211-k01", code: "IF2211", name: "Strategi Algoritma", credits: 3, lecturer: "Belum diisi", className: "K01", cohort: "IF 2024", students: 80, roomType: "Kuliah" },
  { id: "if2224-k01", code: "IF2224", name: "Teori Bahasa Formal dan Otomata", credits: 4, lecturer: "Belum diisi", className: "K01", cohort: "IF 2024", students: 82, roomType: "Kuliah" },
  { id: "if2230-k01", code: "IF2230", name: "Jaringan Komputer", credits: 3, lecturer: "Belum diisi", className: "K01", cohort: "IF 2024", students: 78, roomType: "Kuliah" },
  { id: "if2240-k01", code: "IF2240", name: "Basis Data", credits: 3, lecturer: "Belum diisi", className: "K01", cohort: "IF 2024", students: 80, roomType: "Kuliah" },
  { id: "ma3052-k01", code: "MA3052", name: "Teori Graf Algoritmik", credits: 3, lecturer: "Belum diisi", className: "K01", cohort: "IF 2024", students: 70, roomType: "Kuliah" },
  { id: "wi2022-k01", code: "WI2022", name: "Manajemen Proyek", credits: 2, lecturer: "Belum diisi", className: "K01", cohort: "IF 2024", students: 85, roomType: "Kuliah" },
];

export function createDefaultCourseTimetablingConfig(): CourseTimetablingConfig {
  return {
    courses: IF_SEMESTER_4_COURSES.map((course) => ({ ...course })),
    rooms: DEFAULT_COURSE_ROOMS.map((room) => ({ ...room })),
  };
}

export function parseCourseCsv(content: string): CourseOffering[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const hasHeader = /courseCode|code/i.test(lines[0]);
  const rows = hasHeader ? lines.slice(1) : lines;

  return rows.map((line, index) => {
    const [code = "", name = "", className = "K01", lecturer = "Belum diisi", credits = "3", cohort = "Umum", students = "40", roomType = "Kuliah"] =
      line.split(",").map((part) => part.trim());
    const safeCode = code || `MK${index + 1}`;
    const safeClass = className || "K01";

    return {
      id: `${safeCode.toLowerCase()}-${safeClass.toLowerCase()}-${index}`,
      code: safeCode,
      name: name || safeCode,
      className: safeClass,
      lecturer: lecturer || "Belum diisi",
      credits: Math.max(1, Number.parseInt(credits, 10) || 3),
      cohort: cohort || "Umum",
      students: Math.max(1, Number.parseInt(students, 10) || 40),
      roomType: roomType || "Kuliah",
    };
  });
}

function sessionCountForCredits(credits: number) {
  return credits >= 4 ? 2 : 1;
}

function expandSessions(courses: CourseOffering[]): ScheduledCourseSession[] {
  return courses.flatMap((course) => {
    const sessionCount = sessionCountForCredits(course.credits);
    return Array.from({ length: sessionCount }, (_, index) => ({
      ...course,
      id: `${course.id}-s${index + 1}`,
      courseId: course.id,
      sessionIndex: index + 1,
      sessionCount,
      slot: DEFAULT_COURSE_TIMESLOTS[0],
      conflictReasons: [],
    }));
  });
}

function conflictReasons(a: ScheduledCourseSession, b: ScheduledCourseSession) {
  const reasons: string[] = [];
  if (a.courseId === b.courseId) reasons.push("Sesi mata kuliah sama");
  if (a.lecturer && b.lecturer && a.lecturer !== "Belum diisi" && a.lecturer === b.lecturer) reasons.push("Dosen sama");
  if (a.cohort && b.cohort && a.cohort === b.cohort) reasons.push("Kelompok mahasiswa sama");
  return reasons;
}

function buildConflictGraph(sessions: ScheduledCourseSession[]) {
  const edges = new Map<string, { from: string; to: string; reasons: string[] }>();
  const adj = new Map<string, Set<string>>();

  sessions.forEach((session) => adj.set(session.id, new Set()));
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const reasons = conflictReasons(sessions[i], sessions[j]);
      if (reasons.length === 0) continue;
      const key = `${sessions[i].id}|${sessions[j].id}`;
      edges.set(key, { from: sessions[i].id, to: sessions[j].id, reasons });
      adj.get(sessions[i].id)?.add(sessions[j].id);
      adj.get(sessions[j].id)?.add(sessions[i].id);
    }
  }

  return { edges: Array.from(edges.values()), adj };
}

function chooseSessionDsatur(
  unscheduled: ScheduledCourseSession[],
  scheduledSlotById: Map<string, CourseTimeslot>,
  adj: Map<string, Set<string>>
) {
  return [...unscheduled].sort((a, b) => {
    const aNeighborSlots = new Set(
      Array.from(adj.get(a.id) ?? [])
        .map((id) => scheduledSlotById.get(id)?.id)
        .filter(Boolean)
    );
    const bNeighborSlots = new Set(
      Array.from(adj.get(b.id) ?? [])
        .map((id) => scheduledSlotById.get(id)?.id)
        .filter(Boolean)
    );
    return bNeighborSlots.size - aNeighborSlots.size || (adj.get(b.id)?.size ?? 0) - (adj.get(a.id)?.size ?? 0);
  })[0];
}

function scoreSlot(
  session: ScheduledCourseSession,
  slot: CourseTimeslot,
  scheduled: ScheduledCourseSession[],
  adj: Map<string, Set<string>>
) {
  let score = 0;
  const neighborIds = adj.get(session.id) ?? new Set();
  for (const other of scheduled) {
    if (neighborIds.has(other.id) && other.slot.id === slot.id) score += 1000;
    if (other.courseId === session.courseId && other.slot.day === slot.day) score += 8;
    if (other.lecturer === session.lecturer && other.slot.day === slot.day) score += 2;
  }
  score += scheduled.filter((other) => other.slot.day === slot.day).length;
  return score;
}

function assignRoom(session: ScheduledCourseSession, rooms: CourseRoom[], scheduled: ScheduledCourseSession[]) {
  const availableRooms = rooms.length > 0 ? rooms : DEFAULT_COURSE_ROOMS;
  const compatible = availableRooms
    .filter((room) => room.capacity >= session.students)
    .sort((a, b) => a.capacity - b.capacity);
  const fallback = availableRooms
    .filter((room) => !scheduled.some((other) => other.room?.id === room.id && other.slot.id === session.slot.id))
    .sort((a, b) => b.capacity - a.capacity);

  const free = compatible.find((room) =>
    !scheduled.some((other) => other.room?.id === room.id && other.slot.id === session.slot.id)
  );

  return free ?? compatible[0] ?? fallback[0];
}

export function solveCourseTimetabling(
  courses: CourseOffering[],
  rooms: CourseRoom[] = DEFAULT_COURSE_ROOMS,
  timeslots: CourseTimeslot[] = DEFAULT_COURSE_TIMESLOTS
): CourseTimetablingResult {
  const sessions = expandSessions(courses);
  const { edges, adj } = buildConflictGraph(sessions);
  const unscheduled = [...sessions];
  const scheduled: ScheduledCourseSession[] = [];
  const scheduledSlotById = new Map<string, CourseTimeslot>();

  while (unscheduled.length > 0) {
    const current = chooseSessionDsatur(unscheduled, scheduledSlotById, adj);
    const bestSlot = [...timeslots].sort((a, b) =>
      scoreSlot(current, a, scheduled, adj) - scoreSlot(current, b, scheduled, adj)
    )[0];

    const placed: ScheduledCourseSession = {
      ...current,
      slot: bestSlot,
      room: undefined,
      conflictReasons: [],
    };
    placed.room = assignRoom(placed, rooms, scheduled);
    scheduled.push(placed);
    scheduledSlotById.set(placed.id, placed.slot);
    unscheduled.splice(unscheduled.findIndex((item) => item.id === current.id), 1);
  }

  const hardConflicts = edges.filter((edge) => {
    const a = scheduled.find((session) => session.id === edge.from);
    const b = scheduled.find((session) => session.id === edge.to);
    return a && b && a.slot.id === b.slot.id;
  });

  const roomOverflowCount = scheduled.filter((session) => !session.room || session.room.capacity < session.students).length;
  const dailyLoad: Record<string, number> = {};
  for (const slot of timeslots) dailyLoad[slot.dayName] = 0;
  for (const session of scheduled) dailyLoad[session.slot.dayName] = (dailyLoad[session.slot.dayName] ?? 0) + 1;

  const lecturerGapScore = Array.from(new Set(scheduled.map((session) => session.lecturer))).reduce((total, lecturer) => {
    const byDay = scheduled
      .filter((session) => session.lecturer === lecturer)
      .reduce<Record<number, number[]>>((acc, session) => {
        const index = timeslots.findIndex((slot) => slot.id === session.slot.id);
        acc[session.slot.day] = [...(acc[session.slot.day] ?? []), index];
        return acc;
      }, {});

    return total + Object.values(byDay).reduce((sum, slots) => {
      const sorted = [...slots].sort((a, b) => a - b);
      return sum + sorted.reduce((gap, slotIndex, index) => {
        if (index === 0) return gap;
        return gap + Math.max(0, slotIndex - sorted[index - 1] - 1);
      }, 0);
    }, 0);
  }, 0);

  return {
    success: true,
    scheduled: scheduled.sort((a, b) => a.slot.day - b.slot.day || a.slot.start.localeCompare(b.slot.start) || a.code.localeCompare(b.code)),
    unscheduled: [],
    rooms,
    timeslots,
    conflictEdges: edges,
    hardConflictCount: hardConflicts.length,
    roomOverflowCount,
    lecturerGapScore,
    dailyLoad,
    method: "dsatur_course_coloring",
  };
}
