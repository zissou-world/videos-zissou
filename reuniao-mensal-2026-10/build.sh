#!/usr/bin/env bash
# Renderiza o vídeo completo e gera as versões leve (~17 MB) e telão (~80 MB).
# Requisitos: node 20+, ffmpeg, Chromium + Playwright (PW_PATH aponta para o index.js do playwright).
# Uso: bash build.sh            (render completo, 3 processos em paralelo, ~30 min)
#      CHUNKS="960 1080" bash build.sh   (re-renderiza só esses blocos de 120 quadros)
set -euo pipefail
cd "$(dirname "$0")"
OUT=${OUT:-out}; mkdir -p "$OUT/chunks"
export PW_PATH=${PW_PATH:-$(node -e "console.log(require.resolve('playwright'))")}
(cd render && [ -d node_modules ] || npm ci)
if [ -n "${CHUNKS:-}" ]; then
  for c in $CHUNKS; do rm -f "$OUT/chunks/chunk_$(printf %06d $c).mp4"; (cd render && node render.mjs video "../$OUT/chunks" $c $((c+120))); done
else
  (cd render && node render.mjs video "../$OUT/chunks" 0 1440 & cd render && node render.mjs video "../$OUT/chunks" 1440 2880 & cd render && node render.mjs video "../$OUT/chunks" 2880 4141 & wait)
fi
for f in "$OUT"/chunks/chunk_*.mp4; do echo "file '$PWD/$f'"; done > "$OUT/list.txt"
ffmpeg -loglevel error -y -f concat -safe 0 -i "$OUT/list.txt" -c copy "$OUT/video_raw.mp4"
A=assets/audio_orig.m4a
ffmpeg -loglevel error -y -i "$OUT/video_raw.mp4" -c:v libx264 -preset slow -b:v 4400k -pass 1 -passlogfile "$OUT/p80" -an -f null -
ffmpeg -loglevel error -y -i "$OUT/video_raw.mp4" -i $A -map 0:v -map 1:a -c:v libx264 -preset slow -b:v 4400k -maxrate 9M -bufsize 18M -pass 2 -passlogfile "$OUT/p80" -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/Reuniao_Mensal_Outubro_Fotos_Telao.mp4"
ffmpeg -loglevel error -y -i "$OUT/video_raw.mp4" -i $A -map 0:v -map 1:a -c:v libx264 -preset slow -b:v 780k -maxrate 1.8M -bufsize 3.6M -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart "$OUT/Reuniao_Mensal_Outubro_Fotos.mp4"
ls -la "$OUT"/*.mp4
