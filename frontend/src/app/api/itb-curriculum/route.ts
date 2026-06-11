import { NextRequest, NextResponse } from "next/server";

interface ParsedCourse {
  code: string;
  name: string;
  credits: number;
  semester?: number;
}

const COURSE_CODE_PATTERN = /\b[A-Z]{2,4}\d{3}[A-Z0-9]?\b/g;

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCourses(html: string): ParsedCourse[] {
  const courses = new Map<string, ParsedCourse>();
  for (let semester = 1; semester <= 8; semester += 1) {
    for (const course of parseSemesterCourses(html, semester)) {
      courses.set(`${course.semester}-${course.code}`, course);
    }
  }

  if (courses.size > 0) {
    return Array.from(courses.values()).sort((a, b) => (a.semester ?? 0) - (b.semester ?? 0) || a.code.localeCompare(b.code));
  }

  return parseCourseRows(html).sort((a, b) => a.code.localeCompare(b.code));
}

function stripTags(value: string) {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function parseCourseSegments(rowText: string): ParsedCourse[] {
  const codeMatches = Array.from(rowText.matchAll(COURSE_CODE_PATTERN));
  if (codeMatches.length === 0) return [];

  return codeMatches
    .map((match, index) => {
      const code = match[0];
      const start = match.index ?? 0;
      const nextStart = codeMatches[index + 1]?.index ?? rowText.length;
      const segment = rowText.slice(start, nextStart).trim();
      const withoutCode = segment.slice(code.length).trim();
      const creditMatch = withoutCode.match(/(.+?)\s+([0-9]+)\s*$/);
      if (!creditMatch) return null;

      const name = creditMatch[1].trim();
      const credits = Number.parseInt(creditMatch[2], 10);
      if (!name || !Number.isFinite(credits)) return null;

      return { code, name, credits };
    })
    .filter((course): course is ParsedCourse => Boolean(course));
}

function parseCourseRows(html: string): ParsedCourse[] {
  return html
    .replace(/<\/tr>/gi, "</tr>\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\n+/)
    .flatMap((row) => parseCourseSegments(stripTags(row)));
}

function parseSemesterCourses(html: string, semester: number): ParsedCourse[] {
  const leftSemester = semester % 2 === 1 ? semester : semester - 1;
  const rightSemester = leftSemester + 1;
  const startPattern = new RegExp(`Semester\\s*${leftSemester}[\\s\\S]*?Semester\\s*${rightSemester}`, "i");
  const startMatch = html.match(startPattern);

  if (!startMatch || startMatch.index === undefined) return [];

  const afterStart = startMatch.index + startMatch[0].length;
  const nextPair = rightSemester + 1 <= 8
    ? new RegExp(`Semester\\s*${rightSemester + 1}[\\s\\S]*?Semester\\s*${rightSemester + 2}`, "i")
    : /Spesialisasi|Minor|Double Major|Multidisiplin|Katalog Mata Kuliah/i;
  const nextMatch = html.slice(afterStart).match(nextPair);
  const end = nextMatch?.index !== undefined ? afterStart + nextMatch.index : html.length;
  const block = html.slice(afterStart, end);
  const rows = Array.from(block.matchAll(/<tr[\s\S]*?<\/tr>/gi)).map((match) => match[0]);
  const wantRightColumn = semester === rightSemester;
  const courses = new Map<string, ParsedCourse>();

  for (const row of rows) {
    const rowCourses = parseCourseSegments(stripTags(row));
    const selected = rowCourses[wantRightColumn ? 1 : 0];
    if (selected) courses.set(selected.code, { ...selected, semester });
  }

  if (courses.size > 0) {
    return Array.from(courses.values()).sort((a, b) => a.code.localeCompare(b.code));
  }

  return parseCourseRows(block)
    .map((course, index) => ({ ...course, semester: leftSemester + (index % 2) }))
    .filter((course) => course.semester === semester)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function GET(request: NextRequest) {
  const program = request.nextUrl.searchParams.get("program") || "135";
  const semesterParam = request.nextUrl.searchParams.get("semester") || "4";

  if (!/^\d{3}$/.test(program)) {
    return NextResponse.json({ success: false, error: "Kode prodi harus 3 digit" }, { status: 400 });
  }

  if (semesterParam !== "all" && !/^[1-8]$/.test(semesterParam)) {
    return NextResponse.json({ success: false, error: "Semester harus 1-8 atau all" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://six.itb.ac.id/pub/kur2024/${program}`, {
      next: { revalidate: 60 * 60 * 24 },
      headers: { "User-Agent": "Graph Theory Visualizer coursework importer" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `SIX returned ${response.status}` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const courses = semesterParam === "all"
      ? parseCourses(html)
      : parseSemesterCourses(html, Number.parseInt(semesterParam, 10));

    return NextResponse.json({
      success: true,
      source: `https://six.itb.ac.id/pub/kur2024/${program}`,
      program,
      semester: semesterParam,
      courses,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data kurikulum";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
