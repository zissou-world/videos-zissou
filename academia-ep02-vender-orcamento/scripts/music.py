"""Trilha de 30 s (ElevenLabs Music) seguindo as cenas. Uso: python3 scripts/music.py <saida.mp3> [seed]"""
import json, os, sys, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')
G = ['premium corporate training series score', 'modern cinematic electronic', 'piano, plucks and soft pads', 'instrumental', '104 bpm']
N = ['vocals', 'choir', 'singing', 'lyrics', 'guitar solo', 'dubstep', 'cheesy', 'distortion', 'aggressive']
S = [('Academy open', ['cinematic premium brand reveal', 'shimmering riser', 'big soft impact at the end'], ['vocals'], 10000), ('Hook', ['confident warm groove', 'soft piano and plucks', 'anticipation'], ['heavy drums'], 15600), ('Open the quote', ['clean modern tech groove', 'light pulse', 'focused'], ['chaos'], 24000), ('Products', ['groove continues with brighter synths', 'confident'], ['chaos'], 24000), ('Conditions', ['steady driving beat', 'motivating', 'subtle tension in the middle then release'], ['calm'], 58100), ('Send and visit', ['uplifting modern groove', 'helpful, light'], ['chaos'], 36300), ('Closing', ['uplifting warm resolution', 'final cinematic hit'], ['fade out slowly'], 22930)]
plan = {'positive_global_styles': G, 'negative_global_styles': N,
        'sections': [{'section_name': n, 'positive_local_styles': p, 'negative_local_styles': q, 'duration_ms': d, 'lines': []} for n, p, q, d in S]}
body = {'composition_plan': plan, 'model_id': 'music_v1'}
if len(sys.argv) > 2: body['seed'] = int(sys.argv[2])
req = urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', data=json.dumps(body).encode(),
                             headers={'xi-api-key': key, 'Content-Type': 'application/json'})
open(sys.argv[1], 'wb').write(urllib.request.urlopen(req, timeout=600).read())
print('ok', sys.argv[1])
