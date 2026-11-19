"""Coloca as falas em sequência por cena e gera cues.json (segmentos, palavras, limites das cenas)."""
import json
SCENES = [['l1', 'l2'], ['l3'], ['l4'], ['l5'], ['l6', 'l7'], ['l8'], ['l9', 'l10'], ['l11']]
START, GAP_IN, GAP_SCENE, TAIL = 1.3, .45, 1.5, 3.6
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
    if si: t += GAP_SCENE
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
