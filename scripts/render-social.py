"""Rasterize the code-native sharing illustration. Requires Pillow; no browser."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

data = json.load(sys.stdin)
palette = data['palette']
scale = 2
image = Image.new('RGB', (1280 * scale, 720 * scale), palette['paper'])
draw = ImageDraw.Draw(image, 'RGBA')
def rgb(hex_color, alpha=255):
    return tuple(int(hex_color[i:i + 2], 16) for i in (1, 3, 5)) + (alpha,)
for primitive in data['primitives']:
    points = [(x * scale, y * scale) for x, y in primitive['points']]
    color = rgb(primitive['color'], round(primitive['alpha'] * 255))
    if primitive['polygon']:
        draw.polygon(points, fill=color)
    else:
        draw.line(points, fill=color, width=scale)
# Opaque paper keeps the typographic half quiet.
draw.rectangle((0, 0, 478 * scale, 720 * scale), fill=palette['paper'])
draw.rectangle((18 * scale, 18 * scale, 1262 * scale, 702 * scale), outline=palette['line'], width=scale)
def font(size, serif=False, mono=False):
    names = ['georgia.ttf', 'DejaVuSerif.ttf'] if serif else ['consola.ttf', 'DejaVuSansMono.ttf'] if mono else ['arial.ttf', 'DejaVuSans.ttf']
    for name in names:
        for path in [Path('C:/Windows/Fonts') / name, Path('/usr/share/fonts/truetype/dejavu') / name, Path(name)]:
            try:
                return ImageFont.truetype(str(path), size * scale)
            except OSError:
                pass
    raise RuntimeError('A compatible serif/sans font is required for the sharing card')
def text(x, y, content, size, color='ink', serif=False, mono=False):
    draw.text((x * scale, y * scale), content, fill=palette[color], font=font(size, serif, mono))
text(64, 62, 'EH—001 / STRUCTURES & SYSTEMS', 11, 'muted', mono=True)
text(60, 206, 'Eric Hsu', 78, serif=True)
text(64, 328, 'Electrical engineering', 23, serif=True)
text(64, 363, 'at McGill University.', 23, serif=True)
text(64, 428, 'Circuits, code, and the systems', 15, 'muted')
text(64, 455, 'they make together.', 15, 'muted')
text(64, 610, 'PROJECTS · EXPERIENCE · PORTFOLIO', 10, 'muted', mono=True)
text(64, 634, 'bshwao.github.io', 11, 'muted', mono=True)
for index, name in enumerate(['teal', 'blue', 'coral', 'mustard', 'rose']):
    x = (64 + index * 18) * scale
    draw.rectangle((x, 550 * scale, x + 8 * scale, 558 * scale), fill=palette[name])
image = image.resize((1280, 720), Image.Resampling.LANCZOS)
target = Path(__file__).resolve().parent.parent / 'assets' / 'social-preview.png'
image.save(target, optimize=True)
print(f'Generated {target.name} ({target.stat().st_size} bytes)')
