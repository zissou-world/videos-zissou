"""Falas com a voz clonada (ElevenLabs, com tempos por caractere). Uso: python3 scripts/tts.py [l1 l2 ...]"""
import json, base64, os, sys, urllib.request
VOICE = 'cJSKs33JAhtkV2YLS9Cd'
CALM = dict(stability=.62, similarity_boost=.72, style=.15, speed=1.03, use_speaker_boost=True)
WARM = dict(stability=.6, similarity_boost=.72, style=.18, speed=1.04, use_speaker_boost=True)
HOT = dict(stability=.55, similarity_boost=.72, style=.25, speed=1.05, use_speaker_boost=True)
LINES = {
  'l1': ('Bom dia! Este é o seu Ziçu World. Antes do primeiro cliente entrar na loja, ele já te conta quanto você vendeu, quanto falta até a meta e quem está esperando o seu retorno. Em poucos minutos, você vai dominar o começo do dia.', HOT),
  'l2': ('Entre com o seu CPF e a sua senha. Logo na primeira tela do dia, escolha a loja onde você está hoje.', WARM),
  'l3': ('Orçamentos e visitas ficam registrados nessa loja. O seu ranking e a sua comissão continuam na sua loja base, então pode escolher sem medo.', WARM),
  'l4': ('Quando aparecer este aviso, toque em Ativar notificações. É assim que você fica sabendo na hora de um cliente novo na fila, de um orçamento vencendo e de um aviso da coordenação.', WARM),
  'l5': ('Lá em cima fica o seu status. Online, você recebe clientes novos do WhatsApp. Offline, você ainda consegue pegar clientes da fila, mas o sistema não manda novos para você. Começou o turno? Fica Online.', WARM),
  'l6': ('Aqui está o seu placar: vendas de hoje, visitas do mês e conversões. Está com cliente do lado, olhando o tablet? Toque no olhinho, e os valores ficam escondidos. Toque de novo, e eles voltam.', WARM),
  'l7': ('Logo abaixo ficam as premiações. Você vê a sua posição, quanto está em jogo e quanto falta para subir. Abra Ranking e regras para entender exatamente como funciona.', WARM),
  'l8': ('A meta da loja tem duas partes: loja física e online. As duas somam para a meta total. A meta de hoje mostra quanto vender no dia para manter o ritmo do mês. Venda conta pelo pedido pago; visita não conta como venda.', CALM),
  'l9': ('Preciso agir é a sua lista do dia: orçamentos vencendo hoje, amanhã e nos próximos dias, e clientes esperando resposta. A dica de ouro: comece sempre por aqui, e toque em Continuar contatos.', HOT),
  'l10': ('Mais abaixo, você encontra os orçamentos mais perto de fechar e a sua escala da semana, com os dias de trabalho e de folga.', CALM),
  'l11': ('Esse botão redondo é o seu atalho. Daqui você registra uma visita presencial, cria um novo orçamento, marca um follow-up ou abre o Fit Lab. No próximo vídeo, vamos usar muito ele.', WARM),
  'l12': ('Cliente perguntou se tem na loja? Toque em Estoque, lá em cima, digite o nome ou o código do produto, e veja o saldo por produto e por loja, já descontando as reservas.', WARM),
  'l13': ('Pelo ícone de pessoa no topo, você abre o Histórico do Cliente. Busque por nome, telefone, e-mail ou CPF, e veja tudo o que ele já comprou antes de começar a conversa.', WARM),
  'l14': ('Em Notificações, você escolhe o que quer receber e pode silenciar fora do horário. Só não desligue os avisos de cliente novo na fila.', CALM),
  'l15': ('Pronto! Você já sabe começar o dia. Antes de ir, confira o checklist e faça cada item no seu portal.', HOT),
  'l16': ('No próximo vídeo, vamos criar um orçamento do zero e registrar a visita. Até lá!', HOT),
}
only = sys.argv[1:] or list(LINES)
key = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')
os.makedirs('audio/vo', exist_ok=True)
for k in only:
    text, vs = LINES[k]
    body = json.dumps({'text': text, 'model_id': 'eleven_multilingual_v2', 'voice_settings': vs}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_192',
                                 data=body, headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    open(f'audio/vo/{k}.mp3', 'wb').write(base64.b64decode(d['audio_base64']))
    json.dump(d['alignment'], open(f'audio/vo/{k}.json', 'w'), ensure_ascii=False)
    print(k, round(d['alignment']['character_end_times_seconds'][-1], 2))
