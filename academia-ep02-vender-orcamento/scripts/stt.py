"""Confere cada fala com transcrição automática (ElevenLabs scribe_v1). Uso: python3 scripts/stt.py [l1 ...]"""
import json, os, sys, uuid, urllib.request, glob
ks = sys.argv[1:] or sorted([os.path.basename(f)[:-4] for f in glob.glob('audio/vo/*.mp3')], key=lambda k: int(k[1:]))
for k in ks:
    b = uuid.uuid4().hex; audio = open(f'audio/vo/{k}.mp3', 'rb').read()
    body = (f'--{b}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\nscribe_v1\r\n--{b}\r\nContent-Disposition: form-data; name="language_code"\r\n\r\npor\r\n'
            f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode() + audio + f'\r\n--{b}--\r\n'.encode()
    req = urllib.request.Request('https://api.elevenlabs.io/v1/speech-to-text', data=body, headers={'xi-api-key': 'proxy-injected', 'Content-Type': f'multipart/form-data; boundary={b}'})
    print(k, json.load(urllib.request.urlopen(req, timeout=120))['text'])
