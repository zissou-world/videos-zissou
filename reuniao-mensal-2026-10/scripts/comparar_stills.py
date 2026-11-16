import subprocess, sys, os, glob
from io import BytesIO
from PIL import Image, ImageDraw
O, SD, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
rows=[]
for f in sorted(glob.glob(os.path.join(SD,'s_*.png'))):
    t=float(os.path.basename(f)[2:-4])
    p=subprocess.run(['ffmpeg','-loglevel','error','-ss',str(t),'-i',O,'-frames:v','1','-vf','scale=640:360','-f','image2pipe','-c:v','png','-'],capture_output=True)
    a=Image.open(BytesIO(p.stdout)).convert('RGB'); b=Image.open(f).convert('RGB').resize((640,360),Image.LANCZOS)
    r=Image.new('RGB',(1284,360),(255,0,0)); r.paste(a,(0,0)); r.paste(b,(644,0)); ImageDraw.Draw(r).text((12,8),f'{t:.1f}s',fill=(230,0,0)); rows.append(r)
for i in range(0,len(rows),4):
    g=rows[i:i+4]; s=Image.new('RGB',(1284,364*len(g)))
    for j,r in enumerate(g): s.paste(r,(0,j*364))
    s.save(os.path.join(OUT,f'sheet_{i//4+1:02d}.jpg'),quality=88)
