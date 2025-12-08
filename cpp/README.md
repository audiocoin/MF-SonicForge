# SonicForge C++ Audio Engine

This directory contains the high-performance C++ DSP code intended to be compiled to WebAssembly (Wasm).

## Compilation Instructions

You need [Emscripten](https://emscripten.org/) installed to compile this code.

Run the following command in your terminal from the project root:

```bash
emcc cpp/SonicForgeDSP.cpp cpp/WasmBridge.cpp \
  -O3 \
  -s WASM=1 \
  -s "EXPORTED_RUNTIME_METHODS=['ccall', 'cwrap']" \
  -s "EXPORTED_FUNCTIONS=['_createSonicForge', '_destroySonicForge', '_processBlock', '_updateParams', '_getInputBuffer', '_getOutputBuffer']" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="SonicForgeModule" \
  -o public/sonicforge.js
```

## Integration

1.  Compile the code to generate `public/sonicforge.js` and `public/sonicforge.wasm`.
2.  In your TypeScript code, import the module (e.g., via script tag or dynamic import) and initialize it.
3.  Use `_createSonicForge(ctx.sampleRate, 2)` to start the engine.
4.  In your `AudioWorklet` or `ScriptProcessor`, use `_processBlock` to handle audio frames.
