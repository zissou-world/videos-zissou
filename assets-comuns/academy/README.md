# Vinheta da Zissou World Academy

Abertura comum a todos os episódios da série "Zissou World Academy · Portal do Vendedor".

- `intro_higgsfield.mp4`: tomada gerada no Higgsfield (Seedance 2.5, 6 s, 96 créditos). Macro do tecido de cama em luz dourada, ripados terracota, a câmera atravessa os ripados e pousa no ícone 3D.
- `intro_end_frame.png`: quadro final usado como `end_image`. É o quadro de 1,5 s da abertura dos episódios (ícone 3D em cerâmica perolada, renderizado em three.js), então a vinheta termina exatamente onde o episódio começa.
- `intro_30fps.mp4`: a vinheta em 30 fps, com um ajuste de posição e escala no último segundo para encaixar no quadro do episódio.
- `montar_com_vinheta.sh`: junta a vinheta ao episódio (corte em 1,5 s, fusão de 0,3 s). A mixagem do episódio é feita com `PRE=4.24 python3 scripts/mix.py`, e as legendas com `PRE=4.24 python3 scripts/srt.py`.
