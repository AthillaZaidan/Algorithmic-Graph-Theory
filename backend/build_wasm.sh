#!/bin/bash
# Build graph_engine to WebAssembly using Emscripten
# Requires: emscripten SDK (emcc) installed
# Usage: ./build_wasm.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building graph_engine.wasm..."

emcc graph_engine_wasm.cpp \
  -o ../frontend/public/graph_engine.js \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_processGraph", "_malloc", "_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="createGraphEngine" \
  -s ENVIRONMENT='web' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=16777216 \
  -s MAXIMUM_MEMORY=268435456 \
  -O2 \
  -std=c++17 \
  -s SINGLE_FILE=0

echo "Done! Output:"
echo "  ../frontend/public/graph_engine.js"
echo "  ../frontend/public/graph_engine.wasm"