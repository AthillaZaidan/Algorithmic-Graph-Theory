"use client";

export interface TimetablingConfig {
  teacherCount: number;
  classCount: number;
  requirements: number[][];
  limitedRooms: boolean;
  roomLimit: number;
}

interface TimetablingInputProps {
  value: TimetablingConfig;
  onChange: (next: TimetablingConfig) => void;
}

const MAX_DIMENSION = 20;

const pptRequirements = [
  [2, 0, 1, 1, 0],
  [0, 1, 0, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 1, 2],
];

function resizeMatrix(matrix: number[][], teacherCount: number, classCount: number) {
  return Array.from({ length: teacherCount }, (_, i) =>
    Array.from({ length: classCount }, (_, j) => matrix[i]?.[j] ?? 0)
  );
}

export default function TimetablingInput({ value, onChange }: TimetablingInputProps) {
  const updateCounts = (teacherCount: number, classCount: number) => {
    const nextTeacherCount = Math.max(1, Math.min(MAX_DIMENSION, teacherCount));
    const nextClassCount = Math.max(1, Math.min(MAX_DIMENSION, classCount));
    onChange({
      ...value,
      teacherCount: nextTeacherCount,
      classCount: nextClassCount,
      requirements: resizeMatrix(value.requirements, nextTeacherCount, nextClassCount),
    });
  };

  const updateRequirement = (teacher: number, classId: number, rawValue: string) => {
    const parsed = rawValue === "" ? 0 : Number.parseInt(rawValue, 10);
    const safeValue = Number.isFinite(parsed) ? Math.max(0, Math.min(99, parsed)) : 0;
    const requirements = value.requirements.map((row) => [...row]);
    requirements[teacher][classId] = safeValue;
    onChange({ ...value, requirements });
  };

  const loadPptExample = () => {
    onChange({
      teacherCount: 4,
      classCount: 5,
      requirements: pptRequirements,
      limitedRooms: value.limitedRooms,
      roomLimit: value.roomLimit,
    });
  };

  const clearMatrix = () => {
    onChange({
      ...value,
      requirements: Array.from({ length: value.teacherCount }, () => Array.from({ length: value.classCount }, () => 0)),
    });
  };

  return (
    <div className="glass p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white/90">Timetabling Input</h3>
        <button
          type="button"
          onClick={loadPptExample}
          className="glass-btn rounded-lg px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/15"
        >
          Contoh PPT
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="block text-xs uppercase tracking-wider text-white/50">Guru</span>
          <input
            type="number"
            min={1}
            max={MAX_DIMENSION}
            value={value.teacherCount}
            onChange={(e) => updateCounts(Number.parseInt(e.target.value, 10) || 1, value.classCount)}
            className="glass-input w-full text-center font-mono"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs uppercase tracking-wider text-white/50">Kelas</span>
          <input
            type="number"
            min={1}
            max={MAX_DIMENSION}
            value={value.classCount}
            onChange={(e) => updateCounts(value.teacherCount, Number.parseInt(e.target.value, 10) || 1)}
            className="glass-input w-full text-center font-mono"
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-wider text-white/50">Kebutuhan p_ij</label>
          <button type="button" onClick={clearMatrix} className="text-xs text-red-300/70 hover:text-red-300">
            Clear
          </button>
        </div>

        <div className="overflow-auto rounded-lg border border-white/[0.08]">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-white/[0.04]">
                <th className="sticky left-0 z-10 bg-[#0b1220] px-3 py-2 text-left text-xs font-semibold text-white/45">
                  Guru
                </th>
                {Array.from({ length: value.classCount }, (_, classId) => (
                  <th key={classId} className="px-2 py-2 text-center text-xs font-semibold text-violet-200/70">
                    Y{classId + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: value.teacherCount }, (_, teacher) => (
                <tr key={teacher} className="border-t border-white/[0.06]">
                  <th className="sticky left-0 z-10 bg-[#0b1220] px-3 py-2 text-left text-xs font-semibold text-cyan-200/70">
                    X{teacher + 1}
                  </th>
                  {Array.from({ length: value.classCount }, (_, classId) => (
                    <td key={classId} className="px-1.5 py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={value.requirements[teacher]?.[classId] ?? 0}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateRequirement(teacher, classId, e.target.value)}
                        className="glass-input h-9 w-14 text-center font-mono text-sm"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 border-t border-white/[0.06] pt-4">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-white/70">Limited Rooms</span>
          <button
            type="button"
            onClick={() => onChange({ ...value, limitedRooms: !value.limitedRooms })}
            className={`h-7 w-12 rounded-full border p-1 transition-colors ${
              value.limitedRooms ? "border-emerald-400/50 bg-emerald-400/20" : "border-white/10 bg-white/[0.05]"
            }`}
            aria-pressed={value.limitedRooms}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                value.limitedRooms ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </label>

        {value.limitedRooms && (
          <label className="space-y-1">
            <span className="block text-xs uppercase tracking-wider text-white/50">Kapasitas Ruangan per Periode</span>
            <input
              type="number"
              min={1}
              value={value.roomLimit}
              onChange={(e) => onChange({ ...value, roomLimit: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })}
              className="glass-input w-full text-center font-mono"
            />
          </label>
        )}
      </div>
    </div>
  );
}
