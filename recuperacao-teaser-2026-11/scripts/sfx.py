"""Efeitos sonoros (ElevenLabs sound generation). Uso: python3 scripts/sfx.py"""
import json, os, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')
FX = {
  'riser': ('cinematic tension riser, rising whoosh building up, clean, no impact at end', 1.4),
  'impact': ('deep cinematic boom impact with bright shimmer tail, trailer hit, clean', 2.0),
}
os.makedirs('audio/sfx', exist_ok=True)
for k, (txt, d) in FX.items():
    req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192',
        data=json.dumps({'text': txt, 'duration_seconds': d, 'prompt_influence': .6}).encode(),
        headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    open(f'audio/sfx/{k}.mp3', 'wb').write(urllib.request.urlopen(req, timeout=120).read()); print(k)
