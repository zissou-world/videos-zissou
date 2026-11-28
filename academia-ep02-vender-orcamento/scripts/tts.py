"""Falas com a voz clonada (ElevenLabs, com tempos por caractere). Uso: python3 scripts/tts.py [l1 l2 ...]"""
import json, base64, os, sys, urllib.request
VOICE = 'cJSKs33JAhtkV2YLS9Cd'
CALM = dict(stability=.64, similarity_boost=.72, style=.15, speed=.99, use_speaker_boost=True)
WARM = dict(stability=.62, similarity_boost=.72, style=.18, speed=1.0, use_speaker_boost=True)
HOT = dict(stability=.57, similarity_boost=.72, style=.25, speed=1.01, use_speaker_boost=True)
LINES = {
  'l1': ('Imagine o cliente do seu lado. Em menos de dois minutos, ele já tem tudo: os produtos, o total no cartão e no Pix, e o link de pagamento.', HOT),
  'l2': ('Toda venda começa aqui. Vamos montar um orçamento juntos, passo a passo, do jeito que você faz na loja.', dict(stability=.66, similarity_boost=.72, style=.15, speed=.92, use_speaker_boost=True)),
  'l3': ('Toque no botão mais e escolha Novo Orçamento. Você também pode começar direto de uma conversa do WhatsApp, sem sair dela.', WARM),
  'l4': ('Primeiro, o cliente. Se ele já passou pela loja nos últimos noventa dias, aparece aqui em leads recentes: é só tocar no nome. Se não, busque por nome, telefone ou e-mail, ou toque em Cadastrar novo cliente.', WARM),
  'l5': ('Agora, os produtos. Digite o nome ou o código do produto, e toque no item e no tamanho. Repita para cada um: colchão, travesseiro, lençol, protetor. Não esqueça o ritual completo: é ele que aumenta o tíquete.', WARM),
  'l6': ('Foi uma indicação de arquiteto ou arquiteta? Toque em Adicionar arquiteto, e registre quem indicou.', WARM),
  'l7': ('O Desconto de urgência cria um cupom que vale por poucas horas, quando o cliente abre o link. Use quando o cliente está decidido, e você quer que ele feche hoje.', WARM),
  'l8': ('Em Condições comerciais, você marca por onde atendeu: cliente na loja, WhatsApp, telefone ou outro. Isso só identifica o canal; não registra visita. Depois, confira o frete, o prazo de entrega e a validade, que é de sete dias. Se for entrega futura, marque aqui.', CALM),
  'l9': ('Lá embaixo está o total, com o valor no cartão e no Pix. Você ajusta as condições ali mesmo, e o cliente vê exatamente esses valores no link.', WARM),
  'l10': ('Atenção à regra: o desconto nunca passa da sua alçada. Se o cliente pedir mais, o orçamento precisa da aprovação do líder ou da coordenação, e você acompanha a resposta ali mesmo. Sem atalho.', CALM),
  'l11': ('Use Observações para o que o cliente precisa ler: o combinado de entrega, um detalhe do produto. Esse texto aparece no PDF e no link.', WARM),
  'l12': ('Tudo certo? Toque em Salvar e enviar. O cliente recebe o link oficial do orçamento da Ziçu, e paga direto por ali. Ainda está negociando? Salve como rascunho, e termine depois.', HOT),
  'l13': ('Cliente entrou, conversou e não fechou? Registre a visita: nome, telefone, o que procurava e como foi. É essa visita que gera os seus follow-ups, e não deixa nenhum cliente cair no esquecimento.', WARM),
  'l14': ('Em Compras na Loja, você vê as visitas e as vendas da loja. Use os filtros para acompanhar o seu resultado e o do time.', CALM),
  'l15': ('Resumindo: cliente, produtos, condições, enviar e registrar a visita. Antes de ir, confira o checklist e faça cada item no seu portal.', HOT),
  'l16': ('No próximo vídeo, vamos acompanhar esses orçamentos até virar venda. Até lá!', HOT),
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
