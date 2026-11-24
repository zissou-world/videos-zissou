"""Falas com a voz clonada (ElevenLabs, com tempos por caractere). Uso: python3 scripts/tts.py [l1 l2 ...]"""
import json, base64, os, sys, urllib.request
VOICE = 'cJSKs33JAhtkV2YLS9Cd'
CALM = dict(stability=.62, similarity_boost=.72, style=.15, speed=1.03, use_speaker_boost=True)
WARM = dict(stability=.6, similarity_boost=.72, style=.18, speed=1.04, use_speaker_boost=True)
HOT = dict(stability=.55, similarity_boost=.72, style=.25, speed=1.05, use_speaker_boost=True)
CONV = dict(stability=.5, similarity_boost=.75, style=.22, speed=1.0, use_speaker_boost=True)
LINES = {
  'l1': ("Quem recebeu um orçamento seu e ainda não fechou?", CONV),
  'l2': ("Pensou em alguém? Então esse vídeo é pra você.", CONV),
  'l3': ("Esse cliente foi à loja, experimentou, gostou... mas alguma coisa ficou faltando. Você sabe o que foi?", CONV),
  'l4': ("Às vezes, a gente fica esperando uma resposta... quando precisa fazer mais uma pergunta: o que falta pra gente resolver isso juntos?", CONV),
  'l5': ("Time, hoje é quarta! A sexta de Black está chegando, mas as conversas que podem fazer essa semana ser histórica precisam acontecer agora!", HOT),
  'l6': ("E pensa no seu sonho. Naquela viagem, naquela conquista, no plano que você quer tirar do papel. Você também tem um motivo pra querer fazer uma grande semana. Lembra dele!", CALM),
  'l7': ("Agora transforma essa vontade em atitude: acabou o vídeo, abre sua carteira. Escolhe cinco clientes e retoma essas conversas. Mostra que você lembra deles, escuta e busca uma solução.", WARM),
  'l8': ("Precisou de ajuda? Chama o líder, me chama! Vamos construir essas vendas juntos!", WARM),
  'l9': ("Eu quero ver vocês comemorando resultado e realizando sonhos. Bora vender, time!", HOT),
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
