"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseGraphFile, ParsedGraph } from "@/lib/graph-parser";

interface FileUploadProps {
  onGraphLoaded: (graph: ParsedGraph) => void;
}

export default function FileUpload({ onGraphLoaded }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const processFile = (file: File) => {
    if (!file.name.endsWith(".txt")) {
      setStatus({ type: "error", message: "Hanya file .txt yang didukung" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseGraphFile(content);
      if (result.error) {
        setStatus({ type: "error", message: result.error });
      } else {
        setStatus({
          type: "success",
          message: `Loaded: ${result.numVertices} nodes, ${result.edges.length} edges${result.isWeighted ? " (weighted)" : ""}`,
        });
        onGraphLoaded(result);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  return (
    <div>
      <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">
        Upload Graph File (.txt)
      </label>
      <div
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? "border-cyan-400/80 bg-cyan-400/10"
            : "border-white/15 hover:border-cyan-400/40 hover:bg-white/[0.03]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={handleChange}
        />
        <svg
          className={`w-8 h-8 mx-auto mb-2 transition-colors ${dragging ? "text-cyan-400" : "text-white/30"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-white/40 text-xs">
          {dragging ? "Lepaskan file di sini" : "Drag & drop atau klik untuk pilih file"}
        </p>
        <p className="text-white/20 text-xs mt-1">Format: N M di baris 1, lalu u v [w] per baris</p>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div
            key={status.message}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`mt-2 text-xs px-3 py-2 rounded-lg border ${
              status.type === "success"
                ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                : "text-red-400 bg-red-400/10 border-red-400/20"
            }`}
          >
            {status.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
