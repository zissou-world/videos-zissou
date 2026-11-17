# Seu sonho mais perto — Black Zissou, segunda quinzena (30 s)

Motion 1920×1080, 30 fps. Fundo azul profundo, tipografia branca (ZonaPro), objetos 3D brancos acetinados com sombras suaves e câmera contínua.

| Cena | Tempo | O que acontece |
|---|---|---|
| 1. A pergunta | 0–3 s | ponto de luz revela "Você tem um sonho?" |
| 2. Conexão pessoal | 3–8 s | câmera passa do avião à casa e ao coração |
| 3. Oportunidade | 8–14 s | o coração sai e revela o ícone Zissou, que avança para uma luz quente |
| 4. Acelerar | 14–19 s | a câmera entra no ícone; RETA FINAL / BLACK ZISSOU / É hora de acelerar |
| 5. Ação | 19–25 s | três blocos se encaixam em degraus e o ícone sobe |
| 6. Convocação | 25–30 s | o ícone chega ao topo; frase final e assinatura BLACK ZISSOU · 17 DE NOVEMBRO |

- `render/main.js`: cenas, câmera e tipografia, com tempos lidos de `cues.json`.
- `scripts/tts.py`: falas com a voz clonada.
- `scripts/music.py`: trilha.
- `scripts/sfx.py`: efeitos sonoros.
- `scripts/cues.py`: posição das frases na linha do tempo.
- `scripts/mix.py`: mixagem com a música 12 dB sob a voz, loudness −14 LUFS.
- `audio/`: falas (mp3 + alinhamento), trilha escolhida (`music_a`), efeitos e mix final.
- Gerar: `bash build.sh`.
