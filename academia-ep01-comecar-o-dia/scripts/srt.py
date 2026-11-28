"""Legendas .srt a partir de cues.json (texto com a grafia real). Uso: python3 scripts/srt.py"""
import json, re
d = json.load(open('cues.json'))
FIX = {'Ziçu': 'Zissou', 'Uórld': 'World'}
def fmt(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'
cards, cur = [], []
for i, w in enumerate(d['words']):
    w = dict(w); w['w'] = FIX.get(w['w'].strip(',.!?'), None) and w['w'].replace(w['w'].strip(',.!?'), FIX[w['w'].strip(',.!?')]) or w['w']
    if cur and len(' '.join(x['w'] for x in cur + [w])) > 74:
        j = max([k for k, x in enumerate(cur[:-1]) if x['w'][-1] in ',:;'] or [len(cur) - 1])
        cards.append(cur[:j + 1]); cur = cur[j + 1:]
    cur.append(w)
    nxt = d['words'][i + 1] if i + 1 < len(d['words']) else None
    txt = ' '.join(x['w'] for x in cur)
    end_sent = re.search(r'[.!?]$', w['w']); comma = w['w'].endswith(',') or w['w'].endswith(':') or w['w'].endswith(';')
    if (nxt is None or nxt['line'] != w['line'] or end_sent or (comma and len(txt) > 38) 
            or (nxt and nxt['t'] - w['e'] > .6)):
        cards.append(cur); cur = []
def lines(t):
    if len(t) <= 42: return t
    best = min(range(len(t)), key=lambda i: abs(i - len(t) / 2) if t[i] == ' ' else 999)
    return t[:best] + '\n' + t[best + 1:]
out = []
for n, c in enumerate(cards, 1):
    a, b = c[0]['t'], c[-1]['e'] + .25
    b = max(b, a + .9)
    if n < len(cards): b = min(b, cards[n][0]['t'] - .05)
    out.append(f"{n}\n{fmt(a)} --> {fmt(b)}\n{lines(' '.join(x['w'] for x in c))}\n")
open('ep01-comecar-o-dia.srt', 'w').write('\n'.join(out))
print(len(cards), 'legendas')
