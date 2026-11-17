"""Efeitos sonoros (ElevenLabs sound generation). Uso: python3 scripts/sfx.py"""
import json, os, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')
FX = {
  'whoosh': ('soft cinematic air whoosh, smooth camera move, subtle, clean, no impact', 1.4),
  'swell': ('gentle rising shimmer swell, airy, elegant transition, subtle', 2.0),
  'snap': ('soft satisfying click of a smooth block locking into place, premium, short, muted', 0.6),
  'reveal': ('warm soft light reveal, gentle airy tone, very subtle', 1.5),
  'pop': ('soft clean user interface pop, glassy, subtle, short', 0.5),
  'tick': ('quick soft digital counter ticking up, subtle, clean', 1.0),
}
os.makedirs('audio/sfx', exist_ok=True)
for k, (txt, d) in FX.items():
    req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192',
        data=json.dumps({'text': txt, 'duration_seconds': d, 'prompt_influence': .6}).encode(),
        headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    open(f'audio/sfx/{k}.mp3', 'wb').write(urllib.request.urlopen(req, timeout=120).read()); print(k)
