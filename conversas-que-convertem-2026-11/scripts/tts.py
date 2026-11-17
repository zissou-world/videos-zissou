"""Falas com a voz clonada (ElevenLabs, com tempos por caractere). Uso: python3 scripts/tts.py [l1 l2 ...]"""
import json, base64, os, sys, urllib.request
VOICE = 'cJSKs33JAhtkV2YLS9Cd'
CALM = dict(stability=.62, similarity_boost=.72, style=.15, speed=1.03, use_speaker_boost=True)
WARM = dict(stability=.6, similarity_boost=.72, style=.18, speed=1.04, use_speaker_boost=True)
HOT = dict(stability=.55, similarity_boost=.72, style=.25, speed=1.05, use_speaker_boost=True)
LINES = {
  'l1': ("Analisamos dois mil, duzentos e dezenove atendimentos no WhatsApp e cruzamos cada conversa com as vendas.", CALM),
  'l2': ("Trezentos e cinquenta e quatro viraram compra. Mas o que separa uma conversa que vende de uma que não vende?", CALM),
  'l3': ("Primeiro: orçamento concreto. Criar o orçamento quase triplica a chance de venda.", WARM),
  'l4': ("E mandar o link faz diferença: quem mais vende envia o link em vinte e nove por cento das conversas. Quem menos vende, em dez.", WARM),
  'l5': ("Segundo: leve o cliente para a loja. O convite dobra a chance de venda, e quando ele vai, dois em cada três compram.", WARM),
  'l6': ("Terceiro: o cliente avisa quando está pronto. Perguntou de prazo de entrega? Quarenta e sete por cento compram. De pagamento? Quarenta e três.", WARM),
  'l7': ("Nesse momento, responda rápido e já mande o link.", HOT),
  'l8': ("Quarto: quando o cliente acha caro, ele está perto de comprar. Quarenta e dois por cento fecham.", WARM),
  'l9': ("Responda com algo concreto: uma condição, o orçamento ou o convite para a loja. Só defender o produto converte vinte e sete por cento.", WARM),
  'l10': ("Quinto: não existe frase mágica, existe próximo passo.", WARM),
  'l11': ("Mensagens vagas, como, se você ainda tem interesse, ou, qualquer dúvida, devolvem a decisão ao cliente e vendem de três a seis por cento.", WARM),
  'l15': ("Nas conversas que vendem, o vendedor é concreto: dá o prazo em dias úteis, explica a condição, manda o link e pergunta: você consegue finalizar hoje?", WARM),
  'l12': ("E seja rápido no que importa: metade das compras sai em até doze horas, e três em cada quatro, em até três dias.", WARM),
  'l13': ("Na sua próxima conversa: pergunte, monte o orçamento, mande o link, convide para a loja e peça os dados para fechar.", HOT),
  'l14': ("Conversa concreta vende mais. Bora vender, time!", HOT),
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
