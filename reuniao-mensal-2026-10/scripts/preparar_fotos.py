"""Recorta as fotos de fotos-originais/ para assets/ (mesmos parâmetros usados no vídeo).
Uso: python3 scripts/preparar_fotos.py   (rodar dentro de reuniao-mensal-2026-10)
Para uma pessoa nova: adicione a foto em fotos-originais/ e uma linha em REDONDAS
(x, y, lado do quadrado em pixels da foto original, rosto centralizado)."""
from PIL import Image, ImageEnhance

# recorte quadrado -> assets/foto_<nome>.jpg (600x600), usado nos círculos
REDONDAS = {
    'lucas': (70, 200, 1150), 'margarida': (330, 340, 920), 'cecilia': (210, 130, 860),
    'alex': (180, 140, 760), 'bernardo': (280, 90, 820), 'camila': (370, 150, 820),
    'daiani': (210, 130, 820), 'yasmin': (290, 420, 760), 'silvia': (50, 0, 1206),
    'tatiane': (330, 300, 840),
}
# recorte largo 3:2 -> assets/foto_<nome>_w.jpg (900x600), usado nos cards do pódio
LARGAS = {'lucas': (100, 260, 1500), 'margarida': (60, 330, 1320), 'daiani': (0, 90, 1199)}

def tratar(im):
    im = ImageEnhance.Contrast(im).enhance(1.03)
    return ImageEnhance.Color(im).enhance(0.95)

for n, (x, y, s) in REDONDAS.items():
    im = Image.open(f'fotos-originais/{n}.jpg').convert('RGB').crop((x, y, x + s, y + s))
    tratar(im.resize((600, 600), Image.LANCZOS)).save(f'assets/foto_{n}.jpg', quality=93)
for n, (x, y, w) in LARGAS.items():
    h = int(w / 1.5)
    im = Image.open(f'fotos-originais/{n}.jpg').convert('RGB').crop((x, y, x + w, y + h))
    tratar(im.resize((900, 600), Image.LANCZOS)).save(f'assets/foto_{n}_w.jpg', quality=93)
print('ok')
