"""Trilha de 30 s (ElevenLabs Music) seguindo as cenas. Uso: python3 scripts/music.py <saida.mp3> [seed]"""
import json, os, sys, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')
G = ['modern uplifting corporate', 'clean minimal electronic', 'warm felt piano', 'soft plucks and marimba', 'instrumental', '104 bpm']
N = ['vocals', 'choir', 'singing', 'lyrics', 'guitar solo', 'dubstep', 'heavy drop', 'cheesy', 'aggressive', 'distortion']
S = [
  ('Intro', ['warm felt piano motif', 'soft pads', 'light ticking pulse', 'curious, thoughtful'], ['drums'], 14000),
  ('Groove', ['soft kick and claps enter', 'bright plucks', 'positive, confident, steady'], ['loud drums'], 21000),
  ('Insight', ['steady groove', 'marimba and piano interplay', 'subtle bass', 'focused, smart'], ['big build'], 26000),
  ('Lift', ['more energy', 'wider synths', 'rising arpeggio', 'optimistic momentum'], ['chaos'], 22000),
  ('Peak', ['full and uplifting', 'big warm chords', 'motivational climax'], ['abrupt cut'], 9000),
  ('Outro', ['short clean ending', 'final piano chord with soft tail'], ['fade out slowly'], 4200),
]
plan = {'positive_global_styles': G, 'negative_global_styles': N,
        'sections': [{'section_name': n, 'positive_local_styles': p, 'negative_local_styles': q, 'duration_ms': d, 'lines': []} for n, p, q, d in S]}
body = {'composition_plan': plan, 'model_id': 'music_v1'}
if len(sys.argv) > 2: body['seed'] = int(sys.argv[2])
req = urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', data=json.dumps(body).encode(),
                             headers={'xi-api-key': key, 'Content-Type': 'application/json'})
open(sys.argv[1], 'wb').write(urllib.request.urlopen(req, timeout=600).read())
print('ok', sys.argv[1])
