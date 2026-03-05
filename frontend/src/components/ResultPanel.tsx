"use client";

import { ReactNode } from "react";

interface ResultPanelProps {
  title: string;
  children: ReactNode;
  loading?: boolean;
}

export default function ResultPanel({ title, children, loading }: ResultPanelProps) {
  return (
    <div className="glass p-5">
      <h3 className="text-lg font-semibold text-cyan-300 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
        {title}
      </h3>
      {loading ? (
        <div className="flex items-center gap-3 text-white/50 py-4">
          <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          Processing...
        </div>
      ) : (
        <div className="text-white/80 text-sm leading-relaxed">{children}</div>
      )}
    </div>
  );
}
