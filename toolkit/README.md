# Toolkit de vídeo

`bash toolkit/setup.sh` instala tudo numa sessão nova.

| Ferramenta | Para quê | Onde |
|---|---|---|
| Claude Video Studio (claude-video-2) | motion graphics com 21 estilos, render HyperFrames | skill em `.claude/skills/claude-video-studio` |
| pixelfx | 244 efeitos pixel art, sprite sheets | skill em `.claude/skills/pixelfx` (clona a biblioteca quando usa) |
| Lemo-Opuscar | estilos de filme em código | plugin da conta (skill `lemo-opuscar`) |
| three.js, React Three Fiber, drei | 3D | `package.json` |
| @react-three/rapier | física 3D | `package.json` |
| @react-three/postprocessing / postprocessing | pós-processamento (bloom, DOF, grão) | `package.json` |
| librosa | análise de áudio (batidas, tempo, cortes na música) | `requirements.txt` |
| Blender MCP | controlar o Blender por IA | funciona com o Blender aberto no seu computador (não na nuvem) |
