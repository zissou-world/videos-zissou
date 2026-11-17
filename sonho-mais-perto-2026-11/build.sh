#!/usr/bin/env bash
# Gera "Seu sonho mais perto" (30 s). Requisitos: node 20+, ffmpeg, Playwright/Chromium, python3 (+ librosa p/ análise).
# Áudio: python3 scripts/tts.py && python3 scripts/music.py audio/music_a.mp3 && python3 scripts/sfx.py   (só se for regerar)
#        python3 scripts/cues.py && python3 scripts/mix.py -9
# Vídeo: bash build.sh   |   só alguns blocos: CHUNKS="0 120" bash build.sh
set -euo pipefail
cd "$(dirname "$0")"
OUT=out; mkdir -p $OUT/chunks
export PW_PATH=${PW_PATH:-$(node -e "console.log(require.resolve('playwright'))")}
(cd render && [ -d node_modules ] || npm ci)
[ -f audio/m_a.wav ] || ffmpeg -loglevel error -y -i audio/music_a.mp3 -ac 1 -ar 22050 audio/m_a.wav
[ -f audio/mix.wav ] || { python3 scripts/cues.py >/dev/null; python3 scripts/mix.py -9; }
if [ -n "${CHUNKS:-}" ]; then for c in $CHUNKS; do rm -f $OUT/chunks/chunk_$(printf %06d $c).mp4; (cd render && node render.mjs video ../$OUT/chunks $c $((c+120))); done
else (cd render && node render.mjs video ../$OUT/chunks 0 360 & cd render && node render.mjs video ../$OUT/chunks 360 600 & cd render && node render.mjs video ../$OUT/chunks 600 901 & wait); fi
for f in $OUT/chunks/chunk_*.mp4; do echo "file '$PWD/$f'"; done > $OUT/list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i $OUT/list.txt -c copy $OUT/video_raw.mp4
ffmpeg -loglevel error -y -i $OUT/video_raw.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart $OUT/Seu_Sonho_Mais_Perto_HQ.mp4
ffmpeg -loglevel error -y -i $OUT/video_raw.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -b:v 3500k -maxrate 6M -bufsize 12M -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart $OUT/Seu_Sonho_Mais_Perto.mp4
ls -la $OUT/*.mp4
