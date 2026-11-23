"""Falas com a voz clonada (ElevenLabs, com tempos por caractere). Uso: python3 scripts/tts.py [l1 l2 ...]"""
import json, base64, os, sys, urllib.request
VOICE = 'cJSKs33JAhtkV2YLS9Cd'
CALM = dict(stability=.62, similarity_boost=.72, style=.15, speed=1.03, use_speaker_boost=True)
WARM = dict(stability=.6, similarity_boost=.72, style=.18, speed=1.04, use_speaker_boost=True)
HOT = dict(stability=.55, similarity_boost=.72, style=.25, speed=1.05, use_speaker_boost=True)
LINES = {
  'l1': ("Bom dia, bom dia, bom diaaa, time!", HOT),
  'l2': ("Chegamos à semana mais importante do ano. É a última semana da Black da Ziçu!", HOT),
  'l3': ("A gente chegou até aqui em um excelente ritmo, com muita dedicação e muita entrega de vocês.", WARM),
  'l4': ("Só em novembro, já são três milhões e trezentos mil reais em vendas. Trinta e dois por cento a mais que no mesmo período do ano passado.", WARM),
  'l5': ("E o maior mês da história da Ziçu foi justamente novembro do ano passado: quatro milhões e cento e vinte mil. Já chegamos a oitenta por cento disso. Faltam só oitocentos mil.", WARM),
  'l6': ("Sabe quanto a gente vendeu nos últimos oito dias de novembro do ano passado? Um milhão e seiscentos mil. Só na Black Friday, mais de quinhentos mil em um único dia.", WARM),
  'l7': ("Agora é hora de colocar toda a nossa energia nessa reta final e buscar esse recorde juntos!", HOT),
  'l8': ("E eu quero que cada um pense no seu sonho. Naquela conquista que você quer tanto. Essa semana é uma oportunidade de chegar mais perto dela!", CALM),
  'l9': ("Cada cliente que entra, cada conversa, cada orçamento que vocês retomam pode virar uma grande venda.", WARM),
  'l10': ("Vamos estar presentes, ouvir o cliente, caprichar no atendimento e não deixar nenhuma oportunidade passar!", HOT),
  'l11': ("Se precisar de ajuda, chama. Vamos apoiar uns aos outros e fazer acontecer como time!", WARM),
  'l12': ("Eu acredito muito em vocês. Vamos terminar essa semana com orgulho de tudo o que fizemos!", WARM),
  'l13': ("Bora vender, bora bater recorde e fazer a maior Black da história da Ziçu!", HOT),
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
