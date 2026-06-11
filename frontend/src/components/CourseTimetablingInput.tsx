"use client";

import { useRef, useState } from "react";
import {
  CourseOffering,
  CourseRoom,
  CourseTimetablingConfig,
  DEFAULT_COURSE_ROOMS,
  IF_SEMESTER_4_COURSES,
  parseCourseCsv,
} from "@/lib/course-timetabling";

interface CourseTimetablingInputProps {
  value: CourseTimetablingConfig;
  onChange: (next: CourseTimetablingConfig) => void;
}

interface CatalogCourse {
  code: string;
  name: string;
  credits: number;
  semester?: number;
}

const PROGRAM_OPTIONS = [
  { id: "101", label: "FMIPA - Matematika (101)", cohort: "MA 2024" },
  { id: "102", label: "FMIPA - Fisika (102)", cohort: "FI 2024" },
  { id: "103", label: "FMIPA - Astronomi (103)", cohort: "AS 2024" },
  { id: "105", label: "FMIPA - Kimia (105)", cohort: "KI 2024" },
  { id: "108", label: "FMIPA - Aktuaria (108)", cohort: "AK 2024" },
  { id: "104", label: "SITH - Mikrobiologi (104)", cohort: "BM 2024" },
  { id: "106", label: "SITH - Biologi (106)", cohort: "BI 2024" },
  { id: "112", label: "SITH - Rekayasa Hayati (112)", cohort: "BE 2024" },
  { id: "114", label: "SITH - Rekayasa Pertanian (114)", cohort: "BA 2024" },
  { id: "115", label: "SITH - Rekayasa Kehutanan (115)", cohort: "BW 2024" },
  { id: "119", label: "SITH - Teknologi Pasca Panen (119)", cohort: "PP 2024" },
  { id: "107", label: "SF - Sains dan Teknologi Farmasi (107)", cohort: "FA 2024" },
  { id: "116", label: "SF - Farmasi Klinik dan Komunitas (116)", cohort: "FK 2024" },
  { id: "121", label: "FTTM - Teknik Pertambangan (121)", cohort: "TA 2024" },
  { id: "122", label: "FTTM - Teknik Perminyakan (122)", cohort: "TM 2024" },
  { id: "123", label: "FTTM - Teknik Geofisika (123)", cohort: "TG 2024" },
  { id: "125", label: "FTTM - Teknik Metalurgi (125)", cohort: "MG 2024" },
  { id: "120", label: "FITB - Teknik Geologi (120)", cohort: "GL 2024" },
  { id: "128", label: "FITB - Meteorologi (128)", cohort: "ME 2024" },
  { id: "129", label: "FITB - Oseanografi (129)", cohort: "OS 2024" },
  { id: "151", label: "FITB - Teknik Geodesi dan Geomatika (151)", cohort: "GD 2024" },
  { id: "130", label: "FTI - Teknik Kimia (130)", cohort: "TK 2024" },
  { id: "133", label: "FTI - Teknik Fisika (133)", cohort: "TF 2024" },
  { id: "134", label: "FTI - Teknik Industri (134)", cohort: "TI 2024" },
  { id: "143", label: "FTI - Teknik Pangan (143)", cohort: "PG 2024" },
  { id: "144", label: "FTI - Manajemen Rekayasa (144)", cohort: "MR 2024" },
  { id: "145", label: "FTI - Teknik Bioenergi dan Kemurgi (145)", cohort: "TB 2024" },
  { id: "194", label: "FTI - Teknik Industri Kampus Cirebon (194)", cohort: "TI-C 2024" },
  { id: "132", label: "STEI - Teknik Elektro (132)", cohort: "EL 2024" },
  { id: "135", label: "STEI - Teknik Informatika (135)", cohort: "IF 2024" },
  { id: "180", label: "STEI - Teknik Tenaga Listrik (180)", cohort: "EP 2024" },
  { id: "181", label: "STEI - Teknik Telekomunikasi (181)", cohort: "ET 2024" },
  { id: "182", label: "STEI - Sistem dan Teknologi Informasi (182)", cohort: "STI 2024" },
  { id: "183", label: "STEI - Teknik Biomedis (183)", cohort: "EB 2024" },
  { id: "131", label: "FTMD - Teknik Mesin (131)", cohort: "MS 2024" },
  { id: "136", label: "FTMD - Teknik Dirgantara (136)", cohort: "AE 2024" },
  { id: "137", label: "FTMD - Teknik Material (137)", cohort: "MT 2024" },
  { id: "150", label: "FTSL - Teknik Sipil (150)", cohort: "SI 2024" },
  { id: "153", label: "FTSL - Teknik Lingkungan (153)", cohort: "TL 2024" },
  { id: "155", label: "FTSL - Teknik Kelautan (155)", cohort: "KL 2024" },
  { id: "157", label: "FTSL - Rekayasa Infrastruktur Lingkungan (157)", cohort: "IL 2024" },
  { id: "158", label: "FTSL - Teknik dan Pengelolaan Sumber Daya Air (158)", cohort: "SA 2024" },
  { id: "152", label: "SAPPK - Arsitektur (152)", cohort: "AR 2024" },
  { id: "154", label: "SAPPK - Perencanaan Wilayah dan Kota (154)", cohort: "PL 2024" },
  { id: "156", label: "SAPPK - PWK Kampus Cirebon (156)", cohort: "PL-C 2024" },
  { id: "170", label: "FSRD - Seni Rupa (170)", cohort: "SR 2024" },
  { id: "171", label: "FSRD - Kriya Kampus Cirebon (171)", cohort: "KR-C 2024" },
  { id: "172", label: "FSRD - Kriya (172)", cohort: "KR 2024" },
  { id: "173", label: "FSRD - Desain Interior (173)", cohort: "DI 2024" },
  { id: "174", label: "FSRD - Desain Komunikasi Visual (174)", cohort: "DKV 2024" },
  { id: "175", label: "FSRD - Desain Produk (175)", cohort: "DP 2024" },
  { id: "190", label: "SBM - Manajemen (190)", cohort: "MB 2024" },
  { id: "192", label: "SBM - Kewirausahaan (192)", cohort: "KW 2024" },
];

function makeCourseId(course: Pick<CourseOffering, "code" | "className">, index: number) {
  return `${course.code.toLowerCase()}-${course.className.toLowerCase()}-${index}-${Date.now()}`;
}

function catalogToOffering(course: CatalogCourse, index: number, cohort: string): CourseOffering {
  return {
    id: makeCourseId({ code: course.code, className: "K01" }, index),
    code: course.code,
    name: course.name,
    credits: course.credits,
    lecturer: "Belum diisi",
    className: "K01",
    cohort,
    students: 70,
    roomType: "Kuliah",
  };
}

function makeRoom(index: number): CourseRoom {
  return {
    id: `ruang-${index + 1}-${Date.now()}`,
    name: `Ruang ${index + 1}`,
    capacity: 80,
    type: "Reguler",
  };
}

export default function CourseTimetablingInput({ value, onChange }: CourseTimetablingInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [program, setProgram] = useState("135");
  const [semester, setSemester] = useState("4");
  const [catalog, setCatalog] = useState<CatalogCourse[]>([]);
  const [selectedCatalogCode, setSelectedCatalogCode] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const selectedProgram = PROGRAM_OPTIONS.find((option) => option.id === program) ?? PROGRAM_OPTIONS[0];

  const updateCourse = (index: number, patch: Partial<CourseOffering>) => {
    const courses = value.courses.map((course, i) => i === index ? { ...course, ...patch } : course);
    onChange({ ...value, courses });
  };

  const updateRoomCount = (count: number) => {
    const safeCount = Math.min(30, Math.max(1, count || 1));
    const rooms = Array.from({ length: safeCount }, (_, index) => value.rooms[index] ?? makeRoom(index));
    onChange({ ...value, rooms });
  };

  const updateRoom = (index: number, patch: Partial<CourseRoom>) => {
    const rooms = value.rooms.map((room, i) => i === index ? { ...room, ...patch, type: "Reguler" } : room);
    onChange({ ...value, rooms });
  };

  const addBlankCourse = () => {
    const nextIndex = value.courses.length + 1;
    onChange({
      ...value,
      courses: [
        ...value.courses,
        {
          id: `manual-${nextIndex}-${Date.now()}`,
          code: `MK${String(nextIndex).padStart(3, "0")}`,
          name: "Mata Kuliah Baru",
          credits: 3,
          lecturer: "Belum diisi",
          className: "K01",
          cohort: "Umum",
          students: 40,
          roomType: "Kuliah",
        },
      ],
    });
  };

  const duplicateCourse = (index: number) => {
    const course = value.courses[index];
    const copy: CourseOffering = {
      ...course,
      id: makeCourseId(course, value.courses.length),
      className: `K${String(value.courses.filter((item) => item.code === course.code).length + 1).padStart(2, "0")}`,
    };
    onChange({ ...value, courses: [...value.courses, copy] });
  };

  const removeCourse = (index: number) => {
    onChange({ ...value, courses: value.courses.filter((_, i) => i !== index) });
  };

  const loadIfPreset = () => {
    onChange({
      ...value,
      courses: IF_SEMESTER_4_COURSES.map((course) => ({ ...course })),
      rooms: DEFAULT_COURSE_ROOMS.map((room) => ({ ...room })),
    });
    setStatus({ type: "success", message: "Preset IF semester 4 dimuat. Isi nama dosen agar constraint dosen aktif." });
  };

  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/itb-curriculum?program=${program}&semester=${semester}&t=${Date.now()}`, { cache: "no-store" });
      const data = await response.json() as { success: boolean; courses?: CatalogCourse[]; error?: string; source?: string; semester?: string };
      if (!data.success || !data.courses) {
        setStatus({ type: "error", message: data.error || "Gagal mengambil katalog SIX" });
        return;
      }
      setCatalog(data.courses);
      setSelectedCatalogCode(data.courses[0]?.code ?? "");
      const semesterLabel = semester === "all" ? "semua semester" : `semester ${semester}`;
      if (data.courses.length === 0) {
        setStatus({ type: "error", message: `Katalog ${semesterLabel} dari SIX terbaca, tetapi tidak ada mata kuliah yang ditemukan untuk prodi ini.` });
        return;
      }

      onChange({
        ...value,
        courses: data.courses.map((course, index) => catalogToOffering(course, index, selectedProgram.cohort)),
        rooms: value.rooms.length > 0 ? value.rooms : DEFAULT_COURSE_ROOMS.map((room) => ({ ...room })),
      });
      setStatus({ type: "success", message: `Katalog ${semesterLabel} dimuat: ${data.courses.length} mata kuliah dari SIX dan tabel sudah diperbarui.` });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Gagal mengambil katalog SIX" });
    } finally {
      setLoadingCatalog(false);
    }
  };

  const addSelectedCatalogCourse = () => {
    const course = catalog.find((item) => item.code === selectedCatalogCode);
    if (!course) return;
    onChange({ ...value, courses: [...value.courses, catalogToOffering(course, value.courses.length, selectedProgram.cohort)] });
  };

  const useCatalogAsCourses = () => {
    if (catalog.length === 0) return;
    onChange({
      ...value,
      courses: catalog.map((course, index) => catalogToOffering(course, index, selectedProgram.cohort)),
      rooms: value.rooms.length > 0 ? value.rooms : DEFAULT_COURSE_ROOMS.map((room) => ({ ...room })),
    });
    const semesterLabel = semester === "all" ? "semua semester" : `semester ${semester}`;
    setStatus({ type: "success", message: `${catalog.length} mata kuliah ${semesterLabel} dimasukkan ke tabel. Lengkapi dosen, kelas, dan angkatan sebelum menjalankan algoritma.` });
  };

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const courses = parseCourseCsv(String(reader.result ?? ""));
      if (courses.length === 0) {
        setStatus({ type: "error", message: "CSV kosong atau format tidak terbaca" });
        return;
      }
      onChange({ ...value, courses });
      setStatus({ type: "success", message: `CSV dimuat: ${courses.length} kelas kuliah.` });
    };
    reader.readAsText(file);
  };

  return (
    <div className="glass p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white/90">Course Timetabling</h3>
          <p className="mt-1 text-xs text-white/40">Data mata kuliah bisa dari preset ITB, katalog SIX, CSV, atau manual.</p>
        </div>
        <button type="button" onClick={loadIfPreset} className="glass-btn rounded-lg px-3 py-1.5 text-xs font-semibold text-cyan-300">
          Preset IF
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
        <h4 className="text-sm font-semibold text-white/85">Cara menggunakan halaman ini</h4>
        <div className="mt-3 grid gap-3 text-xs leading-relaxed text-white/55 md:grid-cols-2">
          <div>
            <p className="font-semibold text-cyan-200">1. Ambil atau buat data mata kuliah</p>
            <p>Pilih prodi dan semester, lalu klik Ambil SIX. Data dari SIX berisi kode, nama, dan SKS; nama dosen biasanya perlu dilengkapi manual karena tidak tersedia di halaman kurikulum publik.</p>
          </div>
          <div>
            <p className="font-semibold text-cyan-200">2. Lengkapi detail kelas</p>
            <p>Isi dosen, kelas paralel, angkatan, jumlah mahasiswa, serta daftar ruangan yang tersedia. Algoritma memakai data ini untuk menghindari bentrok dosen, bentrok angkatan, dan ruang yang tidak cukup.</p>
          </div>
          <div>
            <p className="font-semibold text-cyan-200">3. Jalankan timetabling</p>
            <p>Klik Run Timetabling di panel kanan. Sistem akan memilih slot Senin sampai Jumat dan mencoba menempatkan kelas ke ruang yang kapasitasnya sesuai.</p>
          </div>
          <div>
            <p className="font-semibold text-cyan-200">4. Baca hasilnya</p>
            <p>Jadwal yang muncul adalah pola mingguan reguler, jadi minggu berikutnya mengikuti susunan yang sama. Metrik konflik membantu melihat apakah masih ada kelas yang belum ideal.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-3 space-y-3">
        <div className="grid gap-2 lg:grid-cols-[1fr_160px_auto]">
          <select value={program} onChange={(event) => setProgram(event.target.value)} className="glass-input text-sm">
            {PROGRAM_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <select value={semester} onChange={(event) => setSemester(event.target.value)} className="glass-input text-sm">
            {Array.from({ length: 8 }, (_, index) => String(index + 1)).map((option) => (
              <option key={option} value={option}>Semester {option}</option>
            ))}
            <option value="all">Semua Semester</option>
          </select>
          <button type="button" onClick={fetchCatalog} disabled={loadingCatalog} className="glass-btn rounded-lg px-3 py-2 text-xs font-semibold text-cyan-300 disabled:opacity-50">
            {loadingCatalog ? "Loading..." : "Ambil SIX"}
          </button>
        </div>

        {catalog.length > 0 && (
          <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto]">
            <select value={selectedCatalogCode} onChange={(event) => setSelectedCatalogCode(event.target.value)} className="glass-input text-sm">
              {catalog.map((course) => (
                <option key={course.code} value={course.code}>
                  {course.code} - {course.name} ({course.credits} SKS{course.semester ? `, S${course.semester}` : ""})
                </option>
              ))}
            </select>
            <button type="button" onClick={addSelectedCatalogCourse} className="glass-btn rounded-lg px-3 py-2 text-xs font-semibold text-emerald-300">
              Tambah
            </button>
            <button type="button" onClick={useCatalogAsCourses} className="glass-btn rounded-lg px-3 py-2 text-xs font-semibold text-cyan-300">
              Pakai Semua
            </button>
          </div>
        )}

        {status && (
          <div className={`rounded-lg border px-3 py-2 text-xs ${
            status.type === "success"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-red-400/20 bg-red-400/10 text-red-300"
          }`}>
            {status.message}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addBlankCourse} className="glass-btn rounded-lg px-3 py-2 text-xs font-semibold text-cyan-300">
          + Mata Kuliah
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="glass-btn rounded-lg px-3 py-2 text-xs font-semibold text-violet-300">
          Upload CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) handleCsvFile(file);
          }}
        />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white/85">Daftar Ruangan</h4>
            <p className="mt-1 text-xs text-white/40">Lab dan kelas digabung. Isi nama ruangan sesuai yang ingin tampil di jadwal.</p>
          </div>
          <label className="space-y-1">
            <span className="block text-xs uppercase tracking-wider text-white/45">Jumlah Ruangan</span>
            <input
              type="number"
              min={1}
              max={30}
              value={value.rooms.length}
              onChange={(event) => updateRoomCount(Number.parseInt(event.target.value, 10))}
              className="glass-input h-10 w-28 px-2 text-center font-mono text-sm"
            />
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {value.rooms.map((room, index) => (
            <div key={room.id} className="grid grid-cols-[1fr_88px] gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-2">
              <label className="space-y-1">
                <span className="block text-[10px] uppercase tracking-wider text-white/35">Nama Ruang</span>
                <input
                  value={room.name}
                  onChange={(event) => updateRoom(index, { name: event.target.value || `Ruang ${index + 1}` })}
                  className="glass-input h-9 px-2 text-xs"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[10px] uppercase tracking-wider text-white/35">Kapasitas</span>
                <input
                  type="number"
                  min={1}
                  value={room.capacity}
                  onChange={(event) => updateRoom(index, { capacity: Math.max(1, Number.parseInt(event.target.value, 10) || 1) })}
                  className="glass-input h-9 px-2 text-center font-mono text-xs"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-white/[0.08]">
        <table className="min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="bg-white/[0.04] text-left text-xs text-white/45">
              <th className="px-2 py-2">Kode</th>
              <th className="px-2 py-2">Nama</th>
              <th className="px-2 py-2">SKS</th>
              <th className="px-2 py-2">Kelas</th>
              <th className="px-2 py-2">Dosen</th>
              <th className="px-2 py-2">Angkatan</th>
              <th className="px-2 py-2">Mhs</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {value.courses.map((course, index) => (
              <tr key={course.id} className="border-t border-white/[0.06]">
                <td className="px-1.5 py-1.5">
                  <input value={course.code} onChange={(event) => updateCourse(index, { code: event.target.value.toUpperCase() })} className="glass-input h-9 w-24 px-2 font-mono text-xs" />
                </td>
                <td className="px-1.5 py-1.5">
                  <input value={course.name} onChange={(event) => updateCourse(index, { name: event.target.value })} className="glass-input h-9 min-w-56 px-2 text-xs" />
                </td>
                <td className="px-1.5 py-1.5">
                  <input
                    inputMode="numeric"
                    value={course.credits}
                    onChange={(event) => updateCourse(index, { credits: Math.min(6, Math.max(1, Number.parseInt(event.target.value, 10) || 1)) })}
                    className="glass-input h-9 w-20 min-w-20 px-2 text-center font-mono text-sm text-white"
                  />
                </td>
                <td className="px-1.5 py-1.5">
                  <input value={course.className} onChange={(event) => updateCourse(index, { className: event.target.value })} className="glass-input h-9 w-20 px-2 text-center font-mono text-xs" />
                </td>
                <td className="px-1.5 py-1.5">
                  <input value={course.lecturer} onChange={(event) => updateCourse(index, { lecturer: event.target.value })} className="glass-input h-9 min-w-36 px-2 text-xs" />
                </td>
                <td className="px-1.5 py-1.5">
                  <input value={course.cohort} onChange={(event) => updateCourse(index, { cohort: event.target.value })} className="glass-input h-9 w-24 px-2 text-xs" />
                </td>
                <td className="px-1.5 py-1.5">
                  <input
                    inputMode="numeric"
                    value={course.students}
                    onChange={(event) => updateCourse(index, { students: Math.max(1, Number.parseInt(event.target.value, 10) || 1) })}
                    className="glass-input h-9 w-20 min-w-20 px-2 text-center font-mono text-sm text-white"
                  />
                </td>
                <td className="px-1.5 py-1.5">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => duplicateCourse(index)} className="rounded border border-cyan-400/20 px-2 py-1 text-xs text-cyan-300">Copy</button>
                    <button type="button" onClick={() => removeCourse(index)} className="rounded border border-red-400/20 px-2 py-1 text-xs text-red-300">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-white/35">
        Format CSV: courseCode,courseName,className,lecturer,credits,studentGroup,students.
      </p>
    </div>
  );
}
