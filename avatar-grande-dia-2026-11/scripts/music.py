"""Trilha de 30 s (ElevenLabs Music) seguindo as cenas. Uso: python3 scripts/music.py <saida.mp3> [seed]"""
import json, os, sys, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')
G = ['cinematic emotional to triumphant', 'premium modern keynote score', 'piano strings and modern drums', 'instrumental', '100 bpm']
N = ['vocals', 'choir', 'singing', 'lyrics', 'guitar solo', 'dubstep', 'cheesy', 'distortion']
S = [('Reveal', ['shimmering cinematic riser', 'soft impact'], ['drums'], 3400), ('Morning', ['bright uplifting pulse', 'warm piano and soft beat', 'joyful morning energy'], ['heavy drums'], 6705), ('Gratitude', ['emotional piano and warm strings', 'grateful, heartfelt, cinematic'], ['drums'], 22276), ('Turn', ['rising tension swell', 'anticipation'], ['calm'], 3000), ('Conquest', ['driving confident beat', 'big drums and strings', 'determined, victorious'], ['chaos'], 23008), ('Climax', ['bigger anthem build', 'epic, triumphant'], ['calm'], 14196), ('Finale', ['explosive triumphant drop', 'huge final hit with short tail'], ['fade out slowly'], 5170)]
plan = {'positive_global_styles': G, 'negative_global_styles': N,
        'sections': [{'section_name': n, 'positive_local_styles': p, 'negative_local_styles': q, 'duration_ms': d, 'lines': []} for n, p, q, d in S]}
body = {'composition_plan': plan, 'model_id': 'music_v1'}
if len(sys.argv) > 2: body['seed'] = int(sys.argv[2])
req = urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', data=json.dumps(body).encode(),
                             headers={'xi-api-key': key, 'Content-Type': 'application/json'})
open(sys.argv[1], 'wb').write(urllib.request.urlopen(req, timeout=600).read())
print('ok', sys.argv[1])
