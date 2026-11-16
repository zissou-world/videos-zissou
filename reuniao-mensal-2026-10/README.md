# Reunião mensal — outubro/2026

Vídeo de 2m18s (1080p, 30 fps) para a reunião mensal do time de vendas: abertura Black, Outubro em números, pódio, o time em ação, BH Shopping, reforços no time, promoções, Next Night e encerramento.

## Como gerar
`bash build.sh` → `out/Reuniao_Mensal_Outubro_Fotos.mp4` (leve, ~17 MB) e `out/Reuniao_Mensal_Outubro_Fotos_Telao.mp4` (telão, ~80 MB).
Para ver quadros soltos: `cd render && node render.mjs stills ../out/stills 5,70.5,105` (PW_PATH apontando para o playwright).

## Estrutura
- `render/main.js` — todas as cenas (three.js para 3D + canvas 2D para textos e cards). Tempos de cada palavra vêm da locução (`assets/stt.json`).
- `render/render.mjs` — abre o Chromium headless e grava blocos de 120 quadros (retomável).
- `assets/` — fontes ZonaPro, ícone (`icon_shape.json` é o contorno extrudado em 3D), logo, fotos já recortadas (`foto_*.jpg` redondas, `foto_*_w.jpg` largas do pódio) e o áudio final (locução + trilha).
- `fotos-originais/` — fotos enviadas, antes do recorte.
- `tools/cmp*.py` — comparação lado a lado com outro vídeo.

## Dados
Vendas por dia, total, pedidos e ticket médio: Shopify (outubro/2026, total de vendas R$ 2.828.532). Pódio e números do time: enviados pela gestão.
