"""Faixa só de voz (sem trilha) para a HeyGen fazer a sincronia labial. Uso: python3 scripts/vo_track.py"""
import json, subprocess
cues = json.load(open('cues.json'))
inp, fc, mx = [], [], []
for i, s in enumerate(cues['segments']):
    inp += ['-i', f"audio/vo/{s['line']}.mp3"]
    fc.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=mono,adelay={int(s['at'] * 1000)}[v{i}]"); mx.append(f'[v{i}]')
fc.append(''.join(mx) + f"amix=inputs={len(mx)}:normalize=0,apad,atrim=0:{cues['duration']},loudnorm=I=-16:TP=-1.5[o]")
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *inp, '-filter_complex', ';'.join(fc), '-map', '[o]', '-ar', '44100', 'audio/vo_track.wav'], check=True)
print('ok audio/vo_track.wav', cues['duration'])
