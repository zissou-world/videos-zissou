"""Trilha de 30 s (ElevenLabs Music) seguindo as cenas. Uso: python3 scripts/music.py <saida.mp3> [seed]"""
import json, os, sys, urllib.request
key = os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')
G = ['cinematic modern corporate', 'emotional piano', 'soft analog synth pads', 'instrumental', '92 bpm building to driving electronic pulse']
N = ['vocals', 'choir', 'singing', 'lyrics', 'guitar solo', 'dubstep', 'heavy drop', 'cheesy', 'trap hi-hats']
S = [
  ('Question', ['single soft felt piano note', 'airy warm atmosphere pad', 'very sparse, intimate, lots of space'], ['drums', 'beat'], 3000),
  ('Dreams', ['gentle warm piano melody', 'hopeful major key', 'soft pad swells'], ['drums'], 5000),
  ('Opportunity', ['pulsing electronic beat enters', 'soft kick and sidechained synth pulse', 'piano continues', 'music starts to grow'], ['loud drums'], 6000),
  ('Accelerate', ['beat more present', 'elegant deep sub bass', 'driving forward momentum', 'rising arpeggio'], ['distortion'], 5000),
  ('Build', ['music grows to its strongest point', 'full drums, wide synths, piano chords', 'steady build'], ['chaos'], 6000),
  ('Finale', ['climax with big warm chord', 'then short elegant sonic logo signature', 'clean ending with soft piano tail'], ['fade out slowly', 'abrupt cut'], 5000),
]
plan = {'positive_global_styles': G, 'negative_global_styles': N,
        'sections': [{'section_name': n, 'positive_local_styles': p, 'negative_local_styles': q, 'duration_ms': d, 'lines': []} for n, p, q, d in S]}
body = {'composition_plan': plan, 'model_id': 'music_v1'}
if len(sys.argv) > 2: body['seed'] = int(sys.argv[2])
req = urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', data=json.dumps(body).encode(),
                             headers={'xi-api-key': key, 'Content-Type': 'application/json'})
open(sys.argv[1], 'wb').write(urllib.request.urlopen(req, timeout=600).read())
print('ok', sys.argv[1])
