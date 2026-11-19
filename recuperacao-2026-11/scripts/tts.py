"""Falas com a voz clonada (ElevenLabs, com tempos por caractere). Uso: python3 scripts/tts.py [l1 l2 ...]"""
import json, base64, os, sys, urllib.request
VOICE = 'cJSKs33JAhtkV2YLS9Cd'
CALM = dict(stability=.62, similarity_boost=.72, style=.15, speed=1.03, use_speaker_boost=True)
WARM = dict(stability=.6, similarity_boost=.72, style=.18, speed=1.04, use_speaker_boost=True)
HOT = dict(stability=.55, similarity_boost=.72, style=.25, speed=1.05, use_speaker_boost=True)
LINES = {
  'l1': ("Todo orçamento em aberto é uma venda que ainda pode acontecer.", CALM),
  'l2': ("Com a Recuperação, o portal ajuda você a trazer esse cliente de volta, com uma condição especial e prazo curto.", WARM),
  'l3': ("Em Meus Orçamentos, abra a aba Recuperação.", WARM),
  'l4': ("Os filtros inteligentes mostram quem esfriou: orçamentos vencidos, clientes que não respondem e conversas paradas.", WARM),
  'l5': ("Selecione os orçamentos de uma vez e toque em Oferecer condição.", WARM),
  'l6': ("Escolha cinco ou dez por cento de desconto extra e a validade, por exemplo, até as vinte e três e cinquenta e nove de hoje.", WARM),
  'l7': ("Dentro da sua alçada, a mensagem sai na hora. Acima dela, vai para aprovação da coordenação, com o motivo.", WARM),
  'l8': ("E o sistema protege a sua venda: deixa de fora quem comprou há pouco ou já está conversando com você.", WARM),
  'l9': ("Depois, acompanhe cada ação: enviados, lidos, respondidos e recuperados.", WARM),
  'l10': ("E fique tranquilo: a venda e a comissão continuam suas.", WARM),
  'l11': ("Recuperação: a condição certa, para o cliente certo, na hora certa. Bora recuperar, time!", HOT),
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
