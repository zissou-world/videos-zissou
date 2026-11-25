"""Trilha de 30 s (ElevenLabs Music) seguindo as cenas. Uso: python3 scripts/music.py <saida.mp3> [seed]"""
import json, os, sys, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')
G = ['euphoric party celebration', 'brass stabs and big drums', 'funky festive groove', 'instrumental', '128 bpm']
N = ['vocals', 'choir', 'singing', 'lyrics', 'sad', 'slow']
S = [('Build', ['snare roll riser', 'anticipation'], ['calm'], 3200), ('Drop', ['explosive festive drop with brass hits', 'big final hit at the end'], ['fade out slowly'], 4400)]
plan = {'positive_global_styles': G, 'negative_global_styles': N,
        'sections': [{'section_name': n, 'positive_local_styles': p, 'negative_local_styles': q, 'duration_ms': d, 'lines': []} for n, p, q, d in S]}
body = {'composition_plan': plan, 'model_id': 'music_v1'}
if len(sys.argv) > 2: body['seed'] = int(sys.argv[2])
req = urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', data=json.dumps(body).encode(),
                             headers={'xi-api-key': key, 'Content-Type': 'application/json'})
open(sys.argv[1], 'wb').write(urllib.request.urlopen(req, timeout=600).read())
print('ok', sys.argv[1])
