"""Linha do tempo: falas por cena, com pausas maiores antes dos capítulos. Uso: python3 scripts/cues.py"""
import json
SCENES = [['l1'], ['l2', 'l3'], ['l4'], ['l5'], ['l6'], ['l7'], ['l8'], ['l9'], ['l10'], ['l11'], ['l12'], ['l13'], ['l14'], ['l15'], ['l16']]
PRE = {1: 3.2, 4: 3.2, 7: 3.2, 9: 3.2, 13: 1.6, 14: 1.4}   # extra room for chapter cards / checklist / closing
START, GAP_IN, GAP_SCENE, TAIL = 10.0, .5, 1.1, 4.5
def words_of(k):
    a = json.load(open(f'audio/vo/{k}.json'))
    ch, st, en = a['characters'], a['character_start_times_seconds'], a['character_end_times_seconds']
    ws, cur = [], ''
    for c, a0, a1 in zip(ch, st, en):
        if c.isspace():
            if cur: ws.append([cur, t0, pe]); cur = ''
            continue
        if not cur: t0 = a0
        cur += c; pe = a1
    if cur: ws.append([cur, t0, pe])
    return ws, en[-1]
out = {'segments': [], 'words': [], 'scenes': []}
t = START
for si, sc in enumerate(SCENES):
    if si: t += GAP_SCENE + PRE.get(si, 0)
    s0 = t
    for li, k in enumerate(sc):
        if li: t += GAP_IN
        ws, dur = words_of(k)
        out['segments'].append({'line': k, 'from': 0, 'to': round(dur + .05, 3), 'at': round(t, 3), 'scene': si})
        for w, a0, a1 in ws: out['words'].append({'line': k, 'w': w, 't': round(t + a0, 3), 'e': round(t + a1, 3), 'scene': si})
        t += dur
    out['scenes'].append({'i': si, 'voStart': round(s0, 3), 'voEnd': round(t, 3)})
out['duration'] = round(t + TAIL, 2)
json.dump(out, open('cues.json', 'w'), ensure_ascii=False, indent=1)
print('duração', out['duration']); [print(s) for s in out['scenes']]
