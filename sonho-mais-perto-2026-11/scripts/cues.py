"""Posiciona as falas (algumas divididas em frases) e gera cues.json: segmentos de áudio e início de cada palavra.
SEG: fala -> lista de (início no arquivo, fim no arquivo, posição no vídeo)."""
import json
SEG = {
    'l1': [(0, None, 0.6)],
    'l2': [(0, .775, 3.2), (.775, 1.635, 4.75), (1.635, None, 6.1)],
    'l3': [(0, None, 8.35)],
    'l4': [(0, None, 14.25)],
    'l5': [(0, 1.155, 19.3), (1.155, 2.51, 20.7), (2.51, None, 22.2)],
    'l6': [(0, None, 25.2)],
}
out = {'segments': [], 'words': []}
for k, segs in SEG.items():
    a = json.load(open(f'audio/vo/{k}.json'))
    ch, st, en = a['characters'], a['character_start_times_seconds'], a['character_end_times_seconds']
    words, cur = [], ''
    for c, a0, a1 in zip(ch, st, en):
        if c.isspace():
            if cur: words.append([cur, t0, pe]); cur = ''
            continue
        if not cur: t0 = a0
        cur += c; pe = a1
    if cur: words.append([cur, t0, pe])
    total = en[-1] + .05
    for s0, s1, at in segs:
        s1 = total if s1 is None else s1
        out['segments'].append({'line': k, 'from': s0, 'to': round(s1, 3), 'at': at})
        for w, a0, a1 in words:
            if s0 <= a0 < s1: out['words'].append({'line': k, 'w': w, 't': round(at + a0 - s0, 3), 'e': round(at + a1 - s0, 3)})
json.dump(out, open('cues.json', 'w'), ensure_ascii=False, indent=1)
print(' '.join(f"{w['t']:.2f}:{w['w']}" for w in out['words']))
