# Reunião mensal — outubro/2026

Vídeo de 2m18s (1080p, 30 fps) para a reunião mensal do time de vendas. Cenas: abertura Black, Outubro em números, pódio, o time em ação, BH Shopping, reforços no time, promoções, Next Night e encerramento.

## Como gerar
- `bash build.sh` gera dois arquivos:
  - `out/Reuniao_Mensal_Outubro_Fotos.mp4` — versão leve, ~17 MB
  - `out/Reuniao_Mensal_Outubro_Fotos_Telao.mp4` — versão telão, ~80 MB
- `CHUNKS="960 1080" bash build.sh` re-renderiza só alguns blocos de 120 quadros. O bloco N começa no segundo N/30.
- Quadros soltos para revisar: `cd render && node render.mjs stills ../out/stills 5,70.5,105`.
- Comparar com o vídeo de referência: `python3 scripts/comparar_video.py referencias/original_outubro_sem_fotos.mp4 out/<video>.mp4 out/cmp 10,50,90`.

## Estrutura
| Pasta / arquivo | Conteúdo |
|---|---|
| `render/main.js` | Todas as cenas: three.js para o 3D (ícone, pódio, loja, formas) e canvas 2D para textos e cards. Os tempos seguem as palavras da locução. |
| `render/render.mjs` | Abre o Chromium headless e grava blocos de 120 quadros. É retomável. |
| `render/variantes/` | Versões alternativas de cenas. Exemplo: pódio v2 com fotos redondas e medalhas. Para usar, copie por cima do `main.js`. |
| `assets/` | Fontes ZonaPro, logo, `icone.png`, `icon_shape.json` (contorno extrudado em 3D), fotos recortadas, `audio_orig.m4a` (áudio final: locução + trilha) e `stt.json` (tempo de cada palavra). |
| `fotos-originais/` | Fotos como foram enviadas. |
| `scripts/preparar_fotos.py` | Recorta as fotos (círculos 600×600 e pódio 900×600) com os parâmetros usados. Para uma pessoa nova, adicione uma linha. |
| `scripts/tracar_icone.py` | Gera `icon_shape.json` a partir do `icone.png`. |
| `scripts/comparar_*.py` | Folhas lado a lado: original × novo. |
| `referencias/original_outubro_sem_fotos.mp4` | Vídeo de outubro sem fotos, usado como referência de layout e tempos. |

## Ferramentas (versões usadas)
- Node 22, three 0.169.0 (`npm ci` em `render/`) e Playwright 1.63 com o Chromium que vem com ele.
- ffmpeg 6.1.
- Python 3: Pillow 12, opencv-python-headless e numpy. Só o `tracar_icone.py` precisa de opencv.

## Locução e trilha (ElevenLabs)
- Voz clonada "Marcio - Zissou (vendas)", voice_id `cJSKs33JAhtkV2YLS9Cd`, modelo `eleven_multilingual_v2`.
- Ajustes da voz:
  - Padrão: speed 1.02, stability 0.65, style 0.12, similarity 0.72.
  - Frases finais, mais animadas: stability 0.55, style 0.25, speed 1.03.
- Escrita para pronúncia:
  - No texto da locução: "Ziçu" (Zissou), "Bê Agá Shopping", números por extenso.
  - Na tela: grafia normal.
- Mixagem: música cerca de 12 dB abaixo da voz, loudness final de −14 LUFS.
- A chave da API **não** fica no repositório. Ela está salva como segredo de rede no ambiente do Claude Code (host `api.elevenlabs.io`).
- Para regerar as falas, chame a API de text-to-speech com esse voice_id e esses parâmetros. O mesmo vale para a trilha, com a API de música.

## Dados
- Fonte Shopify, outubro/2026: total de vendas R$ 2.828.532, 646 pedidos, ticket médio R$ 4.739 e vendas por dia (fixas em `main.js`, array `DAYS`).
- Pódio e números do time: enviados pela gestão.
