"""Regenerates every icon/splash from one design. Run: python3 scripts/make-icons.py  (needs Pillow)"""
from PIL import Image, ImageDraw, ImageFont
import os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND, GOLD, DARK = (15, 92, 58), (242, 183, 5), (14, 22, 18)
cands = glob.glob('/usr/share/fonts/**/DejaVuSans-Bold.ttf', recursive=True) + \
        glob.glob('/usr/share/fonts/**/LiberationSans-Bold.ttf', recursive=True)
FONT = cands[0] if cands else None


def mark(size, bg, scale=0.5):
    img = Image.new('RGBA', (size, size), bg)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT, int(size * scale)) if FONT else ImageFont.load_default()
    d.text((size / 2, size / 2), 'SF', font=f, fill=GOLD, anchor='mm')
    w, h = size * 0.34 * (scale / 0.5), size * 0.028 * (scale / 0.5)
    y = size * 0.5 + size * scale * 0.42
    d.rounded_rectangle((size / 2 - w / 2, y, size / 2 + w / 2, y + h), radius=h / 2, fill=GOLD)
    return img


def save(img, *p):
    path = os.path.join(ROOT, *p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


full = mark(1024, BRAND + (255,))
save(full, 'assets', 'icon-only.png')
save(mark(1024, (0, 0, 0, 0), 0.38), 'assets', 'icon-foreground.png')  # adaptive icon: stays inside safe zone
save(Image.new('RGBA', (1024, 1024), BRAND + (255,)), 'assets', 'icon-background.png')
for name, bg in (('splash.png', BRAND), ('splash-dark.png', DARK)):
    s = Image.new('RGBA', (2732, 2732), bg + (255,))
    s.alpha_composite(mark(900, (0, 0, 0, 0), 0.5), (916, 916))
    save(s.convert('RGB'), 'assets', name)
for n in (192, 512):
    save(full.resize((n, n), Image.LANCZOS), 'pwa', f'icon-{n}.png')
save(full.resize((180, 180), Image.LANCZOS), 'pwa', 'apple-touch-icon.png')
save(full.resize((256, 256), Image.LANCZOS), 'build', 'icon.png')
full.save(os.path.join(ROOT, 'build', 'icon.ico'),
          sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('icons written')
