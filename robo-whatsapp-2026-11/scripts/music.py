"""Trilha de 30 s (ElevenLabs Music) seguindo as cenas. Uso: python3 scripts/music.py <saida.mp3> [seed]"""
import json, os, sys, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')
G = ['premium modern tech product video score', 'clean minimal electronic', 'soft piano and plucks', 'instrumental', '104 bpm']
N = ['vocals', 'choir', 'singing', 'lyrics', 'guitar solo', 'dubstep', 'cheesy', 'distortion', 'aggressive']
S = [('Opening', ['elegant modern tech intro', 'soft piano and airy synth', 'optimistic'], ['drums'], 21489), ('First contact', ['light pulse beat', 'clean plucks', 'curious, friendly'], ['heavy drums'], 16042), ('Sales path', ['upbeat steady groove', 'confident, quick'], ['chaos'], 28527), ('After sales', ['calm focused groove', 'warm keys', 'clear, helpful'], ['loud drums'], 48210), ('Agent view', ['slightly more emotional', 'warm pads and piano', 'insightful'], ['heavy drums'], 27835), ('Queue', ['steady pulse', 'reassuring'], ['chaos'], 20965), ('Gains', ['building uplifting groove', 'bright synths', 'positive momentum'], ['calm'], 25090), ('Closing', ['warm confident resolution', 'final soft hit'], ['fade out slowly'], 14492)]
plan = {'positive_global_styles': G, 'negative_global_styles': N,
        'sections': [{'section_name': n, 'positive_local_styles': p, 'negative_local_styles': q, 'duration_ms': d, 'lines': []} for n, p, q, d in S]}
body = {'composition_plan': plan, 'model_id': 'music_v1'}
if len(sys.argv) > 2: body['seed'] = int(sys.argv[2])
req = urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', data=json.dumps(body).encode(),
                             headers={'xi-api-key': key, 'Content-Type': 'application/json'})
open(sys.argv[1], 'wb').write(urllib.request.urlopen(req, timeout=600).read())
print('ok', sys.argv[1])
