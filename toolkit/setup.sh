#!/usr/bin/env bash
# Instala as ferramentas de vídeo numa sessão nova (rodar uma vez): bash toolkit/setup.sh
set -e
cd "$(dirname "$0")"
npm ci --silent                     # three.js, React Three Fiber, Rapier, postprocessing
pip install -q -r requirements.txt  # librosa (análise de áudio/batidas), soundfile, Pillow, opencv
# skills deste repositório (.claude/skills) carregam sozinhas quando o repo está na sessão.
# pixelfx: a skill clona a biblioteca quando precisa (git clone https://github.com/patch-gg/pixelfx).
# Lemo-Opuscar: plugin da conta; a biblioteca é clonada pelo setup da própria skill.
echo "ok"
