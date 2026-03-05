"use client";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
      <div className="mx-auto max-w-7xl">
        <div className="glass flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center text-black font-bold text-sm">
              GT
            </div>
            <span className="font-semibold text-white/90">
              Graph Theory Visualizer
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Powered by C++ Engine
          </div>
        </div>
      </div>
    </nav>
  );
}
