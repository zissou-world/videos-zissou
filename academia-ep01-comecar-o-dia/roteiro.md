# Zissou World Academy · Portal do Vendedor — EP. 01 · Começar o dia

**Duração:** 3m12s · 1920×1080 · 30 fps · legendas em `ep01-comecar-o-dia.srt`
**Objetivo:** ensinar ao vendedor o que fazer no Portal do Vendedor no começo do turno: entrar, escolher a loja, ativar as notificações, ficar Online, ler o placar, as premiações e a meta, trabalhar o "Preciso agir" e usar os atalhos (botão +, Estoque, Histórico do Cliente e Notificações).
**Fonte:** PDF "Vídeo 01 — Começar o dia" (14 cenas, 4 capítulos e um checklist).
**Estética:** padrão de série de treinamento.
- **Abertura:** ícone Zissou em 3D e o selo "ZISSOU WORLD ACADEMY", com transição em íris.
- **Cenas na loja:** b-roll gerado no Higgsfield, seguindo o guia da loja (vendedor de camiseta branca e calça azul-marinho, tablet Samsung). Na tela do tablet entram imagens reais do portal.
- **Cenas de tela:** palco claro com as cores Zissou (coral, ardósia, azul-noite) e telas do portal num tablet em mockup. A câmera dá zoom no ponto explicado, com anel de destaque e cursor.
- **Capítulos:** cartões com ícones 3D e uma barra de progresso no topo.
- **Fechamento:** "Dica de ouro", checklist final e um cartão do próximo episódio.

**Cuidados:**
- Pessoas e loja das cenas de b-roll são geradas por IA e não representam funcionários reais.
- Os nomes "Loja 2 (exemplo)" e "Loja 3 (exemplo)" são fictícios.
- A tela de login foi redesenhada, porque o PDF não traz essa tela.

## Capítulos (para a descrição do vídeo)
```
0:00 Abertura
0:23 Capítulo 01 · Entrar e escolher a loja
1:06 Capítulo 02 · Placar e premiações
1:46 Capítulo 03 · Preciso agir
2:09 Capítulo 04 · Atalhos e estoque
2:54 Checklist do dia
3:03 Próximo episódio
```

| # | Cena | Visual | Locução |
|---|---|---|---|
| 0 | **Abertura** | Ícone Zissou 3D em luz coral. Selo "ZISSOU WORLD ACADEMY · Portal do Vendedor" e a abertura em íris para o b-roll. | Trilha e efeitos. |
| 1 | **Gancho** | O vendedor chega à loja e pega o tablet. Título "EP. 01 · Começar o dia". Na tela do tablet real aparece a tela Início do portal. | "Bom dia! Este é o seu Zissou World. Antes do primeiro cliente entrar na loja, ele já te conta quanto você vendeu, quanto falta para a meta e quem está esperando o seu retorno. Em poucos minutos, você vai dominar o começo do dia." |
| 2 | **Cap. 01 · Entrar e escolher a loja** | Login com CPF e senha, depois "Em qual loja você está hoje?" com a loja marcada. | "Entre com o seu CPF e a sua senha. Logo na primeira tela do dia, escolha a loja onde você está hoje. Orçamentos e visitas ficam registrados nessa loja. O seu ranking e a sua comissão continuam na sua loja base, então pode escolher sem medo." |
| 3 | **Notificações** | Pop-up "Ativar notificações" com destaque no botão. | "Quando aparecer este aviso, toque em Ativar notificações…" |
| 4 | **Status Online** | Zoom no status do topo. Comparação Online × Offline. | "Lá em cima fica o seu status. Online, você recebe clientes novos do WhatsApp…" |
| 5 | **Cap. 02 · Placar** | Placar do Início e o "olhinho" que esconde os valores. | "Aqui está o seu placar: vendas de hoje, visitas do mês e conversões…" |
| 6 | **Premiações** | Troféu 3D. Destaque em "Sua posição" e "Quanto está em jogo", depois zoom em "Ranking e regras". | "Logo abaixo ficam as premiações…" |
| 7 | **Meta da loja** | Infográfico: loja física + online = meta total, e a meta de hoje. | "A meta da loja tem duas partes: loja física e online…" |
| 8 | **Cap. 03 · Preciso agir** | Tablet real na loja com a tela "Preciso agir", depois zoom em "Continuar contatos". Cartão "Dica de ouro". | "Preciso agir é a sua lista do dia… A dica de ouro: comece sempre por aqui, e toque em Continuar contatos." |
| 9 | **Fechamentos e escala** | Orçamentos mais perto de fechar e escala da semana. | "Mais abaixo, você encontra os orçamentos mais perto de fechar…" |
| 10 | **Cap. 04 · Botão +** | Menu do botão + com os 4 atalhos numerados. | "Esse botão redondo é o seu atalho…" |
| 11 | **Estoque** | Modal de Estoque e aba "Por loja". | "Cliente perguntou se tem na loja? Toque em Estoque…" |
| 12 | **Histórico do Cliente** | Barra de busca do histórico. | "Pelo ícone de pessoa no topo, você abre o Histórico do Cliente…" |
| 13 | **Avisos** | Preferências de notificação, com o alerta "não desligue cliente novo na fila". | "Em Notificações, você escolhe o que quer receber…" |
| 14 | **Checklist** | Checklist animado, com um item marcado de cada vez. | "Pronto! Você já sabe começar o dia. Antes de ir, confira o checklist e faça cada item no seu portal." |
| 15 | **Próximo episódio** | B-roll do vendedor atendendo, cartão "Próximo episódio · 02 · Vender" e a assinatura Zissou World Academy. | "No próximo vídeo, vamos criar um orçamento do zero e registrar a visita. Até lá!" |

## Locução e som
- Voz clonada do Marcio (ElevenLabs). Para a pronúncia, o texto enviado à voz grafa "Ziçu Uórld". Cada fala foi conferida com transcrição automática.
- Trilha original, cinematográfica, com sidechain sob a voz. Os capítulos entram com efeitos de whoosh e reveal. Loudness final de −14 LUFS.
- Legendas: `ep01-comecar-o-dia.srt` (57 blocos, grafia real "Zissou World"), geradas pelo `scripts/srt.py` a partir dos tempos por palavra.

## Como gerar de novo
1. `python3 scripts/tts.py`, depois `scripts/cues.py`, `scripts/music.py` e `scripts/mix.py`.
2. `python3 scripts/tela_no_tablet.py broll/raw_tablet_verde.mp4 telas/X.png broll/tablet_X.mp4 pingpong`.
3. `cd render && node render.mjs video ../out/chunks 0 5765`.
4. Concatenar os chunks e juntar com `audio/mix.wav`.
