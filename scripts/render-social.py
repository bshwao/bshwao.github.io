"""Validate/export a browser capture of social-preview.html as the sharing PNG."""
from pathlib import Path
import argparse
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('capture', type=Path, help='1280 x 720 viewport capture of social-preview.html')
args = parser.parse_args()
with Image.open(args.capture) as source:
    if source.size != (1280, 720):
        raise SystemExit(f'Expected 1280 x 720; received {source.size}')
    target = Path(__file__).resolve().parent.parent / 'assets' / 'social-preview.png'
    source.convert('RGB').quantize(colors=256).save(target, optimize=True)
print(f'Exported {target.name} ({target.stat().st_size} bytes)')
