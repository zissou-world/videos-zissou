"""Falas com a voz clonada (ElevenLabs, com tempos por caractere). Uso: python3 scripts/tts.py [l1 l2 ...]"""
import json, base64, os, sys, urllib.request
VOICE = 'cJSKs33JAhtkV2YLS9Cd'
CALM = dict(stability=.62, similarity_boost=.72, style=.15, speed=1.03, use_speaker_boost=True)
WARM = dict(stability=.6, similarity_boost=.72, style=.18, speed=1.04, use_speaker_boost=True)
HOT = dict(stability=.55, similarity_boost=.72, style=.25, speed=1.05, use_speaker_boost=True)
LINES = {
  'l1': ('Oi, time! Agora, todo cliente que chama a Ziçu no WhatsApp é recebido primeiro pelo nosso robô.', WARM),
  'l2': ('Ele não substitui ninguém. Ele organiza o atendimento, para que cada cliente chegue à pessoa certa, já com as informações na mão.', WARM),
  'l3': ('Neste vídeo, vou mostrar como funciona e o que muda no dia a dia de vocês.', CALM),
  'l4': ('Quando o cliente escreve, o robô responde: Olá, que bom ter você na Ziçu! Como podemos te ajudar hoje?', WARM),
  'l5': ('São só duas opções. Quem quer comprar vai para Vendas. Quem já comprou vai para o Pós-Venda.', CALM),
  'l6': ('Com uma escolha, a conversa já fica separada.', CALM),
  'l7': ('Quem toca em Quero comprar vai direto para a fila de Vendas, sem menu no meio.', WARM),
  'l8': ('O cliente recebe a confirmação de que está na fila e, fora do horário, já fica sabendo quando a loja abre.', CALM),
  'l9': ('Quem responde a uma campanha, como a Black, também cai direto em Vendas.', WARM),
  'l10': ('Para o vendedor, a conversa aparece com a etiqueta Fila de Vendas. O primeiro que aceitar assume o cliente.', WARM),
  'l11': ('Lide chegando quente e organizado: quanto mais rápido aceitar, maior a chance de venda.', HOT),
  'l12': ('Quem já comprou não precisa digitar nada. O robô encontra as compras pelo celular da conversa.', WARM),
  'l13': ('Se houver só uma, ele pergunta se é sobre ela. Se houver várias, mostra uma lista com data e produtos.', CALM),
  'l14': ('Se o cliente quiser, também pode buscar pelo CPF, sempre com segurança: só aparecem pedidos ligados àquele telefone.', CALM),
  'l15': ('Depois, ele pergunta o assunto.', CALM),
  'l16': ('Nota fiscal e rastreio, o robô resolve sozinho: envia a nota ou o link de rastreio na hora, e pergunta: isso resolveu?', WARM),
  'l17': ('Se o cliente disser que sim, o atendimento termina ali, sem ocupar ninguém. Se pedir especialista, vai para a fila do Pós-Venda. Se não responder em quatro horas, o atendimento é encerrado sozinho.', CALM),
  'l18': ('Na troca ou devolução, o robô pergunta qual item e o motivo. Na garantia, pede para o cliente contar o que aconteceu.', CALM),
  'l19': ('Aqui está a maior mudança para vocês. Quando a conversa chega, vem um resumo: o pedido, o que o cliente pediu, quais itens, o motivo, o que o robô já respondeu e o que falta resolver.', WARM),
  'l20': ('Áudios do cliente também chegam transcritos.', CALM),
  'l21': ('Vocês não precisam perguntar tudo de novo. O cliente não precisa repetir a história. É só ler o resumo e resolver.', WARM),
  'l22': ('E, na troca ou devolução, fica o lembrete: sempre tente reverter um cancelamento ou devolução para uma troca.', WARM),
  'l23': ('Enquanto espera, se o cliente mandar outra mensagem, o robô avisa que ele já está na fila e não precisa mandar de novo.', CALM),
  'l24': ('A qualquer momento, ele pode escrever Menu para voltar às opções.', CALM),
  'l25': ('E o sistema vigia tudo a cada dez minutos. Se um cliente ficar parado, o time e a liderança recebem um alerta. Nenhum cliente fica esquecido.', WARM),
  'l26': ('Resumindo o que melhora.', CALM),
  'l27': ('Separação: venda com Vendas, pós-venda com Pós-Venda, sem conversa no lugar errado.', WARM),
  'l28': ('Velocidade: nota e rastreio saem na hora, mesmo de madrugada.', WARM),
  'l29': ('Foco: vocês ficam com os casos que precisam de gente, como troca, garantia e venda.', WARM),
  'l30': ('Qualidade: cada atendimento começa com o contexto completo, e a gente mede o que o robô resolve, para melhorar sempre.', WARM),
  'l31': ('O robô cuida da organização, e vocês cuidam do que faz a diferença: o cliente.', WARM),
  'l32': ('Qualquer dúvida ou situação estranha, mandem o print para a liderança, que a gente ajusta. Bora!', HOT),
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
