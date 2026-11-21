"""Falas com a voz clonada (ElevenLabs, com tempos por caractere). Uso: python3 scripts/tts.py [l1 l2 ...]"""
import json, base64, os, sys, urllib.request
VOICE = 'cJSKs33JAhtkV2YLS9Cd'
CALM = dict(stability=.62, similarity_boost=.72, style=.15, speed=1.03, use_speaker_boost=True)
WARM = dict(stability=.6, similarity_boost=.72, style=.18, speed=1.04, use_speaker_boost=True)
HOT = dict(stability=.55, similarity_boost=.72, style=.25, speed=1.05, use_speaker_boost=True)
LINES = {
  'l1': ("Nem todo cliente pode receber no prazo padrão. Para isso existe a entrega futura.", CALM),
  'l2': ("Entrega futura é quando o cliente ainda não pode, ou não está pronto para receber: a casa está em reforma, ele vai viajar, ou só pode receber a partir de uma data.", WARM),
  'l3': ("A data que você registra é aproximada. Ela não é o dia da entrega: é um guia para o pós-venda entrar em contato com o cliente.", WARM),
  'l4': ("E o prazo do CEP continua valendo: ele começa a contar a partir dessa data.", WARM),
  'l5': ("Funciona assim: você registra a data, o pós-venda usa como guia de contato, o cliente confirma que já pode receber, e o pedido é liberado para envio.", WARM),
  'l6': ("Na loja, no Íglu: no carrinho, toque no ícone de observação, digite entrega futura e a data, e salve.", WARM),
  'l7': ("Confira o texto e só então finalize o pagamento. Depois do pagamento, a observação não pode mais ser editada.", WARM),
  'l8': ("No orçamento do Ziçu Uórld, em condições comerciais, marque: é entrega futura? E preencha a data combinada.", WARM),
  'l9': ("O sistema escreve sozinho no pedido. Atenção: só o prazo de entrega não basta. A caixa precisa estar marcada.", WARM),
  'l10': ("A regra de ouro: o mesmo texto nos dois sistemas. No Íglu, você digita. No Ziçu Uórld, é o sistema que escreve.", HOT),
  'l11': ("Entrega futura bem registrada: cliente tranquilo e pedido no tempo certo. Bora, time!", HOT),
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
