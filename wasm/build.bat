ldc2 -mtriple=wasm32-wasi -betterC -O --cache-retrieval=hardlink -release -L-s -L--compress-relocations -L--gc-sections -L--merge-data-segments -L-O4 -L--lto-O1 -L--no-entry -L-allow-undefined -L--no-export-dynamic -L--export=outbuf -L--export=getpos -L--export=move -L--export=put -L--export=packI32 -L--export=packI64 -L--export=packU64 -L--export=packFP -L--export=beginRaw -L--export=beginStr -L--export=beginArray -L--export=beginMap -L--export=flush -mattr=+bulk-memory msgpack.d