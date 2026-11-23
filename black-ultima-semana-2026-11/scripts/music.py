"""Trilha de 30 s (ElevenLabs Music) seguindo as cenas. Uso: python3 scripts/music.py <saida.mp3> [seed]"""
import json, os, sys, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')
G = ['energetic motivational electronic pop', 'driving four on the floor beat', 'bright synth stabs and plucks', 'big sales kickoff energy', 'instrumental', '124 bpm']
N = ['vocals', 'choir', 'singing', 'lyrics', 'guitar solo', 'dubstep', 'cheesy', 'distortion', 'sad']
S = [('Intro', ['punchy riser into the beat', 'claps', 'excited'], ['slow'], 7500),
     ('Drive', ['steady driving beat', 'pulsing bass', 'confident, focused'], ['big drop'], 26000),
     ('Rise', ['building energy', 'snare roll build', 'anticipation'], ['calm'], 14000),
     ('Breakdown', ['beat drops out', 'warm emotional piano and pads', 'hopeful, dreamy'], ['drums'], 9000),
     ('Build', ['beat returns', 'growing synths', 'uplifting, determined'], ['chaos'], 23000),
     ('Finale', ['full energy anthem peak', 'then a big final hit with short tail'], ['fade out slowly'], 8900)]
plan = {'positive_global_styles': G, 'negative_global_styles': N,
        'sections': [{'section_name': n, 'positive_local_styles': p, 'negative_local_styles': q, 'duration_ms': d, 'lines': []} for n, p, q, d in S]}
body = {'composition_plan': plan, 'model_id': 'music_v1'}
if len(sys.argv) > 2: body['seed'] = int(sys.argv[2])
req = urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', data=json.dumps(body).encode(),
                             headers={'xi-api-key': key, 'Content-Type': 'application/json'})
open(sys.argv[1], 'wb').write(urllib.request.urlopen(req, timeout=600).read())
print('ok', sys.argv[1])
