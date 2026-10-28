"""Combine two unaltered browser screenshots for the mobile review."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
image = Image.new("RGB", (804, 896), "#f4f1e8")
draw = ImageDraw.Draw(image)
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 19)
for x, filename, label in [(8, "portrait-split.png", "Split · explore and read"), (406, "portrait-read.png", "Read · room details")]:
    draw.text((x + 3, 13), label, font=font, fill="#23372e")
    with Image.open(root / filename) as capture:
        image.paste(capture.convert("RGB"), (x, 44))
image.save(root / "mobile-preview.jpg", quality=92)
