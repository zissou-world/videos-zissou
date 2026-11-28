#!/bin/bash
# Junta a vinheta da série (Higgsfield, termina no ícone 3D) com o episódio renderizado.
# O episódio entra a partir de 1,5 s (quadro que a vinheta reproduz), com 0,3 s de fusão.
# A mixagem precisa ter sido feita com PRE=4.24 (scripts/mix.py), que atrasa voz, trilha e efeitos.
# Uso: montar_com_vinheta.sh video_sem_audio.mp4 mix.wav saida_hq.mp4 saida_leve.mp4
set -e
D=$(cd "$(dirname "$0")" && pwd)
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$2")
ffmpeg -v error -y -i "$D/intro_30fps.mp4" -i "$1" -i "$2" -filter_complex \
 "[0:v]fps=30,settb=AVTB,setpts=PTS-STARTPTS[i];[1:v]fps=30,trim=start=1.5,setpts=PTS-STARTPTS,settb=AVTB[e];[i][e]xfade=transition=fade:duration=0.3:offset=5.733,format=yuv420p[v]" \
 -map "[v]" -map 2:a -t "$DUR" -c:v libx264 -preset slow -crf 17 -c:a aac -b:a 256k -movflags +faststart "$3"
ffmpeg -v error -y -i "$3" -c:v libx264 -preset medium -crf 26 -maxrate 4M -bufsize 8M -c:a aac -b:a 160k -movflags +faststart "$4"
echo ok "$3" "$4"
