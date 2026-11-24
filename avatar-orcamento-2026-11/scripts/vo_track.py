"""Faixa só de voz para a HeyGen, começando em OFF s da linha do tempo (a abertura com o ícone vem antes). Uso: python3 scripts/vo_track.py"""
import json, subprocess
cues = json.load(open('cues.json'))
OFF = cues['scenes'][0]['voStart'] - .5
END = cues['scenes'][-1]['voEnd'] + .6
inp, fc, mx = [], [], []
for i, s in enumerate(cues['segments']):
    inp += ['-i', f"audio/vo/{s['line']}.mp3"]
    fc.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=mono,adelay={int((s['at'] - OFF) * 1000)}[v{i}]"); mx.append(f'[v{i}]')
fc.append(''.join(mx) + f"amix=inputs={len(mx)}:normalize=0,apad,atrim=0:{END - OFF:.3f},loudnorm=I=-16:TP=-1.5[o]")
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *inp, '-filter_complex', ';'.join(fc), '-map', '[o]', '-ar', '44100', 'audio/vo_track.wav'], check=True)
json.dump({'offset': OFF}, open('audio/vo_offset.json', 'w')); print('ok audio/vo_track.wav', OFF, END - OFF)
