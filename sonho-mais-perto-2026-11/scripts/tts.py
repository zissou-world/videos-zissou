"""Gera as falas com a voz clonada (ElevenLabs, com tempos por caractere). Uso: python3 scripts/tts.py
A chave vem do proxy do ambiente (segredo de rede); localmente defina ELEVENLABS_API_KEY."""
import json, base64, os, sys, urllib.request
VOICE = 'cJSKs33JAhtkV2YLS9Cd'
CALM = dict(stability=.62, similarity_boost=.72, style=.16, speed=1.0, use_speaker_boost=True)
WARM = dict(stability=.6, similarity_boost=.72, style=.18, speed=1.02, use_speaker_boost=True)
HOT = dict(stability=.55, similarity_boost=.72, style=.25, speed=1.04, use_speaker_boost=True)
LINES = {
    'l1': ("Você tem um sonho?", CALM),
    'l2': ("Aquela viagem. A casa própria. Mais conforto para sua família.", WARM),
    'l3': ("As vendas desta segunda quinzena podem deixar esse sonho mais perto de você.", WARM),
    'l4': ("Entramos na reta final da Black Ziçu. É hora de acelerar.", HOT),
    'l5': ("Cuidar de cada cliente, buscar cada oportunidade e dar o nosso melhor.", HOT),
    'l6': ("Seu sonho merece a sua melhor versão. Bora vender, time!", HOT),
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
    a = d['alignment']; print(k, round(a['character_end_times_seconds'][-1], 2), 's')
