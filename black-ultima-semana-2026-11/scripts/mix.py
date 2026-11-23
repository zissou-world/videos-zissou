"""Mixa locução (segmentos do cues.json), trilha e efeitos; normaliza para -14 LUFS. Uso: python3 scripts/mix.py [ganho_musica_dB]"""
import json, subprocess, sys
MUS_DB = float(sys.argv[1]) if len(sys.argv) > 1 else -9
cues = json.load(open('cues.json'))
import unicodedata, re
def norm(w): return re.sub('[^a-z0-9]', '', unicodedata.normalize('NFD', w.lower()).encode('ascii', 'ignore').decode())
def Wd(si, w, n=1):
    k = 0
    for x in cues['words']:
        if x['scene'] == si and norm(x['w']) == norm(w):
            k += 1
            if k == n: return x['t']
    raise SystemExit(f'palavra {w} na cena {si}')
SC = cues['scenes']; TR = [(SC[i]['voEnd'] + SC[i + 1]['voStart']) / 2 for i in range(len(SC) - 1)]
SFX = [('reveal', .3, -20)] + [('whoosh', t - .55, -17) for t in TR]
POPS = [(0, 'time', 'pop'), (0, 'ultima', 'snap'), (0, 'black', 'pop'),
        (1, 'excelente', 'pop'), (1, 'tres', 'tick'), (1, 'trinta', 'pop'),
        (2, 'seis', 'snap'), (2, 'quatro', 'tick'), (2, 'temos', 'tick'), (2, 'faltam', 'pop'),
        (3, 'oito', 'tick'), (3, 'black', 'pop'), (3, 'milhao', 'snap'), (3, 'trezentos', 'pop'), (3, 'esforco', 'snap'),
        (4, 'sonho', 'pop'),
        (5, 'cliente', 'click'), (5, 'conversa', 'click'), (5, 'orcamento', 'click'), (5, 'grande', 'pop'),
        (5, 'presentes', 'tick'), (5, 'ouvir', 'tick'), (5, 'caprichar', 'tick'), (5, 'oportunidade', 'tick'),
        (6, 'chama', 'pop'), (7, 'voces', 'pop')]
SFX += [(k, Wd(si, w) - .05, -21 if k in ('tick', 'type') else (-16 if k == 'click' else -18)) for si, w, k in POPS]
SFX += [('swell', Wd(8, 'maior') - 1.2, -16), ('reveal', Wd(8, 'historia') - .05, -17)]
DUR = cues['duration']
inp, fc, mixv = ['-i', 'audio/music_a.mp3'], [], []
idx = 1
for i, s in enumerate(cues['segments']):
    inp += ['-i', f"audio/vo/{s['line']}.mp3"]
    d = s['to'] - s['from']
    fc.append(f"[{idx}:a]atrim={s['from']}:{s['to']},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st={max(0, d - .02):.3f}:d=0.02,"
              f"aresample=44100,aformat=channel_layouts=stereo,adelay={int(s['at'] * 1000)}|{int(s['at'] * 1000)}[v{i}]")
    mixv.append(f'[v{i}]'); idx += 1
fc.append(''.join(mixv) + f"amix=inputs={len(mixv)}:normalize=0,highpass=f=75,equalizer=f=3200:t=q:w=1.2:g=2,"
          "acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3dB,asplit=2[vo][vsc]")
sx = []
for j, (k, t, g) in enumerate(SFX):
    inp += ['-i', f'audio/sfx/{k}.mp3']
    fc.append(f"[{idx}:a]aresample=44100,aformat=channel_layouts=stereo,volume={g}dB,adelay={int(t * 1000)}|{int(t * 1000)}[s{j}]")
    sx.append(f'[s{j}]'); idx += 1
MDUR = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'audio/music_a.mp3'], capture_output=True, text=True).stdout)
TEMPO = max(.9, min(1.0, MDUR / (DUR - .3)))
fc.append(f"[0:a]aresample=44100,aformat=channel_layouts=stereo,atempo={TEMPO:.4f},volume={MUS_DB}dB[mus0]")
fc.append("[mus0][vsc]sidechaincompress=threshold=0.04:ratio=4:attack=30:release=400[mus]")
fc.append('[mus][vo]' + ''.join(sx) + f"amix=inputs={2 + len(sx)}:normalize=0:duration=first,apad,atrim=0:{DUR},afade=t=out:st={DUR - .5}:d=0.5[out]")
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *inp, '-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', 'audio/mix_raw.wav'], check=True)
# loudnorm 2 passes
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', 'audio/mix_raw.wav', '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
af = (f"loudnorm=I=-14:TP=-1.0:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
      f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'audio/mix_raw.wav', '-af', af, '-ar', '48000', 'audio/mix.wav'], check=True)
print('mix ok')
