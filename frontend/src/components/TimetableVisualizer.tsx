"use client";

import type { TimetableAssignment } from "@/lib/cpp-bridge";

interface TimetableVisualizerProps {
  teacherCount: number;
  classCount: number;
  assignments: TimetableAssignment[];
  periodCount: number;
}

const PERIOD_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#14b8a6",
  "#eab308",
  "#8b5cf6",
];

export default function TimetableVisualizer({
  teacherCount,
  classCount,
  assignments,
  periodCount,
}: TimetableVisualizerProps) {
  const width = 760;
  const height = Math.max(320, Math.max(teacherCount, classCount) * 54 + 80);
  const leftX = 130;
  const rightX = width - 130;
  const top = 52;
  const availableHeight = height - top * 2;

  const teacherY = (teacher: number) =>
    top + (teacherCount === 1 ? availableHeight / 2 : (availableHeight * teacher) / (teacherCount - 1));
  const classY = (classId: number) =>
    top + (classCount === 1 ? availableHeight / 2 : (availableHeight * classId) / (classCount - 1));

  const pairCounts = new Map<string, number>();
  assignments.forEach((assignment) => {
    const key = `${assignment.teacher}-${assignment.class}`;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  });

  const pairSeen = new Map<string, number>();
  const paths = assignments.map((assignment) => {
    const key = `${assignment.teacher}-${assignment.class}`;
    const seen = pairSeen.get(key) ?? 0;
    pairSeen.set(key, seen + 1);
    const total = pairCounts.get(key) ?? 1;
    const offset = (seen - (total - 1) / 2) * 12;
    const y1 = teacherY(assignment.teacher);
    const y2 = classY(assignment.class);
    const midX = (leftX + rightX) / 2;
    const midY = (y1 + y2) / 2 + offset;

    return {
      ...assignment,
      d: `M ${leftX + 28} ${y1} Q ${midX} ${midY} ${rightX - 28} ${y2}`,
      labelX: midX,
      labelY: midY,
      color: PERIOD_COLORS[assignment.period % PERIOD_COLORS.length],
    };
  });

  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <h3 className="text-sm font-semibold text-white/80">Graf Bipartit Timetabling</h3>
        <span className="font-mono text-xs text-white/40">{periodCount} periode</span>
      </div>

      <div className="overflow-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[720px] w-full">
          <defs>
            <filter id="timetableGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <text x={leftX} y={26} textAnchor="middle" className="fill-cyan-200/70 text-[13px] font-semibold">
            Guru
          </text>
          <text x={rightX} y={26} textAnchor="middle" className="fill-violet-200/70 text-[13px] font-semibold">
            Kelas
          </text>

          {paths.map((path) => (
            <g key={path.edgeId}>
              <path
                d={path.d}
                fill="none"
                stroke={path.color}
                strokeOpacity="0.72"
                strokeWidth="2.4"
                filter="url(#timetableGlow)"
              />
              <circle cx={path.labelX} cy={path.labelY} r="10" fill="#07111f" stroke={path.color} strokeOpacity="0.8" />
              <text
                x={path.labelX}
                y={path.labelY + 3.5}
                textAnchor="middle"
                className="fill-white text-[9px] font-bold"
              >
                {path.period + 1}
              </text>
            </g>
          ))}

          {Array.from({ length: teacherCount }, (_, teacher) => (
            <g key={teacher}>
              <circle cx={leftX} cy={teacherY(teacher)} r="24" fill="rgba(34,211,238,0.18)" stroke="rgba(103,232,249,0.55)" />
              <text
                x={leftX}
                y={teacherY(teacher) + 4}
                textAnchor="middle"
                className="fill-cyan-100 text-[13px] font-bold"
              >
                X{teacher + 1}
              </text>
            </g>
          ))}

          {Array.from({ length: classCount }, (_, classId) => (
            <g key={classId}>
              <circle cx={rightX} cy={classY(classId)} r="24" fill="rgba(168,85,247,0.18)" stroke="rgba(216,180,254,0.55)" />
              <text
                x={rightX}
                y={classY(classId) + 4}
                textAnchor="middle"
                className="fill-violet-100 text-[13px] font-bold"
              >
                Y{classId + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
