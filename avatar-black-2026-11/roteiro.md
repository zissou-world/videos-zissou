# Avatar Marcio — Black Zissou (vertical)

**Formato:** 1080×1920, 30 fps, cerca de 1m06s.

**Avatar:** HeyGen Avatar 6, gerado a partir de `fotos-originais/foto3.jpg` e falando com a voz clonada do Marcio (ElevenLabs).
- Primeiro, o fundo da foto é removido (BiRefNet portrait) e a pessoa é posta sobre um verde liso. Essa é a referência enviada à HeyGen (`assets/referencia_verde.jpg`).
- Depois, o fundo verde é removido de cada quadro do vídeo da HeyGen (chromakey + despill), e o avatar entra na composição.

**Camadas, de trás para a frente:**
1. Tubetes 3D em tons de azul, com toques coral, levemente desfocados e em movimento lento.
2. Textos grandes, um por vez, e um letreiro que passa por trás da cabeça.
3. O avatar.
4. Ícones 3D (orçamento, conversa, telefone, equipe, troféu, raio) e o megafone 3D no final.
5. A marca no alto.

| Fala | Texto na tela | Ícone 3D |
|---|---|---|
| Bom dia, bom dia, bom diaaa, time! | Bom dia, time! | — |
| Chegamos à semana mais importante da Black Zissou! … transformar as oportunidades que criamos em vendas! | A semana mais importante da Black Zissou. → Energia toda em transformar oportunidade em venda. | Ícone Zissou e troféu |
| Sabe aquele orçamento… Aquele lead… Aquele cliente que visitou a loja… É hora de retomar essas conversas! | Retome seus orçamentos. → Chame seus leads. → Quem visitou a loja e não fechou? → É hora de retomar! | Orçamento e conversa |
| Vamos olhar nossa carteira com atenção… esperando uma atitude nossa! | Entenda o que falta para fechar. | Telefone |
| E vocês, líderes, junto com o time! … Precisou de ajuda? Chama! Vamos resolver juntos! | Líderes e vendedores, juntos. → Precisou de ajuda? Chama! | Equipe |
| Cada conversa retomada pode virar uma venda… aquele sonho mais perto! | Sua próxima venda começa com uma atitude. | Troféu |
| Vamos fazer essa semana valer… vontade de fazer acontecer! | Energia lá em cima! | Raio |
| Bora pra cima, time! Bora vender, tiiime! | Bora pra cima, time! → BORA VENDER, TIMEEEE! + confete + logo | Megafone 3D na boca, com ondas de som |

**Humor no final:** megafone 3D na boca e voz com efeito de megafone (faixa de frequência estreita, leve distorção e eco).

**Custo na HeyGen:** cerca de US$ 0,09 por segundo de vídeo. O teste de 7 s e o vídeo completo de 66 s somaram cerca de US$ 7.

**Para refazer:**
1. `python3 scripts/tts.py`
2. `python3 scripts/cues.py`
3. `python3 scripts/vo_track.py`
4. Envie à HeyGen a referência e `audio/vo_track.wav` (`POST /v3/models/avatars`).
5. Faça o chromakey para `out/frames` e gere o `track.json`.
6. `python3 scripts/mix.py -10`
7. Rode o render com `VW=1080 VH=1920`.
