"""Trilha de 30 s (ElevenLabs Music) seguindo as cenas. Uso: python3 scripts/music.py <saida.mp3> [seed]"""
import json, os, sys, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')
G = ['cinematic modern minimal', 'warm felt piano', 'soft pulsing synth', 'elegant tech keynote atmosphere', 'instrumental', '96 bpm']
N = ['vocals', 'choir', 'singing', 'lyrics', 'guitar solo', 'dubstep', 'cheesy', 'distortion', 'aggressive']
S = [('Reveal', ['shimmering riser', 'soft cinematic impact at the end'], ['drums'], 3400),
     ('Talk', ['intimate warm piano motif', 'subtle low pulse', 'thoughtful, conversational'], ['loud drums'], 18600),
     ('Lift', ['soft kick enters', 'brighter synths', 'urgency, momentum'], ['chaos'], 8500),
     ('Dream', ['drums drop out', 'emotional piano and warm strings pad', 'hopeful'], ['drums'], 9000),
     ('Action', ['beat returns and builds', 'confident, determined, uplifting'], ['chaos'], 17000),
     ('Finale', ['full warm uplifting peak', 'final cinematic hit with short tail'], ['fade out slowly'], 7500)]
plan = {'positive_global_styles': G, 'negative_global_styles': N,
        'sections': [{'section_name': n, 'positive_local_styles': p, 'negative_local_styles': q, 'duration_ms': d, 'lines': []} for n, p, q, d in S]}
body = {'composition_plan': plan, 'model_id': 'music_v1'}
if len(sys.argv) > 2: body['seed'] = int(sys.argv[2])
req = urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', data=json.dumps(body).encode(),
                             headers={'xi-api-key': key, 'Content-Type': 'application/json'})
open(sys.argv[1], 'wb').write(urllib.request.urlopen(req, timeout=600).read())
print('ok', sys.argv[1])
