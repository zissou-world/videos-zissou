"""Falas com a voz clonada (ElevenLabs, com tempos por caractere). Uso: python3 scripts/tts.py [l1 l2 ...]"""
import json, base64, os, sys, urllib.request
VOICE = 'cJSKs33JAhtkV2YLS9Cd'
CALM = dict(stability=.62, similarity_boost=.72, style=.15, speed=1.03, use_speaker_boost=True)
WARM = dict(stability=.6, similarity_boost=.72, style=.18, speed=1.04, use_speaker_boost=True)
HOT = dict(stability=.55, similarity_boost=.72, style=.25, speed=1.05, use_speaker_boost=True)
CONV = dict(stability=.5, similarity_boost=.75, style=.22, speed=1.0, use_speaker_boost=True)
PARTY = dict(stability=.38, similarity_boost=.75, style=.45, speed=1.05, use_speaker_boost=True)
LINES = {
  'a1': ("Bom dia, bom dia, bom diaaa, time! Chegou o grande dia!", PARTY),
  'l3': ("Hoje é Black Friday. Hoje é dia de fazer história!", HOT),
  'l4': ("Mas, antes de falar sobre vendas, eu quero falar sobre pessoas.", CALM),
  'l5': ("Quero agradecer a todos que fizeram essa campanha se tornar realidade.", CALM),
  'l6': ("Ao nosso time de tecnologia, de marketing, de produtos, financeiro e de pós-venda, que está fazendo e ainda vai fazer um trabalho incrível para que nossos clientes tenham uma experiência surreal.", WARM),
  'l7': ("Muito obrigado a cada um de vocês!", WARM),
  'l8': ("E agora, nosso time de vendas...", CALM),
  'l9': ("Que orgulho! Que energia! Que dedicação! Que time espetacular!", HOT),
  'l10': ("Olha tudo que já conquistamos juntos. E imagina o que ainda podemos conquistar!", WARM),
  'l11': ("Temos hoje, sábado, domingo e segunda-feira para quebrar todos os recordes.", HOT),
  'l12': ("É hora de colocar toda a nossa energia nessa reta final.", HOT),
  'l13': ("Vamos retomar cada contato, cada orçamento, cada negociação e aproveitar todas as oportunidades.", WARM),
  'l14': ("Não vamos deixar nenhuma venda para trás!", HOT),
  'l15': ("Conto muito com vocês, com essa energia e com essa vontade de fazer acontecer.", WARM),
  'l16': ("Vamos fechar essa campanha com chave de ouro.", WARM),
  'l17': ("Vamos fazer dessa Black a maior Black da história da Ziçu!", HOT),
  'a2': ("Estamos juntos? Boraaaa vender!", PARTY),
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
