"""Mixa locução (segmentos do cues.json), trilha e efeitos; normaliza para -14 LUFS. Uso: python3 scripts/mix.py [ganho_musica_dB]"""
import json, subprocess, sys
MUS_DB = float(sys.argv[1]) if len(sys.argv) > 1 else -9
cues = json.load(open('cues.json'))
SFX = [('reveal', .15, -16), ('whoosh', 2.85, -14), ('whoosh', 7.8, -13), ('swell', 12.9, -15), ('whoosh', 13.75, -12),
       ('whoosh', 18.85, -13), ('snap', 19.45, -10), ('snap', 20.85, -10), ('snap', 22.35, -10), ('swell', 24.3, -14), ('reveal', 28.1, -18)]
inp, fc, mixv = ['-i', 'audio/m_a.wav'], [], []
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
fc.append(f"[0:a]aresample=44100,aformat=channel_layouts=stereo,volume={MUS_DB}dB[mus0]")
fc.append("[mus0][vsc]sidechaincompress=threshold=0.04:ratio=4:attack=30:release=400[mus]")
fc.append('[vo][mus]' + ''.join(sx) + f"amix=inputs={2 + len(sx)}:normalize=0,atrim=0:30,afade=t=out:st=29.6:d=0.4[out]")
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *inp, '-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', 'audio/mix_raw.wav'], check=True)
# loudnorm 2 passes
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', 'audio/mix_raw.wav', '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
af = (f"loudnorm=I=-14:TP=-1.0:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
      f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'audio/mix_raw.wav', '-af', af, '-ar', '48000', 'audio/mix.wav'], check=True)
print('mix ok')
